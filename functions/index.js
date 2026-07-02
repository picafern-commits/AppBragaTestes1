"use strict";

const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const webpush = require("web-push");

admin.initializeApp();

const db = admin.firestore();
const DEVICE_COLLECTION = "notificationDevices";
const INBOX_COLLECTION = "notificationInbox";
const HISTORY_COLLECTION = "notificationHistory";
const REGION = "europe-west1";
const APP_URL = "https://toner-manager-756c4.web.app/html/";
const PUBLIC_HTTP_OPTIONS = {
  region: REGION,
  cors: true,
  invoker: "public",
  minInstances: 1,
  maxInstances: 3,
  concurrency: 10,
  timeoutSeconds: 60,
  memory: "256MiB"
};
const BACKGROUND_OPTIONS = { region: REGION, timeoutSeconds: 60, memory: "256MiB", maxInstances: 3 };

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function envValue(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return String(value).trim();
  }
  return "";
}

function getVapid() {
  const publicKey = envValue("APP_BRAGA_VAPID_PUBLIC_KEY", "WEB_PUSH_PUBLIC_KEY", "VAPID_PUBLIC_KEY");
  const privateKey = envValue("APP_BRAGA_VAPID_PRIVATE_KEY", "WEB_PUSH_PRIVATE_KEY", "VAPID_PRIVATE_KEY");
  const subject = envValue("APP_BRAGA_VAPID_SUBJECT", "WEB_PUSH_SUBJECT", "VAPID_SUBJECT") || "mailto:admin@appbraga.pt";
  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }
  return { publicKey, privateKey, subject, ready: !!(publicKey && privateKey) };
}

