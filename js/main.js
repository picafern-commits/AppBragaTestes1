const { app, BrowserWindow, shell, ipcMain, Tray, Menu, screen, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const snmp = require("net-snmp");

let win;
let tray;
const pushWatcherStatus = {
  ok: true,
  running: false,
  mode: "cloud-functions",
  error: "",
  startedAt: null,
  logFile: "",
  cloudOnly: true,
  message: "Envio remoto nas Firebase Cloud Functions. Este PC nao precisa de Node.js nem de watcher local."
};
app.isQuitting = false;
app.setName("App Braga");

const APP_REMOTE_URL = "https://picafern-commits.github.io/App-Tablet/html/index.html";
const APP_LOCAL_FALLBACK = path.join(__dirname, "..", "html", "index.html");
const APP_ICON_ICO = path.join(__dirname, "..", "icon.ico");
const APP_ICON_PNG = path.join(__dirname, "..", "icon-512.png");
function getAppIconPath() {
  return fs.existsSync(APP_ICON_ICO) ? APP_ICON_ICO : APP_ICON_PNG;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

if (process.platform === "win32") {
  app.setAppUserModelId("com.appbraga.desktop");
}

function settingsPath() {
  return path.join(app.getPath("userData"), "desktop-settings.json");
}

function backupDirPath() {
  return path.join(app.getPath("userData"), "local-backups");
}

function backupStatusPath() {
  return path.join(backupDirPath(), "backup-status.json");
}

function pushWatcherLogPath() {
  return path.join(app.getPath("userData"), "push-watch.log");
}

function appendPushWatcherLog(text) {
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.appendFileSync(pushWatcherLogPath(), `[${new Date().toISOString()}] ${text}\n`, "utf8");
  } catch {}
}

function parseLocalPushEnvFile(filePath) {
  const env = {};
  try {
    if (!fs.existsSync(filePath)) return env;
    const raw = fs.readFileSync(filePath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const match = line.match(/\$env:([A-Z0-9_]+)\s*=\s*["']([^"']+)["']/i);
      if (match) env[match[1]] = match[2];
    });
  } catch {}
  return env;
}

function pushEnvCandidates() {
  const appRoot = path.join(__dirname, "..");
  const parentRoot = path.resolve(appRoot, "..");
  const roaming = app.getPath("appData");
  const documents = app.getPath("documents");
  const downloads = app.getPath("downloads");
  const desktop = app.getPath("desktop");
  return [
    path.join(app.getPath("userData"), ".env.push.local.ps1"),
    path.join(roaming, "app-braga", ".env.push.local.ps1"),
    path.join(roaming, "App Braga", ".env.push.local.ps1"),
    path.join(documents, "App Braga", ".env.push.local.ps1"),
    path.join(documents, "AppBraga", ".env.push.local.ps1"),
    path.join(downloads, ".env.push.local.ps1"),
    path.join(desktop, ".env.push.local.ps1"),
    path.join(appRoot, ".env.push.local.ps1"),
    path.join(parentRoot, ".env.push.local.ps1"),
    path.join(process.cwd(), ".env.push.local.ps1"),
    path.join("C:\\Minhas Apps\\AppBragaDesktop", ".env.push.local.ps1"),
    path.join("C:\\Minhas Apps\\AppBragaDesktop\\AppBragaTeste-main", ".env.push.local.ps1")
  ];
}

function serviceAccountCandidates() {
  const appRoot = path.join(__dirname, "..");
  const parentRoot = path.resolve(appRoot, "..");
  const roaming = app.getPath("appData");
  const documents = app.getPath("documents");
  const downloads = app.getPath("downloads");
  const desktop = app.getPath("desktop");
  return [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(app.getPath("userData"), "service-account.json"),
    path.join(roaming, "app-braga", "service-account.json"),
    path.join(roaming, "App Braga", "service-account.json"),
    path.join(documents, "App Braga", "service-account.json"),
    path.join(documents, "AppBraga", "service-account.json"),
    path.join(documents, "service-account.json"),
    path.join(downloads, "service-account.json"),
    path.join(desktop, "service-account.json"),
    path.join(documents, "App Braga", "firebase-service-account.json"),
    path.join(documents, "AppBraga", "firebase-service-account.json"),
    path.join(documents, "firebase-service-account.json"),
    path.join(downloads, "firebase-service-account.json"),
    path.join(desktop, "firebase-service-account.json"),
    path.join(appRoot, "service-account.json"),
    path.join(parentRoot, "service-account.json"),
    path.join(process.cwd(), "service-account.json"),
    "C:\\Minhas Apps\\AppBragaDesktop\\AppBragaTeste-main\\service-account.json",
    "C:\\Minhas Apps\\AppBragaDesktop\\service-account.json",
    "C:\\Minhas Apps\\AppBragaDesktop\\firebase-service-account.json"
  ].filter(Boolean);
}

function buildPushWatcherEnv() {
  const env = { ...process.env };
  pushEnvCandidates().forEach((filePath) => Object.assign(env, parseLocalPushEnvFile(filePath)));
  env.APP_BRAGA_PUSH_INTERVAL = env.APP_BRAGA_PUSH_INTERVAL || "15";
  const serviceAccount = serviceAccountCandidates().find((candidate) => fs.existsSync(candidate));
  if (serviceAccount) env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccount;
  return env;
}

function getPushWatcherReadiness() {
  const env = buildPushWatcherEnv();
  return {
    serviceAccountReady: !!(env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(env.GOOGLE_APPLICATION_CREDENTIALS)),
    serviceAccountPath: env.GOOGLE_APPLICATION_CREDENTIALS || "",
    vapidReady: !!(env.APP_BRAGA_VAPID_PUBLIC_KEY && env.APP_BRAGA_VAPID_PRIVATE_KEY),
    vapidPublicReady: !!env.APP_BRAGA_VAPID_PUBLIC_KEY,
    vapidPrivateReady: !!env.APP_BRAGA_VAPID_PRIVATE_KEY,
    logFile: pushWatcherLogPath()
  };
}

function getWebPushRuntime() {
  const env = buildPushWatcherEnv();
  const publicKey = env.APP_BRAGA_VAPID_PUBLIC_KEY || "";
  const privateKey = env.APP_BRAGA_VAPID_PRIVATE_KEY || "";
  const subject = env.APP_BRAGA_VAPID_SUBJECT || "mailto:admin@appbraga.pt";
  return {
    publicKey,
    privateKey,
    subject,
    ready: !!(publicKey && privateKey)
  };
}