function cleanText(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function deviceLabel(device = {}, id = "") {
  return cleanText(device.deviceName || device.name || device.label, id || "dispositivo");
}

function hasWebPush(device = {}) {
  const sub = device.webPush || device.standardWebPush || device.pushSubscription || {};
  return !!(sub.endpoint && sub.keys && sub.keys.p256dh && sub.keys.auth);
}

function webPushSubscription(device = {}) {
  return device.webPush || device.standardWebPush || device.pushSubscription || null;
}

async function writeInbox(deviceId, payload, requestId) {
  await db.collection(INBOX_COLLECTION).add({
    deviceId,
    requestId,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function sendFcm(device, payload) {
  const token = String(device.fcmToken || device.firebaseToken || "").trim();
  if (!token) return { skipped: true };
  await admin.messaging().send({
    token,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: {
      url: payload.url,
      tag: payload.tag,
      requestId: payload.requestId
    },
    webpush: {
      fcmOptions: { link: payload.url },
      notification: {
        title: payload.title,
        body: payload.body,
        tag: payload.tag,
        requireInteraction: false,
        icon: "/icon-192.png",
        badge: "/icon-192.png"
      }
    }
  });
  return { sent: true };
}

async function sendStandardWebPush(device, payload) {
  const subscription = webPushSubscription(device);
  if (!subscription) return { skipped: true };
  await webpush.sendNotification(subscription, JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag,
    url: payload.url,
    data: {
      url: payload.url,
      tag: payload.tag,
      requestId: payload.requestId
    }
  }));
  return { sent: true };
}

function safeStateId(value = "") {
  return Buffer.from(String(value || "notification")).toString("base64url").slice(0, 180);
}

function stableNotificationTag(payload = {}) {
  const rawEvent = cleanText(payload.event, "");
  const rawTag = cleanText(payload.tag || payload.requestId, "");
  let tag = rawTag
    .replace(/-\d{10,}$/, "")
    .replace(/-\d{4}-\d{2}-\d{2}t.*$/i, "");

  // Só forçar anti-duplicado nos avisos automáticos/sistema.
  // Testes manuais continuam livres.
  const event = rawEvent || (tag.startsWith("toner-") || tag.startsWith("stock-") || tag.startsWith("printer-") ? "system-notification" : "");
  if (!event.startsWith("system-")) return "";

  if (!tag) {
    tag = `${cleanText(payload.title, "App Braga")}::${cleanText(payload.body, "")}`;
  }
  return `${event}::${tag}`;
}

async function reserveAutomaticNotificationOnce(payload = {}) {
  const stableKey = stableNotificationTag(payload);
  if (!stableKey) return true;
  const ref = db.collection("notificationEventLocks").doc(safeStateId(stableKey));
  let reserved = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      reserved = false;
      return;
    }
    tx.set(ref, {
      stableKey,
      event: cleanText(payload.event, "system-notification"),
      tag: cleanText(payload.tag || payload.requestId, "system-notification"),
      requestId: cleanText(payload.requestId, "system-notification"),
      title: cleanText(payload.title, "App Braga"),
      body: cleanText(payload.body, "Novo aviso da App Braga."),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    reserved = true;
  });
  return reserved;
}

async function reserveSystemNotificationOnce(payload = {}) {
  return reserveAutomaticNotificationOnce(payload);
}

async function sendNotificationToDevices(payloadInput = {}, options = {}) {
  const startedAt = Date.now();
  const requestId = cleanText(payloadInput.requestId, `system-${startedAt}`);
  const senderDeviceId = cleanText(options.senderDeviceId, "");
  const targetDeviceId = cleanText(options.targetDeviceId, "");
  const payload = {
    requestId,
    title: cleanText(payloadInput.title, "App Braga"),
    body: cleanText(payloadInput.body, "Novo aviso da App Braga."),
    event: cleanText(payloadInput.event, "system-notification"),
    url: cleanText(payloadInput.url, `${APP_URL}index.html`),
    tag: cleanText(payloadInput.tag, requestId)
  };

  const result = {
    ok: false,
    requestId,
    totalDevices: 0,
    ignored: 0,
    inboxWritten: 0,
    fcmTargets: 0,
    fcmSent: 0,
    fcmFailed: 0,
    webPushTargets: 0,
    webPushSent: 0,
    webPushFailed: 0,
    failed: 0,
    sent: 0,
    errors: []
  };

  if (options.system === true && options.skipDedup !== true) {
    const reserved = await reserveSystemNotificationOnce(payload);
    if (!reserved) {
      result.ok = true;
      result.skippedDuplicate = true;
      await db.collection(HISTORY_COLLECTION).add({
        ...result,
        title: payload.title,
        body: payload.body,
        event: payload.event,
        senderDeviceId,
        targetDeviceId,
        system: true,
        duplicateOfTag: payload.tag,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        durationMs: Date.now() - startedAt
      }).catch(() => null);
      return result;
    }
  }

  const vapid = getVapid();
  const snap = await db.collection(DEVICE_COLLECTION).where("enabled", "==", true).get();
  result.totalDevices = snap.size;

  for (const doc of snap.docs) {
    const device = { id: doc.id, ...doc.data() };
    const deviceId = String(device.deviceId || doc.id);
    if (targetDeviceId && deviceId !== targetDeviceId && doc.id !== targetDeviceId) {
      result.ignored += 1;
      continue;
    }
    if (senderDeviceId && deviceId === senderDeviceId) {
      result.ignored += 1;
      continue;
    }

    let delivered = false;
    const token = String(device.fcmToken || device.firebaseToken || "").trim();
    const usesDesktopInbox = device.desktopInbox === true || device.electron === true;

    if (usesDesktopInbox) {
      try {
        await writeInbox(deviceId, payload, requestId);
        result.inboxWritten += 1;
        delivered = true;
      } catch (error) {
        result.errors.push({ deviceId, device: deviceLabel(device, deviceId), channel: "inbox", error: error.message });
      }
    }

    if (!delivered && hasWebPush(device)) {
      result.webPushTargets += 1;
      if (!vapid.ready) {
        result.webPushFailed += 1;
        result.errors.push({ deviceId, device: deviceLabel(device, deviceId), channel: "webpush", error: "VAPID privada nao configurada nas Functions" });
      } else try {
        await sendStandardWebPush(device, payload);
        result.webPushSent += 1;
        delivered = true;
      } catch (error) {
        result.webPushFailed += 1;
        result.errors.push({ deviceId, device: deviceLabel(device, deviceId), channel: "webpush", error: error.message });
        if (error.statusCode === 404 || error.statusCode === 410) {
          await doc.ref.set({
            enabled: false,
            disabledAt: admin.firestore.FieldValue.serverTimestamp(),
            disabledReason: `webpush-${error.statusCode}`
          }, { merge: true }).catch(() => null);
        }
      }
    }

    if (!delivered && token) {
      result.fcmTargets += 1;
      try {
        await sendFcm(device, payload);
        result.fcmSent += 1;
        delivered = true;
      } catch (error) {
        result.fcmFailed += 1;
        result.errors.push({ deviceId, device: deviceLabel(device, deviceId), channel: "fcm", error: error.message });
        if (error.code === "messaging/registration-token-not-registered" || error.code === "messaging/invalid-registration-token") {
          await doc.ref.set({
            fcmToken: "",
            fcmDisabledAt: admin.firestore.FieldValue.serverTimestamp(),
            fcmDisabledReason: error.code
          }, { merge: true }).catch(() => null);
        }
      }
    }

    if (!delivered) result.failed += 1;
    else result.sent += 1;
  }

  result.ok = result.sent > 0 || result.inboxWritten > 0;
  await db.collection(HISTORY_COLLECTION).add({
    ...result,
    title: payload.title,
    body: payload.body,
    event: payload.event,
    senderDeviceId,
    targetDeviceId,
    system: options.system === true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    durationMs: Date.now() - startedAt
  });
  return result;
}

exports.notificationHealth = onRequest(PUBLIC_HTTP_OPTIONS, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const publicKey = envValue("APP_BRAGA_VAPID_PUBLIC_KEY", "WEB_PUSH_PUBLIC_KEY", "VAPID_PUBLIC_KEY");
    const privateKey = envValue("APP_BRAGA_VAPID_PRIVATE_KEY", "WEB_PUSH_PRIVATE_KEY", "VAPID_PRIVATE_KEY");
    const subject = envValue("APP_BRAGA_VAPID_SUBJECT", "WEB_PUSH_SUBJECT", "VAPID_SUBJECT") || "mailto:admin@appbraga.pt";
    const snap = await db.collection(DEVICE_COLLECTION).where("enabled", "==", true).limit(50).get();
    return res.json({
      ok: true,
      collection: DEVICE_COLLECTION,
      activeDevices: snap.size,
      vapidPublicReady: !!publicKey,
      vapidPrivateReady: !!privateKey,
      subject
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

async function handleNotificationBroadcast(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Usa POST." });

  const startedAt = Date.now();
  const body = req.body || {};
  const requestId = cleanText(body.requestId, `notif-${startedAt}`);
  const senderDeviceId = cleanText(body.senderDeviceId, "");
  const targetDeviceId = cleanText(body.targetDeviceId, "");
  const payload = {
    requestId,
    title: cleanText(body.title, "App Braga"),
    body: cleanText(body.body, "Alerta App Braga"),
    event: cleanText(body.event, ""),
    url: cleanText(body.url, "https://picafern-commits.github.io/App-Tablet/html/index.html"),
    tag: cleanText(body.tag, requestId)
  };

  const result = {
    ok: false,
    requestId,
    totalDevices: 0,
    ignored: 0,
    inboxWritten: 0,
    fcmTargets: 0,
    fcmSent: 0,
    fcmFailed: 0,
    webPushTargets: 0,
    webPushSent: 0,
    webPushFailed: 0,
    failed: 0,
    sent: 0,
    errors: []
  };

  try {
    const reserved = await reserveAutomaticNotificationOnce(payload);
    if (!reserved) {
      result.ok = true;
      result.skippedDuplicate = true;
      await db.collection(HISTORY_COLLECTION).add({
        ...result,
        title: payload.title,
        body: payload.body,
        event: payload.event,
        senderDeviceId,
        targetDeviceId,
        duplicateOfTag: payload.tag,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        durationMs: Date.now() - startedAt
      }).catch(() => null);
      return res.json(result);
    }

    const vapid = getVapid();
    const snap = await db.collection(DEVICE_COLLECTION).where("enabled", "==", true).get();
    result.totalDevices = snap.size;

    for (const doc of snap.docs) {
      const device = { id: doc.id, ...doc.data() };
      const deviceId = String(device.deviceId || doc.id);
      if (targetDeviceId && deviceId !== targetDeviceId && doc.id !== targetDeviceId) {
        result.ignored += 1;
        continue;
      }
      if (senderDeviceId && deviceId === senderDeviceId) {
        result.ignored += 1;
        continue;
      }

      let delivered = false;
      const token = String(device.fcmToken || device.firebaseToken || "").trim();
      const usesDesktopInbox = device.desktopInbox === true || device.electron === true;

      if (usesDesktopInbox) {
        try {
          await writeInbox(deviceId, payload, requestId);
          result.inboxWritten += 1;
          delivered = true;
        } catch (error) {
          result.errors.push({ deviceId, device: deviceLabel(device, deviceId), channel: "inbox", error: error.message });
        }
      }

      if (!delivered && hasWebPush(device)) {
        result.webPushTargets += 1;
        if (!vapid.ready) {
          result.webPushFailed += 1;
          result.errors.push({ deviceId, device: deviceLabel(device, deviceId), channel: "webpush", error: "VAPID privada nao configurada nas Functions" });
        } else try {
          await sendStandardWebPush(device, payload);
          result.webPushSent += 1;
          delivered = true;
        } catch (error) {
          result.webPushFailed += 1;
          result.errors.push({ deviceId, device: deviceLabel(device, deviceId), channel: "webpush", error: error.message });
          if (error.statusCode === 404 || error.statusCode === 410) {
            await doc.ref.set({
              enabled: false,
              disabledAt: admin.firestore.FieldValue.serverTimestamp(),
              disabledReason: `webpush-${error.statusCode}`
            }, { merge: true }).catch(() => null);
          }
        }
      }

      if (!delivered && token) {
        result.fcmTargets += 1;
        try {
          await sendFcm(device, payload);
          result.fcmSent += 1;
          delivered = true;
        } catch (error) {
          result.fcmFailed += 1;
          result.errors.push({ deviceId, device: deviceLabel(device, deviceId), channel: "fcm", error: error.message });
          if (error.code === "messaging/registration-token-not-registered" || error.code === "messaging/invalid-registration-token") {
            await doc.ref.set({
              fcmToken: "",
              fcmDisabledAt: admin.firestore.FieldValue.serverTimestamp(),
              fcmDisabledReason: error.code
            }, { merge: true }).catch(() => null);
          }
        }
      }

      if (!delivered) result.failed += 1;
      else result.sent += 1;
    }

    result.ok = result.sent > 0 || result.inboxWritten > 0;
    await db.collection(HISTORY_COLLECTION).add({
      ...result,
      title: payload.title,
      body: payload.body,
      event: payload.event,
      senderDeviceId,
      targetDeviceId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      durationMs: Date.now() - startedAt
    });
    logger.info("sendNotificationBroadcast", result);
    return res.json(result);
  } catch (error) {
    result.error = error.message;
    result.failed = Math.max(result.failed, result.totalDevices - result.ignored - result.sent);
    await db.collection(HISTORY_COLLECTION).add({
      ...result,
      title: payload.title,
      body: payload.body,
      event: payload.event,
      senderDeviceId,
      targetDeviceId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      durationMs: Date.now() - startedAt
    }).catch(() => null);
    logger.error("sendNotificationBroadcast failed", error);
    return res.status(500).json(result);
  }
}

exports.sendNotificationBroadcast = onRequest(PUBLIC_HTTP_OPTIONS, handleNotificationBroadcast);
exports.sendPushAlert = onRequest(PUBLIC_HTTP_OPTIONS, handleNotificationBroadcast);

function percentValue(value) {
  let number = Number(value);
  if (!Number.isFinite(number) && typeof value === "string") {
    const match = value.replace(",", ".").match(/\d{1,3}(?:\.\d+)?/);
    number = match ? Number(match[0]) : NaN;
  }
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function colorLabel(key = "") {
  const labels = {
    black: "Preto",
    cyan: "Cyan",
    magenta: "Magenta",
    yellow: "Amarelo",
    waste: "Residuo"
  };
  return labels[String(key || "").toLowerCase()] || String(key || "Toner");
}

function printerTonerLevels(data = {}) {
  const levels = new Map();
  const add = (key, value, label) => {
    const percent = percentValue(value);
    const cleanKey = String(key || label || "black").toLowerCase();
    if (percent === null || !cleanKey) return;
    levels.set(cleanKey, { key: cleanKey, label: cleanText(label, colorLabel(cleanKey)), percent });
  };

  if (data.toner && typeof data.toner === "object") {
    Object.entries(data.toner).forEach(([key, value]) => add(key, value));
  }

  if (Array.isArray(data.colors)) {
    data.colors.forEach((item = {}) => add(item.key || item.color || item.label, item.percent ?? item.value ?? item.nivel, item.label));
  }

  ["black", "cyan", "magenta", "yellow"].forEach((key) => {
    add(key, data[key] ?? data[`${key}_percent`] ?? data[`${key}Percent`]);
  });

  if (percentValue(data.percent ?? data.toner_percent ?? data.tonerPercent ?? data.percentage) !== null && !levels.has("black")) {
    add("black", data.percent ?? data.toner_percent ?? data.tonerPercent ?? data.percentage, "Preto");
  }

  return Array.from(levels.values());
}

function printerName(data = {}, fallback = "") {
  return cleanText(
    [data.modelo || data.model || data.name || data.nome, data.localizacao || data.location || data.serie || fallback]
      .filter(Boolean)
      .join(" - "),
    fallback || "Impressora"
  );
}

function changedTonerEvents(beforeData = {}, afterData = {}, printerId = "") {
  const beforeLevels = new Map(printerTonerLevels(beforeData).map((item) => [item.key, item]));
  const afterLevels = printerTonerLevels(afterData);
  const events = [];
  const label = printerName(afterData, printerId);

  afterLevels.forEach((after) => {
    const before = beforeLevels.get(after.key);
    const beforePercent = before ? before.percent : null;
    const afterPercent = after.percent;

    // 0% = aviso crítico/importante. Só avisa na transição, não em leituras repetidas a 0%.
    if (afterPercent === 0 && beforePercent !== 0) {
      events.push({
        event: "system-toner-zero",
        title: "🚨 IMPORTANTE: Toner a 0%",
        body: `${label}: ${after.label} chegou a 0%. Trocar toner assim que possível.`,
        tag: `toner-zero-${printerId}-${after.key}-${afterPercent}`,
        url: `${APP_URL}impressoras.html`
      });
      return;
    }

    // 10% = aviso importante, diferente do aviso de 25%.
    if (afterPercent === 10 && beforePercent !== 10) {
      events.push({
        event: "system-toner-10",
        title: "🔶 Toner a 10%",
        body: `${label}: ${after.label} está com apenas 10%.`,
        tag: `toner-10-${printerId}-${after.key}-${afterPercent}`,
        url: `${APP_URL}impressoras.html`
      });
      return;
    }

    // 25% = só exatamente 25%, para não confundir 6%, 7%, etc.
    if (afterPercent === 25 && beforePercent !== 25) {
      events.push({
        event: "system-toner-25",
        title: "⚠️ Toner a 25%",
        body: `${label}: ${after.label} chegou a 25%.`,
        tag: `toner-25-${printerId}-${after.key}-${afterPercent}`,
        url: `${APP_URL}impressoras.html`
      });
      return;
    }

    // Reposição = só quando vinha de 0% e volta para 99% ou 100%.
    if (beforePercent === 0 && (afterPercent === 99 || afterPercent === 100)) {
      events.push({
        event: "system-toner-replaced",
        title: "✅ Toner reposto",
        body: `${label}: ${after.label} passou de ${beforePercent}% para ${afterPercent}%.`,
        tag: `toner-replaced-${printerId}-${after.key}-${beforePercent}-${afterPercent}`,
        url: `${APP_URL}impressoras.html`
      });
    }
  });

  return events;
}

function normalizePrinterOnlineState(data = {}) {
  const raw = data.online ?? data.isOnline ?? data.connected ?? data.ligada ?? data.comunicacao ?? data.estadoComunicacao ?? data.statusComunicacao ?? data.status ?? data.estado;
  if (typeof raw === "boolean") return raw ? "online" : "offline";
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return "unknown";
  if (["online", "ok", "ativo", "activa", "ativa", "ligada", "comunica", "comunicando", "up", "true"].includes(text)) return "online";
  if (["offline", "erro", "avaria", "inativo", "inativa", "desligada", "sem comunicacao", "sem comunicação", "down", "false"].includes(text)) return "offline";
  if (/offline|sem\s+comunica|desligad|down|erro|avaria/i.test(text)) return "offline";
  if (/online|comunica|ligad|ok|ativo|ativa|up/i.test(text)) return "online";
  return "unknown";
}

function changedPrinterOnlineEvent(beforeData = {}, afterData = {}, printerId = "") {
  const before = normalizePrinterOnlineState(beforeData);
  const after = normalizePrinterOnlineState(afterData);
  if (after === "unknown" || before === after) return null;
  const label = printerName(afterData, printerId);
  if (after === "offline") {
    return {
      event: "system-printer-offline",
      title: "🔴 Impressora offline",
      body: `${label} deixou de comunicar.`,
      tag: `printer-offline-${printerId}`,
      url: `${APP_URL}impressoras.html`
    };
  }
  if (after === "online" && before === "offline") {
    return {
      event: "system-printer-online",
      title: "🟢 Impressora online",
      body: `${label} voltou a comunicar.`,
      tag: `printer-online-${printerId}`,
      url: `${APP_URL}impressoras.html`
    };
  }
  return null;
}
async function handlePrinterTonerNotification(event, sourceCollection) {
  const beforeData = event.data?.before?.exists ? event.data.before.data() || {} : {};
  const afterData = event.data?.after?.exists ? event.data.after.data() || {} : null;
  if (!afterData) return null;

  const printerId = event.params.printerId || event.params.impressoraId || "";
  const events = changedTonerEvents(beforeData, afterData, printerId);
  const onlineEvent = changedPrinterOnlineEvent(beforeData, afterData, printerId);
  if (onlineEvent) events.push(onlineEvent);
  logger.info("printer toner check", {
    sourceCollection,
    printerId,
    events: events.map((item) => item.event),
    before: printerTonerLevels(beforeData),
    after: printerTonerLevels(afterData)
  });

  for (const item of events) {
    try {
      const result = await sendNotificationToDevices({
        requestId: `${item.event}-${printerId}-${Date.now()}`,
        title: item.title,
        body: item.body,
        event: item.event,
        tag: item.tag,
        url: item.url
      }, { system: true });
      logger.info("system printer notification", { sourceCollection, event: item.event, printerId, result });
    } catch (error) {
      logger.error("system printer notification failed", { sourceCollection, printerId, event: item.event, error: error.message });
    }
  }
  return null;
}

exports.onPrinterTonerNotification = onDocumentWritten(
  { ...BACKGROUND_OPTIONS, document: "printers/{printerId}" },
  (event) => handlePrinterTonerNotification(event, "printers")
);

exports.onImpressoraTonerNotification = onDocumentWritten(
  { ...BACKGROUND_OPTIONS, document: "impressoras/{impressoraId}" },
  (event) => handlePrinterTonerNotification(event, "impressoras")
);


function stockGroupFrom(data = {}) {
  const equipamento = cleanText(data.equipamento || data.modelo || data.model || data.printerModel, "Toner");
  const cor = cleanText(data.cor || data.color || data.colour, "Sem cor");
  return { equipamento, cor, key: `${equipamento}::${cor}`.toLowerCase() };
}

async function stockCountForGroup(group) {
  let query = db.collection("stock").where("equipamento", "==", group.equipamento).where("cor", "==", group.cor);
  const snap = await query.get();
  return snap.size;
}

async function markStockAlertState(group, count) {
  const safeId = Buffer.from(group.key).toString("base64url").slice(0, 120);
  const ref = db.collection("notificationState").doc(`stock-${safeId}`);
  const stateSnap = await ref.get().catch(() => null);
  const state = stateSnap?.exists ? stateSnap.data() || {} : {};
  const previousLevel = state.level || "ok";
  const nextLevel = count <= 0 ? "empty" : (count === 1 ? "low" : "ok");

  if (nextLevel === "ok") {
    if (previousLevel !== "ok") {
      await ref.set({ level: "ok", count, group, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    return null;
  }

  if (previousLevel === nextLevel) return null;
  await ref.set({ level: nextLevel, count, group, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  if (nextLevel === "empty") {
    return {
      event: "system-stock-empty",
      title: "🚨 Stock esgotado",
      body: `${group.equipamento} ${group.cor}: stock esgotado.`,
      tag: `stock-empty-${safeId}`,
      url: `${APP_URL}stock.html`
    };
  }
  return {
    event: "system-stock-low",
    title: "📦 Stock baixo",
    body: `${group.equipamento} ${group.cor}: só resta 1 toner em stock.`,
    tag: `stock-low-${safeId}`,
    url: `${APP_URL}stock.html`
  };
}

exports.onStockNotification = onDocumentWritten(
  { ...BACKGROUND_OPTIONS, document: "stock/{stockId}" },
  async (event) => {
    const beforeData = event.data?.before?.exists ? event.data.before.data() || {} : null;
    const afterData = event.data?.after?.exists ? event.data.after.data() || {} : null;
    const groups = new Map();
    if (beforeData) {
      const group = stockGroupFrom(beforeData);
      groups.set(group.key, group);
    }
    if (afterData) {
      const group = stockGroupFrom(afterData);
      groups.set(group.key, group);
    }

    for (const group of groups.values()) {
      try {
        const count = await stockCountForGroup(group);
        const alert = await markStockAlertState(group, count);
        if (!alert) continue;
        const result = await sendNotificationToDevices({
          requestId: `${alert.event}-${group.key}-${Date.now()}`,
          title: alert.title,
          body: alert.body,
          event: alert.event,
          tag: alert.tag,
          url: alert.url
        }, { system: true });
        logger.info("system stock notification", { group, count, event: alert.event, result });
      } catch (error) {
        logger.error("system stock notification failed", { group, error: error.message });
      }
    }
    return null;
  }
);

function userIsPendingApproval(data = {}) {
  const status = String(data.status || data.estado || data.approvalStatus || "").trim().toLowerCase();
  if (["pending", "pendente", "a aprovar", "aguarda aprovacao", "aguarda aprovação"].includes(status)) return true;
  if (data.approved === false || data.aprovado === false || data.isApproved === false) return true;
  if (data.needsApproval === true || data.precisaAprovacao === true || data.pendingApproval === true) return true;
  return false;
}

exports.onUserApprovalNotification = onDocumentWritten(
  { ...BACKGROUND_OPTIONS, document: "users/{userId}" },
  async (event) => {
    const beforeData = event.data?.before?.exists ? event.data.before.data() || {} : null;
    const afterData = event.data?.after?.exists ? event.data.after.data() || {} : null;
    if (!afterData) return null;
    const wasPending = beforeData ? userIsPendingApproval(beforeData) : false;
    const isPending = userIsPendingApproval(afterData);
    if (!isPending || wasPending) return null;

    const name = cleanText(afterData.nome || afterData.name || afterData.displayName || afterData.email, "Novo utilizador");
    try {
      const result = await sendNotificationToDevices({
        requestId: `user-approval-${event.params.userId}-${Date.now()}`,
        title: "👤 Novo utilizador a aprovar",
        body: `${name} aguarda aprovação na App Braga.`,
        event: "system-user-approval",
        tag: `user-approval-${event.params.userId}`,
        url: `${APP_URL}users.html`
      }, { system: true });
      logger.info("system user approval notification", { userId: event.params.userId, result });
    } catch (error) {
      logger.error("system user approval notification failed", { userId: event.params.userId, error: error.message });
    }
    return null;
  }
);

function isHighPriorityTask(task = {}) {
  const priority = String(task.priority || task.prioridade || "").toLowerCase();
  return priority === "alta" || priority === "high" || priority === "urgente" || task.important === true || task.importante === true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

exports.onPersonalTaskNotification = onDocumentCreated(
  { ...BACKGROUND_OPTIONS, document: "personalTasks/{taskId}" },
  async (event) => {
    await sleep(3500);
    const latestDoc = await db.collection("personalTasks").doc(event.params.taskId).get().catch(() => null);
    const task = latestDoc?.exists ? latestDoc.data() || {} : event.data?.data() || {};
    if (task.notificationClientSent === true) return null;
    if (task.done === true || task.status === "done" || task.status === "closed") return null;

    const title = cleanText(task.title || task.titulo || task.nome, "Nova tarefa");
    const high = isHighPriorityTask(task);
    const owner = cleanText(task.owner || task.responsavel, "");
    const dueDate = cleanText(task.dueDate || task.prazo, "");
    const details = [owner ? `Responsavel: ${owner}` : "", dueDate ? `Prazo: ${dueDate}` : ""].filter(Boolean).join(" - ");

    try {
      const result = await sendNotificationToDevices({
        requestId: `task-created-${event.params.taskId}-${Date.now()}`,
        title: high ? "Tarefa importante" : "Nova tarefa",
        body: cleanText(`${title}${details ? ` - ${details}` : ""}`, title),
        event: high ? "system-task-high" : "system-task-created",
        tag: `task-created-${event.params.taskId}`,
        url: `${APP_URL}tarefas.html`
      }, { system: true });
      logger.info("system task notification", { taskId: event.params.taskId, high, result });
    } catch (error) {
      logger.error("system task notification failed", { taskId: event.params.taskId, error: error.message });
    }
    return null;
  }
);