function base64UrlToBuffer(value) {
  const input = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${input}${"=".repeat((4 - input.length % 4) % 4)}`;
  return Buffer.from(padded, "base64");
}

function bufferToBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function hkdfExpand(prk, info, length) {
  const infoBuffer = Buffer.isBuffer(info) ? info : Buffer.from(String(info), "utf8");
  const blocks = [];
  let previous = Buffer.alloc(0);
  let counter = 1;
  while (Buffer.concat(blocks).length < length) {
    previous = crypto
      .createHmac("sha256", prk)
      .update(Buffer.concat([previous, infoBuffer, Buffer.from([counter])]))
      .digest();
    blocks.push(previous);
    counter += 1;
  }
  return Buffer.concat(blocks).subarray(0, length);
}

function createVapidJwt(endpoint, runtime) {
  const vapidPrivate = base64UrlToBuffer(runtime.privateKey);
  const vapidEcdh = crypto.createECDH("prime256v1");
  vapidEcdh.setPrivateKey(vapidPrivate);
  const vapidPublic = vapidEcdh.getPublicKey(null, "uncompressed");
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: bufferToBase64Url(vapidPrivate),
    x: bufferToBase64Url(vapidPublic.subarray(1, 33)),
    y: bufferToBase64Url(vapidPublic.subarray(33, 65))
  };
  const keyObject = crypto.createPrivateKey({ key: jwk, format: "jwk" });
  const aud = new URL(endpoint).origin;
  const header = bufferToBase64Url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bufferToBase64Url(Buffer.from(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: runtime.subject
  })));
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign("sha256", Buffer.from(unsigned), {
    key: keyObject,
    dsaEncoding: "ieee-p1363"
  });
  return {
    token: `${unsigned}.${bufferToBase64Url(signature)}`,
    publicKey: bufferToBase64Url(vapidPublic)
  };
}

function encryptWebPushPayload(subscription, payload) {
  const receiverPublic = base64UrlToBuffer(subscription.keys?.p256dh);
  const receiverAuth = base64UrlToBuffer(subscription.keys?.auth);
  if (receiverPublic.length !== 65 || !receiverAuth.length) {
    throw new Error("Subscricao Web Push invalida neste dispositivo.");
  }

  const localEcdh = crypto.createECDH("prime256v1");
  localEcdh.generateKeys();
  const senderPublic = localEcdh.getPublicKey(null, "uncompressed");
  const sharedSecret = localEcdh.computeSecret(receiverPublic);
  const authPrk = crypto.createHmac("sha256", receiverAuth).update(sharedSecret).digest();
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    receiverPublic,
    senderPublic
  ]);
  const ikm = hkdfExpand(authPrk, keyInfo, 32);
  const salt = crypto.randomBytes(16);
  const prk = crypto.createHmac("sha256", salt).update(ikm).digest();
  const cek = hkdfExpand(prk, "Content-Encoding: aes128gcm\0", 16);
  const nonce = hkdfExpand(prk, "Content-Encoding: nonce\0", 12);
  const plaintext = Buffer.concat([Buffer.from(JSON.stringify(payload), "utf8"), Buffer.from([0x02])]);
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21 + senderPublic.length);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(senderPublic.length, 20);
  senderPublic.copy(header, 21);
  return Buffer.concat([header, encrypted]);
}

function postWebPushNative(subscription, title, body, data, runtime) {
  return new Promise((resolve, reject) => {
    const endpoint = String(subscription.endpoint || "");
    if (!endpoint) return reject(new Error("Endpoint Web Push vazio."));
    const payload = { title, body, tag: data.tag || data.requestId || data.event || data.collection || "app-braga", data };
    const encrypted = encryptWebPushPayload(subscription, payload);
    const vapid = createVapidJwt(endpoint, runtime);
    const url = new URL(endpoint);
    const req = https.request({
      method: "POST",
      hostname: url.hostname,
      path: `${url.pathname}${url.search || ""}`,
      headers: {
        TTL: "2419200",
        Urgency: "normal",
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "Content-Length": encrypted.length,
        Authorization: `vapid t=${vapid.token}, k=${vapid.publicKey}`
      }
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk.toString("utf8"); });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve({ ok: true, statusCode: res.statusCode });
        else reject(new Error(`Push endpoint respondeu ${res.statusCode}: ${raw || res.statusMessage || ""}`));
      });
    });
    req.on("error", reject);
    req.write(encrypted);
    req.end();
  });
}

function writeLocalPushEnvFile(values = {}) {
  const publicKey = String(values.publicKey || "").trim();
  const privateKey = String(values.privateKey || "").trim();
  const subject = String(values.subject || "mailto:admin@appbraga.pt").trim();
  if (!publicKey || publicKey.length < 80) throw new Error("VAPID public key invalida.");
  if (!privateKey || privateKey.length < 30) throw new Error("VAPID private key invalida.");

  const target = path.join(app.getPath("userData"), ".env.push.local.ps1");
  const lines = [
    `$env:APP_BRAGA_VAPID_PUBLIC_KEY="${publicKey.replace(/"/g, '\\"')}"`,
    `$env:APP_BRAGA_VAPID_PRIVATE_KEY="${privateKey.replace(/"/g, '\\"')}"`,
    `$env:APP_BRAGA_VAPID_SUBJECT="${subject.replace(/"/g, '\\"')}"`
  ];
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${lines.join("\n")}\n`, "utf8");
  appendPushWatcherLog(`VAPID keys locais atualizadas em ${target}`);
  return target;
}

async function sendWebPushBroadcastFromElectron(payload = {}) {
  const runtime = getWebPushRuntime();
  const devices = Array.isArray(payload.devices) ? payload.devices : [];
  const webPushDevices = devices.filter((item) => item?.active !== false && item?.pushSubscription?.endpoint);
  let sent = 0;
  let failed = 0;
  let standardWebPushTargets = 0;
  let lastError = "";

  if (!runtime.ready) {
    return {
      ok: false,
      sent,
      failed: webPushDevices.length,
      deviceCount: devices.length,
      standardWebPushTargets: webPushDevices.length,
      standardWebPushReady: false,
      error: "Faltam VAPID keys locais"
    };
  }

  if (!webPushDevices.length) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      deviceCount: devices.length,
      standardWebPushTargets: 0,
      standardWebPushReady: true,
      error: "Nenhum dispositivo com Web Push standard registado"
    };
  }

  const title = String(payload.title || "App Braga");
  const body = String(payload.body || "Notificacao App Braga");
  const data = payload.data && typeof payload.data === "object" ? payload.data : {};

  for (const item of webPushDevices) {
    standardWebPushTargets += 1;
    try {
      await postWebPushNative(item.pushSubscription, title, body, data, runtime);
      sent += 1;
    } catch (error) {
      failed += 1;
      lastError = error.message || String(error);
      appendPushWatcherLog(`Falhou Web Push via ponte Electron: ${error.message}`);
    }
  }

  appendPushWatcherLog(`Ponte Electron Web Push: enviados=${sent} falhas=${failed} alvos=${standardWebPushTargets}`);
  return {
    ok: sent > 0,
    sent,
    failed,
    deviceCount: devices.length,
    standardWebPushTargets,
    standardWebPushReady: true,
    error: sent > 0 ? "" : (lastError || "Nenhum dispositivo Web Push recebeu o envio.")
  };
}

function startPushWatcherAuto() {
  return pushWatcherStatus;
}

function readBackupStatus() {
  try {
    return JSON.parse(fs.readFileSync(backupStatusPath(), "utf8"));
  } catch {
    return { ok: false, lastRunAt: null, lastRunDate: null, lastFile: null, lastError: null };
  }
}

function writeBackupStatus(status) {
  fs.mkdirSync(backupDirPath(), { recursive: true });
  fs.writeFileSync(backupStatusPath(), JSON.stringify(status, null, 2), "utf8");
}

function readDesktopSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
  } catch {
    return { fullscreen: true };
  }
}

function writeDesktopSettings(settings) {
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
  } catch {}
}

function getDisplayById(displayId) {
  const displays = screen.getAllDisplays();
  return displays.find((display) => String(display.id) === String(displayId)) || null;
}

function getDisplayForWindow() {
  if (!win || win.isDestroyed()) return screen.getPrimaryDisplay();
  return screen.getDisplayMatching(win.getBounds());
}

function getSavedOrPrimaryDisplay(settings = readDesktopSettings()) {
  return getDisplayById(settings.displayId) || screen.getPrimaryDisplay();
}

function getWindowBoundsForDisplay(display, settings = readDesktopSettings()) {
  const area = display.workArea || display.bounds;
  const width = Math.min(Math.max(settings.width || 1400, 1100), area.width);
  const height = Math.min(Math.max(settings.height || 860, 700), area.height);
  return {
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + Math.round((area.height - height) / 2),
    width,
    height
  };
}

function mostrarJanelaPrincipal() {
  if (!win) {
    createWindow();
    return;
  }
  win.show();
  win.focus();
}

function createTray() {
  if (tray) return;

  tray = new Tray(getAppIconPath());
  tray.setToolTip("App Braga");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Abrir App Braga", click: mostrarJanelaPrincipal },
    {
      label: "Sair",
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]));
  tray.on("double-click", mostrarJanelaPrincipal);
}

function createWindow() {
  const desktopSettings = readDesktopSettings();
  const startDisplay = getSavedOrPrimaryDisplay(desktopSettings);
  const startBounds = getWindowBoundsForDisplay(startDisplay, desktopSettings);
  win = new BrowserWindow({
    x: startBounds.x,
    y: startBounds.y,
    width: startBounds.width,
    height: startBounds.height,
    minWidth: 1100,
    minHeight: 700,
    fullscreen: desktopSettings.fullscreen !== false,
    autoHideMenuBar: true,
    icon: getAppIconPath(),
    backgroundColor: "#101114",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  win.loadURL(APP_REMOTE_URL);

  win.webContents.on("did-fail-load", (_event, _errorCode, _errorDescription, validatedUrl) => {
    if (String(validatedUrl || "").startsWith("file://")) return;
    win.loadFile(APP_LOCAL_FALLBACK);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    const target = String(url || "");
    if (target.startsWith("https://picafern-commits.github.io/App-Tablet/")) return;
    if (target.startsWith("file://")) return;
    event.preventDefault();
    shell.openExternal(target);
  });

  win.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  win.on("resize", () => {
    if (!win || win.isDestroyed()) return;
    const [width, height] = win.getSize();
    writeDesktopSettings({ ...readDesktopSettings(), width, height, fullscreen: win.isFullScreen() });
  });

  win.on("enter-full-screen", () => writeDesktopSettings({ ...readDesktopSettings(), fullscreen: true }));
  win.on("leave-full-screen", () => writeDesktopSettings({ ...readDesktopSettings(), fullscreen: false }));
}

function requestUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith("https://") ? https : http;
    const req = client.get(
      url,
      { timeout: 6000, headers: { "User-Agent": "AppBragaDesktop/1.0" } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk.toString("utf8"); });
        res.on("end", () => resolve({ ok: true, statusCode: res.statusCode || 0, body: data, url }));
      }
    );
    req.on("error", (error) => resolve({ ok: false, statusCode: 0, body: "", error: error.message, url }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, statusCode: 0, body: "", error: "Timeout", url });
    });
  });
}

ipcMain.handle("printer:get-html", async (_event, ip) => {
  if (!ip) return { ok: false, body: "", error: "IP inválido" };
  const cleanIp = String(ip).trim();
  const paths = ["/", "/startwlm/Start_Wlm.htm", "/status", "/home", "/monitor", "/mainte/supplies.cgi"];
  for (const p of paths) {
    const res = await requestUrl(`http://${cleanIp}${p}`);
    if (res.ok && res.body) return res;
  }
  return { ok: false, body: "", error: "Sem resposta HTML" };
});

function snmpGet(session, oids) {
  return new Promise((resolve, reject) => {
    session.get(oids, (error, varbinds) => {
      if (error) return reject(error);
      resolve(varbinds || []);
    });
  });
}

function snmpSubtree(session, oid) {
  return new Promise((resolve, reject) => {
    const rows = [];
    session.subtree(
      oid,
      (varbind) => {
        if (varbind && varbind.value !== undefined && varbind.value !== null) {
          rows.push(varbind);
        }
      },
      (error) => {
        if (error) return reject(error);
        resolve(rows);
      }
    );
  });
}

function normalizeSnmpString(value) {
  if (Buffer.isBuffer(value)) return value.toString("utf8").trim();
  return String(value || "").trim();
}

function extractIndex(oid) {
  return String(oid || "").split(".").pop();
}

async function getByIndex(session, index) {
  const vars = await snmpGet(session, [
    `1.3.6.1.2.1.43.11.1.1.9.1.${index}`,
    `1.3.6.1.2.1.43.11.1.1.8.1.${index}`
  ]);

  const level = Number(vars[0] && vars[0].value);
  const max = Number(vars[1] && vars[1].value);

  if (!Number.isFinite(level) || !Number.isFinite(max) || max <= 0 || level < 0) return null;

  return {
    level,
    max,
    percent: Math.max(0, Math.min(100, Math.round((level / max) * 100)))
  };
}

ipcMain.handle("printer:get-toner-snmp", async (_event, ip) => {
  const cleanIp = String(ip || "").trim();
  if (!cleanIp) return { ok: false, error: "IP inválido", colors: [], residue: null };

  const session = snmp.createSession(cleanIp, "public", {
    timeout: 3000,
    retries: 1,
    version: snmp.Version2c
  });

  try {
    const descs = await snmpSubtree(session, "1.3.6.1.2.1.43.11.1.1.6.1");

    const colorsConfig = [
      { key: "black", label: "Preto", re: /(black|preto)/i },
      { key: "cyan", label: "Ciano", re: /(cyan|ciano|blue|azul)/i },
      { key: "magenta", label: "Magenta", re: /(magenta|red|vermelho)/i },
      { key: "yellow", label: "Amarelo", re: /(yellow|amarelo)/i }
    ];

    const colors = [];
    for (const cfg of colorsConfig) {
      const desc = descs.find(v => cfg.re.test(normalizeSnmpString(v.value)));
      if (!desc) continue;
      const info = await getByIndex(session, extractIndex(desc.oid));
      if (!info) continue;
      colors.push({ key: cfg.key, label: cfg.label, percent: info.percent });
    }

    let residue = null;
    const residueDesc = descs.find(v => /(waste|resid|resíduo|residual|used toner|waste toner)/i.test(normalizeSnmpString(v.value)));
    if (residueDesc) {
      const info = await getByIndex(session, extractIndex(residueDesc.oid));
      if (info) residue = { key: "waste", label: "Resíduo", percent: info.percent };
    }

    if (!colors.length) {
      const fallback = await snmpGet(session, [
        "1.3.6.1.2.1.43.11.1.1.9.1.1",
        "1.3.6.1.2.1.43.11.1.1.8.1.1"
      ]);
      const level = Number(fallback[0] && fallback[0].value);
      const max = Number(fallback[1] && fallback[1].value);
            if (Number.isFinite(level) && Number.isFinite(max) && max > 0 && level >= 0) {
        colors.push({ key: "black", label: "Preto", percent: Math.max(0, Math.min(100, Math.round((level / max) * 100))) });
      }
    }

    if (!colors.length && !residue) {
      return { ok: false, error: "Sem leitura SNMP", colors: [], residue: null };
    }

    return { ok: true, colors, residue };
  } catch (error) {
    return { ok: false, error: error.message, colors: [], residue: null };
  } finally {
    try { session.close(); } catch {}
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on("activate", () => {
    mostrarJanelaPrincipal();
  });
});

app.on("second-instance", () => {
  mostrarJanelaPrincipal();
});

ipcMain.handle("app:notify", async (_event, payload = {}) => {
  try {
    const title = String(payload.title || "App Braga");
    const body = String(payload.body || "");
    const tag = String(payload.tag || "");
    if (!Notification.isSupported()) {
      if (tray && process.platform === "win32") {
        tray.displayBalloon({
          title,
          content: body,
          icon: getAppIconPath()
        });
        return { ok: true, mode: "tray-balloon" };
      }
      return { ok: false, error: "Notificacoes nao suportadas pelo sistema" };
    }

    const notification = new Notification({
      title,
      body,
      icon: getAppIconPath(),
      silent: false
    });
    notification.show();
    if (tag === "app-braga-test" && win && !win.isDestroyed()) {
      win.webContents.send("app:notification-tested", { ok: true, mode: "electron-notification" });
    }
    return { ok: true, mode: "electron-notification" };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("app:notification-status", async () => ({
  ok: true,
  supported: Notification.isSupported(),
  platform: process.platform,
  appUserModelId: process.platform === "win32" ? "com.appbraga.desktop" : "",
  trayReady: !!tray,
  focused: !!win && !win.isDestroyed() && win.isFocused(),
  webPushBridgeReady: getWebPushRuntime().ready,
  pushReadiness: getPushWatcherReadiness(),
  pushWatcher: pushWatcherStatus
}));

ipcMain.handle("app:push-watcher-start", async () => pushWatcherStatus);

ipcMain.handle("app:push-watcher-status", async () => pushWatcherStatus);

ipcMain.handle("app:send-web-push-broadcast", async (_event, payload = {}) => sendWebPushBroadcastFromElectron(payload));

ipcMain.handle("app:set-push-vapid-keys", async (_event, payload = {}) => {
  try {
    const target = writeLocalPushEnvFile(payload);
    return {
      ok: true,
      path: target,
      status: getPushWatcherReadiness(),
      webPushBridgeReady: getWebPushRuntime().ready
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("app:import-service-account", async () => {
  try {
    if (!win || win.isDestroyed()) return { ok: false, error: "Janela indisponivel" };
    const result = await dialog.showOpenDialog(win, {
      title: "Selecionar service-account.json",
      properties: ["openFile"],
      filters: [{ name: "Firebase service account", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };

    const source = result.filePaths[0];
    const raw = fs.readFileSync(source, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) {
      return { ok: false, error: "Este JSON nao parece ser uma service account do Firebase." };
    }

    const target = path.join(app.getPath("userData"), "service-account.json");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    appendPushWatcherLog(`Service account importada para ${target}`);
    return { ok: true, path: target, projectId: parsed.project_id || "", status: pushWatcherStatus };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("app:notification-dialog-test", async () => {
  if (!win || win.isDestroyed()) return { ok: false, error: "Janela indisponivel" };
  await dialog.showMessageBox(win, {
    type: "info",
    title: "App Braga",
    message: "Teste de notificacao",
    detail: "Se este aviso apareceu, a ponte Electron esta a funcionar. Se o toast do Windows nao apareceu, o problema esta nas permissoes/notificacoes do Windows."
  });
  return { ok: true };
});

ipcMain.handle("app:get-info", async () => ({
  ok: true,
  version: app.getVersion(),
  platform: process.platform,
  userData: app.getPath("userData"),
  settings: readDesktopSettings()
}));

ipcMain.handle("app:set-fullscreen", async (_event, value) => {
  if (!win) return { ok: false };
  const active = typeof value === "boolean" ? value : !win.isFullScreen();
  win.setFullScreen(active);
  writeDesktopSettings({ ...readDesktopSettings(), fullscreen: active });
  return { ok: true, fullscreen: active };
});

ipcMain.handle("app:list-displays", async () => {
  const current = getDisplayForWindow();
  const displays = screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    index: index + 1,
    label: `Monitor ${index + 1}`,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor,
    primary: display.id === screen.getPrimaryDisplay().id,
    current: display.id === current.id
  }));
  return { ok: true, displays, currentDisplayId: current.id };
});

ipcMain.handle("app:move-to-display", async (_event, displayId) => {
  if (!win) return { ok: false, error: "Janela indisponivel" };
  const target = getDisplayById(displayId) || screen.getPrimaryDisplay();
  if (!target) return { ok: false, error: "Monitor indisponivel" };
  const wasFullscreen = win.isFullScreen();
  const settings = readDesktopSettings();
  const nextBounds = getWindowBoundsForDisplay(target, settings);
  if (wasFullscreen) {
    win.setFullScreen(false);
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  win.setBounds(nextBounds, false);
  win.setPosition(nextBounds.x, nextBounds.y, false);
  win.setSize(nextBounds.width, nextBounds.height, false);
  win.show();
  win.focus();
  if (wasFullscreen) setTimeout(() => win && !win.isDestroyed() && win.setFullScreen(true), 650);
  writeDesktopSettings({ ...settings, ...nextBounds, displayId: target.id, fullscreen: wasFullscreen });
  return { ok: true, display: target.id, bounds: nextBounds, fullscreen: wasFullscreen };
});

ipcMain.handle("app:hide", async () => {
  if (!win) return { ok: false };
  win.hide();
  return { ok: true };
});

ipcMain.handle("app:close", async () => {
  app.isQuitting = true;
  app.quit();
  return { ok: true };
});

ipcMain.handle("app:open-external", async (_event, url) => {
  if (!url) return { ok: false };
  await shell.openExternal(String(url));
  return { ok: true };
});

ipcMain.handle("backup:status", async () => ({
  ok: true,
  backupDir: backupDirPath(),
  status: readBackupStatus()
}));

ipcMain.handle("backup:write", async (_event, payload = {}) => {
  try {
    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const fileName = `app-braga-backup-${stamp}.json`;
    const filePath = path.join(backupDirPath(), fileName);
    const data = {
      app: "App Braga",
      createdAt: now.toISOString(),
      source: "electron-local-backup",
      ...payload
    };
    fs.mkdirSync(backupDirPath(), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    const status = {
      ok: true,
      lastRunAt: now.toISOString(),
      lastRunDate: now.toISOString().slice(0, 10),
      lastFile: filePath,
      lastError: null,
      collectionCount: payload.collectionCount || 0,
      documentCount: payload.documentCount || 0
    };
    writeBackupStatus(status);
    return { ok: true, filePath, status };
  } catch (error) {
    const status = {
      ...readBackupStatus(),
      ok: false,
      lastError: error.message,
      lastErrorAt: new Date().toISOString()
    };
    try { writeBackupStatus(status); } catch {}
    return { ok: false, error: error.message, status };
  }
});

ipcMain.handle("backup:open-folder", async () => {
  fs.mkdirSync(backupDirPath(), { recursive: true });
  await shell.openPath(backupDirPath());
  return { ok: true, backupDir: backupDirPath() };
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") return;
});
