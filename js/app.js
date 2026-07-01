
window.usersData = window.usersData || [];
window.pistolasData = window.pistolasData || [];
window.portasData = window.portasData || [];


const firebaseConfig = {
  apiKey: "AIzaSyCSgw4rhBLW5mq4QClulubf6e0hf5lDJbo",
  authDomain: "toner-manager-756c4.firebaseapp.com",
  databaseURL: "https://toner-manager-756c4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "toner-manager-756c4",
  storageBucket: "toner-manager-756c4.firebasestorage.app",
  messagingSenderId: "1004492465437",
  appId: "1:1004492465437:web:6a745933c51fc17b04adf4"
};

var db = window.db || null;

if (typeof firebase !== "undefined") {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    window.db = db;
    if (firebase.firestore && firebase.firestore.FieldValue) {
      window.appBragaServerTimestamp = firebase.firestore.FieldValue.serverTimestamp;
    }
  } catch (error) {
    console.error("Erro ao iniciar Firebase:", error);
    db = window.db || null;
  }
}

const APP_VERSION = "1.58.26";
const APP_NOTIFICATIONS_REBUILD_MODE = true;
const APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY = "";
const APP_BRAGA_NOTIFICATION_CLOUD_DOC = "";
const APP_BRAGA_NOTIFICATION_CONFIG_COLLECTION = "config";
const APP_BRAGA_DEFAULT_VAPID_SUBJECT = "";
const APP_BRAGA_DEVICE_PROFILE_STORAGE_KEY = "appBragaNotificationDeviceProfile.removed";

function appBragaPageName() {
  const name = String(location.pathname || "").split("/").pop() || "index.html";
  return name.toLowerCase() || "index.html";
}

function appBragaIsPage(...names) {
  const current = appBragaPageName();
  return names.some((name) => current === String(name || "").toLowerCase());
}

function iniciarLoadingInicialAppBraga() {
  if (!document.body || document.getElementById("appBragaSplash")) return;
  try {
    if (sessionStorage.getItem("appBragaSplashShown") === "1") return;
    sessionStorage.setItem("appBragaSplashShown", "1");
  } catch (error) {
    if (window.__appBragaSplashShown) return;
    window.__appBragaSplashShown = true;
  }
  const iconPath = location.pathname.includes("/html/") ? "../icon-192.png" : "icon-192.png";
  const splash = document.createElement("div");
  splash.id = "appBragaSplash";
  splash.className = "app-braga-splash";
  splash.innerHTML = `
    <div class="app-braga-splash-card">
      <div class="app-braga-splash-logo"><img src="${iconPath}" alt="App Braga"></div>
      <div>
        <strong>App Braga</strong>
        <span>A preparar o centro operacional</span>
      </div>
      <div class="app-braga-splash-bar"><i></i></div>
    </div>
  `;
  document.body.appendChild(splash);
  const close = () => {
    splash.classList.add("is-leaving");
    setTimeout(() => splash.remove(), 420);
  };
  window.addEventListener("load", () => setTimeout(close, 520), { once: true });
  setTimeout(close, 3200);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarLoadingInicialAppBraga, { once: true });
} else {
  iniciarLoadingInicialAppBraga();
}

function appBragaBindFirestoreListener(key, shouldBind, bindFn) {
  if (!shouldBind || appFirestoreUnsubscribers[key]) return;
  const unsubscribe = bindFn?.();
  if (typeof unsubscribe === "function") appFirestoreUnsubscribers[key] = unsubscribe;
}

function appBragaUnsubscribeFirestoreListeners() {
  Object.keys(appFirestoreUnsubscribers).forEach((key) => {
    try { appFirestoreUnsubscribers[key]?.(); } catch {}
    delete appFirestoreUnsubscribers[key];
  });
}

window.addEventListener("beforeunload", appBragaUnsubscribeFirestoreListeners);

const BACKUP_KEYS_APP_BRAGA = {
  stock: "appBraga_backup_stock",
  historico: "appBraga_backup_historico",
  pcs: "appBraga_backup_pcs",
  manutencoes: "appBraga_backup_manutencoes"
};

function saveBackupAppBraga(key, data) {

  try {
    localStorage.setItem(key, JSON.stringify(data || []));
  } catch (e) {
    console.error("Erro backup local:", e);
  }
}

function loadBackupAppBraga(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Erro a ler backup local:", e);
    return [];
  }
}

function showBackupBadge() {
  document.querySelectorAll(".version-pill").forEach(node => {
    if (!node.dataset.backupShown) {
      node.dataset.backupShown = "1";
      node.innerHTML = `${node.textContent} <span class="backup-badge">Backup local</span>`;
    }
  });
}

function hideBackupBadge() {
  document.querySelectorAll(".version-pill").forEach(node => {
    if (node.dataset.backupShown === "1") {
      node.dataset.backupShown = "";
      node.textContent = node.textContent.replace(" Backup local", "").trim();
      if (typeof APP_BRAGA_VERSION !== "undefined") node.textContent = APP_BRAGA_VERSION;
    }
  });
}

let stockGlobal = [];
let historicoGlobal = [];
let pcsGlobal = [];
let manutencoesGlobal = [];
let activityLogGlobal = [];
let appNotificationTimer = null;
const appFirestoreUnsubscribers = {};

const appNotificationState = {
  enabled: false,
  tonerZero: true,
  tonerLow25: true,
  tonerChange: true,
  stockMin: true,
  maintenance: true,
  radios: true,
  intervalMinutes: 15,
  vapidKey: "",
  fcmToken: "",
  pushSubscriptionEndpoint: "",
  sent: {},
  realtimeBoot: {},
  realtimeLast: {},
  devicesUnsubscribe: null,
  restoreRunning: false,
  restoredTokenDocId: ""
};

const electronPushBridgeState = {
  started: false,
  startedAt: 0,
  devices: [],
  unsubscribeDevices: null,
  unsubscribeRequests: null,
  processing: new Set()
};

const APP_ROLE_LABELS = {
  admin: "Admin",
  tecnico: "Técnico",
  armazem: "Armazém",
  consulta: "Consulta"
};
let appRoleAtual = "admin";

function el(id) {
  return document.getElementById(id);
}

function corrigirTextoMojibakeAppBraga(texto) {
  const raw = String(texto ?? "");
  if (!/[\u00c3\u00c2\u00e2\u00c6\u00c5]/.test(raw)) return raw;
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const cp1252 = new Map([
    ["\u20ac", 0x80], ["\u201a", 0x82], ["\u0192", 0x83], ["\u201e", 0x84],
    ["\u2026", 0x85], ["\u2020", 0x86], ["\u2021", 0x87], ["\u02c6", 0x88],
    ["\u2030", 0x89], ["\u0160", 0x8a], ["\u2039", 0x8b], ["\u0152", 0x8c],
    ["\u017d", 0x8e], ["\u2018", 0x91], ["\u2019", 0x92], ["\u201c", 0x93],
    ["\u201d", 0x94], ["\u2022", 0x95], ["\u2013", 0x96], ["\u2014", 0x97],
    ["\u02dc", 0x98], ["\u2122", 0x99], ["\u0161", 0x9a], ["\u203a", 0x9b],
    ["\u0153", 0x9c], ["\u017e", 0x9e], ["\u0178", 0x9f]
  ]);
  let current = raw;
  for (let i = 0; i < 4; i += 1) {
    if (!/[\u00c3\u00c2\u00e2\u00c6\u00c5]/.test(current)) break;
    const bytes = Uint8Array.from(Array.from(current, (char) => cp1252.get(char) ?? (char.charCodeAt(0) & 255)));
    const next = decoder.decode(bytes);
    if (!next || next === current) break;
    current = next;
  }
  return current
    .replace(/\u00c2\u00b7/g, "\u00b7")
    .replace(/\u00e2\u20ac\u201d/g, "\u2014")
    .replace(/\u00e2\u20ac\u201c/g, "\u2013")
    .replace(/\u00e2\u0153\u201d/g, "\u2714")
    .replace(/\u00e2\u009d\u0152/g, "\u2716")
    .replace(/\u00ef\u00bb\u00bf/g, "");
}

function corrigirTextosVisiveisAppBraga(root = document.body) {
  if (!root) return;
  const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"]);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || skip.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return /[\u00c3\u00c2\u00e2\u00c6\u00c5]/.test(node.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    node.nodeValue = corrigirTextoMojibakeAppBraga(node.nodeValue);
  });
  if (document.title) {
    document.title = corrigirTextoMojibakeAppBraga(document.title);
  }
  const attrs = ["placeholder", "title", "aria-label", "alt"];
  root.querySelectorAll?.("input, textarea, img, button, [title], [aria-label]").forEach((node) => {
    attrs.forEach((attr) => {
      if (node.hasAttribute?.(attr)) {
        const value = node.getAttribute(attr);
        const fixed = corrigirTextoMojibakeAppBraga(value);
        if (fixed !== value) node.setAttribute(attr, fixed);
      }
    });
  });
  root.querySelectorAll?.("option").forEach((node) => {
    const value = node.getAttribute("value");
    const fixed = corrigirTextoMojibakeAppBraga(value);
    if (fixed !== value) node.setAttribute("value", fixed);
  });
}

function iniciarCorrecaoMojibakeAppBraga() {
  corrigirTextosVisiveisAppBraga();
  let scheduled = false;
  const pendingRoots = new Set();
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const roots = [...pendingRoots];
      pendingRoots.clear();
      roots.forEach((root) => corrigirTextosVisiveisAppBraga(root.nodeType === Node.TEXT_NODE ? root.parentElement : root));
    });
  };
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") pendingRoots.add(mutation.target);
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) pendingRoots.add(node);
      });
    });
    if (pendingRoots.size) schedule();
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarCorrecaoMojibakeAppBraga);
} else {
  iniciarCorrecaoMojibakeAppBraga();
}

(() => {
  const nativeAlert = window.alert?.bind(window);
  const nativeConfirm = window.confirm?.bind(window);
  const nativePrompt = window.prompt?.bind(window);
  if (nativeAlert) window.alert = (message) => nativeAlert(corrigirTextoMojibakeAppBraga(message));
  if (nativeConfirm) window.confirm = (message) => nativeConfirm(corrigirTextoMojibakeAppBraga(message));
  if (nativePrompt) {
    window.prompt = (message, defaultValue) => nativePrompt(
      corrigirTextoMojibakeAppBraga(message),
      corrigirTextoMojibakeAppBraga(defaultValue)
    );
  }
})();

function setText(id, value) {
  const node = el(id);
  if (node) node.innerText = value;
}

function normalizarTexto(valor) {
  return String(valor || "").toLowerCase().trim();
}

function gerarCodigoEtiquetaTonerAppBraga() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ABT-${stamp}-${random}`;
}

function getCodigoEtiquetaAtualAppBraga() {
  const input = el("codigoEtiqueta");
  if (input && !input.value) input.value = gerarCodigoEtiquetaTonerAppBraga();
  return (input && input.value) || gerarCodigoEtiquetaTonerAppBraga();
}

function prepararCodigoEtiquetaTonerAppBraga(force = false) {
  const input = el("codigoEtiqueta");
  if (!input) return "";
  if (force || !input.value) input.value = gerarCodigoEtiquetaTonerAppBraga();
  return input.value;
}

function extrairCodigoEtiquetaTonerAppBraga(texto) {
  const raw = String(texto || "").trim();
  const match = raw.match(/ABT-\d{14}-[A-Z0-9]{6}/i);
  return match ? match[0].toUpperCase() : "";
}

function buildPayloadQrTonerAppBraga(codigo) {
  const clean = String(codigo || "").trim().toUpperCase() || gerarCodigoEtiquetaTonerAppBraga();
  return `APPBRAGA:TONER:${clean}`;
}

function sanitizeFirestorePayloadAppBraga(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(sanitizeFirestorePayloadAppBraga).filter(v => v !== undefined);
  if (typeof value === "object") {
    const out = {};
    Object.keys(value).forEach((key) => {
      const v = sanitizeFirestorePayloadAppBraga(value[key]);
      if (v !== undefined) out[key] = v;
    });
    return out;
  }
  return value;
}

function getDbAppBraga() {
  return window.db || db || null;
}

function dataUrlToUint8ArrayAppBraga(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function gerarQrDataUrlAppBraga(texto, size = 180) {
  return new Promise((resolve) => {
    if (typeof QRCode === "undefined") return resolve("");
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-9999px";
    host.style.top = "-9999px";
    document.body.appendChild(host);
    try {
      new QRCode(host, {
        text: String(texto || ""),
        width: size,
        height: size,
        correctLevel: QRCode.CorrectLevel.M
      });
      setTimeout(() => {
        const img = host.querySelector("img");
        const canvas = host.querySelector("canvas");
        const dataUrl = canvas ? canvas.toDataURL("image/png") : (img ? img.src : "");
        host.remove();
        resolve(dataUrl);
      }, 120);
    } catch (error) {
      host.remove();
      resolve("");
    }
  });
}

function renderQrCodesAppBraga(root = document) {
  if (typeof QRCode === "undefined") return;
  root.querySelectorAll("[data-etq-qr]").forEach((node) => {
    if (node.dataset.qrRendered) return;
    node.dataset.qrRendered = "1";
    new QRCode(node, {
      text: node.getAttribute("data-etq-qr") || "",
      width: 112,
      height: 112,
      correctLevel: QRCode.CorrectLevel.M
    });
  });
}

function getFirestoreSortValue(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortFirestoreCreatedDesc(lista = []) {
  return lista.sort((a, b) => getFirestoreSortValue(b.created || b.createdAt || b.updatedAt) - getFirestoreSortValue(a.created || a.createdAt || a.updatedAt));
}

function mostrarMensagem(texto, tipo = "sucesso") {
  let toast = el("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast-app";
    document.body.appendChild(toast);
  }

  toast.className = `toast-app ${tipo}`;
  toast.innerText = texto;
  toast.style.display = "block";

  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.display = "none";
  }, 2200);
}

async function logActivityApp(type, title, detail = "", extra = {}) {
  try {
    if (!db || !db.collection) return false;
    await db.collection("activityLog").add({
      type,
      title,
      detail,
      ...extra,
      role: appRoleAtual,
      createdAt: new Date(),
      createdAtMs: Date.now()
    });
    return true;
  } catch (error) {
    console.warn("Erro ao gravar atividade:", error);
    return false;
  }
}

function renderActivityLogApp() {
  const host = el("dashboardActivityLog");
  if (!host) return;
  const items = Array.isArray(activityLogGlobal) ? activityLogGlobal.slice(0, 12) : [];
  if (!items.length) {
    host.innerHTML = `<div class="empty-state mini">Sem atividade recente.</div>`;
    return;
  }
  host.innerHTML = items.map((item) => {
    const when = formatTimestampApp(item.createdAtMs || item.createdAt);
    return `
      <div class="activity-item">
        <div>
          <strong>${escapeHtmlAppBraga(item.title || item.type || "Atividade")}</strong>
          <span>${escapeHtmlAppBraga(item.detail || "")}</span>
        </div>
        <small>${escapeHtmlAppBraga(when)}</small>
      </div>
    `;
  }).join("");
}

function renderDashboardOpsResumoApp() {
  if (!el("dashTonersHoje") && !el("dashTonersSemana") && !el("dashAlertasStock")) return;
  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startWeek = startDay - (((now.getDay() + 6) % 7) * 86400000);
  const stockToday = stockGlobal.filter((item) => getFirestoreSortValue(item.created || item.createdAt || item.data) >= startDay).length;
  const usedWeek = historicoGlobal.filter((item) => getFirestoreSortValue(item.usadoAt || item.created || item.createdAt || item.data) >= startWeek).length;
  const alertCount = typeof buildAlertasInteligentes === "function" ? buildAlertasInteligentes().length : 0;
  setText("dashTonersHoje", stockToday);
  setText("dashTonersSemana", usedWeek);
  setText("dashAlertasStock", alertCount);
}

function aplicarPerfilApp(role = appRoleAtual) {
  appRoleAtual = APP_ROLE_LABELS[role] ? role : "admin";
  const status = el("appRoleStatus");
  const select = el("appRoleSelect");
  if (select) select.value = appRoleAtual;
  if (status) status.textContent = APP_ROLE_LABELS[appRoleAtual] || appRoleAtual;

  const readOnly = appRoleAtual === "consulta";
  document.body.classList.toggle("app-role-consulta", readOnly);
  document.querySelectorAll(".btn-delete, .danger, [onclick*='apagar'], [onclick*='delete'], [onclick*='reiniciarContador']").forEach((node) => {
    if (!node.dataset.roleOriginalDisplay) node.dataset.roleOriginalDisplay = node.style.display || "__default__";
    node.style.display = readOnly ? "none" : (node.dataset.roleOriginalDisplay === "__default__" ? "" : node.dataset.roleOriginalDisplay);
  });
}

async function carregarPermissoesApp() {
  try {
    if (!db || !db.collection) return aplicarPerfilApp("admin");
    const snap = await db.collection("config").doc("layout").get();
    const role = snap.exists ? String((snap.data() || {}).appRole || "admin") : "admin";
    aplicarPerfilApp(role);
  } catch (error) {
    console.warn("Erro ao carregar permissões:", error);
    aplicarPerfilApp(appRoleAtual || "admin");
  }
}

async function guardarPerfilApp(role) {
  const nextRole = APP_ROLE_LABELS[role] ? role : "admin";
  aplicarPerfilApp(nextRole);
  try {
    await db.collection("config").doc("layout").set({ appRole: nextRole, updatedAt: Date.now() }, { merge: true });
    await logActivityApp("settings", "Perfil alterado", `Perfil ativo: ${APP_ROLE_LABELS[nextRole]}`);
    mostrarMensagem("Perfil guardado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar perfil.", "erro");
  }
}

window.carregarPermissoesApp = carregarPermissoesApp;
window.guardarPerfilApp = guardarPerfilApp;

/* =========================
   DADOS IMPRESSORAS
========================= */
const impressorasData = [
  { modelo: "Kyocera P3155dn", serie: "R4B2229805", armazem: "Braga", localizacao: "Ilha 01", ip: "192.168.10.178" },
  { modelo: "Ecosys PA5500x", serie: "WD44336210", armazem: "Braga", localizacao: "Ilha 02", ip: "192.168.10.179" },
  { modelo: "Kyocera P3155dn", serie: "R4B1395508", armazem: "Braga", localizacao: "Ilha 03", ip: "192.168.10.180" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293179", armazem: "Braga", localizacao: "Ilha 04", ip: "192.168.10.181" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293180", armazem: "Braga", localizacao: "Ilha 05", ip: "192.168.10.182" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293183", armazem: "Braga", localizacao: "Balcão 01", ip: "192.168.10.184" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293184", armazem: "Braga", localizacao: "Balcão 02", ip: "192.168.10.183" },
  { modelo: "Kyocera P3155dn", serie: "R4B2230012", armazem: "Braga", localizacao: "Dep. Logistica", ip: "192.168.10.185" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293173", armazem: "Braga", localizacao: "G/Encomendas", ip: "192.168.10.186" },
  { modelo: "Kyocera P3155dn", serie: "R4B1395261", armazem: "Braga", localizacao: "Devoluções", ip: "192.168.10.187" },
  { modelo: "TASKalfa 2554ci", serie: "RVP0Z03770", armazem: "Braga", localizacao: "Escritorio", ip: "192.168.10.197" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293169", armazem: "Vila Real", localizacao: "Ilha 01", ip: "192.168.11.110" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293174", armazem: "Vila Real", localizacao: "Ilha 02", ip: "192.168.11.108" },
  { modelo: "TASKalfa 2554ci", serie: "RVP0Z03715", armazem: "Vila Real", localizacao: "Ilha 03", ip: "192.168.11.197" }
];

const IMPRESSORAS_STORAGE_KEY = "appbraga_impressoras_v1";

const manutencaoLocais = [
  "Ilha 01",
  "Ilha 02",
  "Ilha 03",
  "Ilha 04",
  "Ilha 05",
  "Balcão 01",
  "Balcão 02",
  "Dep. Logistica",
  "G/Encomendas",
  "Devoluções",
  "Escritorio"
];

const USERS_STORAGE_KEY = 'appbraga_users_custom_v1';

function prepararRefsUsers() {
  window.usersData.forEach((u, i) => {
    if (!u.idDoc && !u._ref) u._ref = `local-user-${i}`;
  });
}

function guardarUsersLocal() {
  try {
    const serializavel = window.usersData.map(u => ({ ...u }));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(serializavel));
  } catch (e) {
    console.warn('Nao foi possivel guardar users no localStorage.', e);
  }
}

function carregarUsersLocal() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      prepararRefsUsers();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      prepararRefsUsers();
      return;
    }
    window.usersData.splice(0, window.usersData.length, ...parsed);
    prepararRefsUsers();
  } catch (e) {
    console.warn('Nao foi possivel carregar users do localStorage.', e);
    prepararRefsUsers();
  }
}


/* =========================
   IMPRESSORAS / MANUTEN??O
========================= */
function obterEstadoImpressora(ip) {
  const relacionados = manutencoesGlobal.filter(m => m.ip === ip);
  if (!relacionados.length) return "OK";
  return relacionados[0].estado || "OK";
}

function badgeEstado(estado) {
  if (estado === "Pendente") return `<span class="badge pendente">Pendente</span>`;
  if (estado === "Em reparação") return `<span class="badge reparacao">Em reparação</span>`;
  if (estado === "Resolvido") return `<span class="badge resolvido">Resolvido</span>`;
  return `<span class="badge ok">OK</span>`;
}

function abrirIP(ip) {
  window.open(`http://${ip}`, "_blank");
}

function abrirManutencaoDireta(item) {
  localStorage.setItem("manutencaoPreenchida", JSON.stringify(item));
  window.location.href = "manutencao-impressoras.html";
}

function mapModeloManutencao(modelo) {
  if (modelo === "Kyocera P3155dn") return "P3155DN";
  if (modelo === "TASKalfa 2554ci") return "TASKalfa_255ci";
  if (modelo === "Ecosys PA5500x") return "PA5500x";
  return modelo;
}

function sincronizarCamposImpressora() {
  const serie = el("manutencaoSerie")?.value || "";
  const ip = el("manutencaoIP")?.value || "";

  if (serie) {
    const item = impressorasData.find(i => i.serie === serie);
    if (item) {
      if (el("manutencaoModelo")) el("manutencaoModelo").value = mapModeloManutencao(item.modelo);
      if (el("manutencaoArmazem")) el("manutencaoArmazem").value = item.armazem;
      if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = item.localizacao;
      if (el("manutencaoIP")) el("manutencaoIP").value = item.ip;
      return;
    }
  }

  if (ip) {
    const item = impressorasData.find(i => i.ip === ip);
    if (item) {
      if (el("manutencaoModelo")) el("manutencaoModelo").value = mapModeloManutencao(item.modelo);
      if (el("manutencaoArmazem")) el("manutencaoArmazem").value = item.armazem;
      if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = item.localizacao;
      if (el("manutencaoSerie")) el("manutencaoSerie").value = item.serie;
    }
  }
}

function preencherLocaisManutencao() {
  const selectLoc = el("manutencaoLocalizacao");
  if (selectLoc) {
    selectLoc.innerHTML = `
      <option value="">Selecionar localização</option>
      ${manutencaoLocais.map(loc => `<option value="${loc}">${loc}</option>`).join("")}
    `;
  }

  const selectIP = el("manutencaoIP");
  if (selectIP) {
    selectIP.innerHTML = `
      <option value="">Selecionar IP</option>
      ${impressorasData.map(item => `
        <option value="${item.ip}">
          ${item.ip} - ${item.localizacao} (${item.armazem})
        </option>
      `).join("")}
    `;
  }

  const selectSerie = el("manutencaoSerie");
  if (selectSerie) {
    selectSerie.innerHTML = `
      <option value="">Selecionar nº série</option>
      ${impressorasData.map(item => `
        <option value="${item.serie}">${item.serie}</option>
      `).join("")}
    `;
  }
}

function preencherFormularioManutencao() {
  const dados = localStorage.getItem("manutencaoPreenchida");
  if (!dados) return;

  try {
    const item = JSON.parse(dados);

    if (el("manutencaoModelo")) el("manutencaoModelo").value = mapModeloManutencao(item.modelo);
    if (el("manutencaoSerie")) el("manutencaoSerie").value = item.serie || "";
    if (el("manutencaoArmazem")) el("manutencaoArmazem").value = item.armazem || "";
    if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = item.localizacao || "";
    if (el("manutencaoIP")) el("manutencaoIP").value = item.ip || "";
    if (el("manutencaoEstado")) el("manutencaoEstado").value = "Pendente";

    localStorage.removeItem("manutencaoPreenchida");
  } catch (e) {
    console.error(e);
  }
}

function limparFormularioManutencao() {
  if (el("manutencaoTecnico")) el("manutencaoTecnico").value = "";
  if (el("manutencaoEstado")) el("manutencaoEstado").value = "Pendente";
  if (el("manutencaoArmazem")) el("manutencaoArmazem").value = "";
  if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = "";
  if (el("manutencaoModelo")) el("manutencaoModelo").value = "";
  if (el("manutencaoSerie")) el("manutencaoSerie").value = "";
  if (el("manutencaoIP")) el("manutencaoIP").value = "";
  if (el("manutencaoPedido")) el("manutencaoPedido").value = "";
  if (el("manutencaoResolucao")) el("manutencaoResolucao").value = "";
  if (el("manutencaoMotivo")) el("manutencaoMotivo").value = "";
}

async function gerarID() {
  const database = getDbAppBraga();
  if (!database || !database.collection || !database.runTransaction) {
    const fallback = Number(localStorage.getItem("appBraga_toner_counter_fallback") || "0") + 1;
    localStorage.setItem("appBraga_toner_counter_fallback", String(fallback));
    return "TON-" + String(fallback).padStart(4, "0");
  }

  const ref = database.collection("config").doc("contador");
  try {
    return await database.runTransaction(async (t) => {
      const doc = await t.get(ref);
      const atual = doc.exists ? Number((doc.data() || {}).valor || 0) : 0;
      const n = atual + 1;
      t.set(ref, { valor: n, updatedAt: new Date() }, { merge: true });
      return "TON-" + String(n).padStart(4, "0");
    });
  } catch (error) {
    console.error("Erro ao gerar ID no Firestore:", error);
    const fallback = Number(localStorage.getItem("appBraga_toner_counter_fallback") || "0") + 1;
    localStorage.setItem("appBraga_toner_counter_fallback", String(fallback));
    return "TON-LOCAL-" + String(fallback).padStart(4, "0");
  }
}

function formatTonerIdCounterAppBraga(value) {
  return "TON-" + String(Math.max(0, Number(value) || 0)).padStart(4, "0");
}

async function carregarContadorTonerConfig() {
  const currentNode = el("tonerCounterCurrent");
  const nextNode = el("tonerCounterNext");
  if (!currentNode && !nextNode) return;

  try {
    if (!db || !db.collection) throw new Error("Firestore indisponivel");
    const snap = await db.collection("config").doc("contador").get();
    const valor = snap.exists ? Number((snap.data() || {}).valor || 0) : 0;
    if (currentNode) currentNode.textContent = valor > 0 ? formatTonerIdCounterAppBraga(valor) : "Ainda sem IDs";
    if (nextNode) nextNode.textContent = formatTonerIdCounterAppBraga(valor + 1);
  } catch (error) {
    console.error(error);
    if (currentNode) currentNode.textContent = "Erro";
    if (nextNode) nextNode.textContent = "Erro";
  }
}

async function reiniciarContadorTonerConfig() {
  if (!confirm("Reiniciar o contador dos toners? O próximo toner criado vai ser TON-0001.")) return;

  try {
    await db.collection("config").doc("contador").set({
      valor: 0,
      resetAt: new Date()
    }, { merge: true });
    await carregarContadorTonerConfig();
    mostrarMensagem("Contador reiniciado. O próximo toner será TON-0001.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao reiniciar contador dos toners.", "erro");
  }
}

window.carregarContadorTonerConfig = carregarContadorTonerConfig;
window.reiniciarContadorTonerConfig = reiniciarContadorTonerConfig;
document.addEventListener("DOMContentLoaded", () => {
  if (el("tonerCounterCurrent") || el("tonerCounterNext")) {
    setTimeout(carregarContadorTonerConfig, 700);
  }
});

async function disponivel() {
  const equipamento = el("equipamento");
  const localizacao = el("localizacao");
  const cor = el("cor");
  const data = el("data");
  const lote = el("lote");
  const sdsRef = el("sdsRef");
  const dataFolha = el("dataFolha");
  const codigoInput = el("codigoEtiqueta");

  if (!equipamento || !cor) {
    mostrarMensagem("Sistema de adicionar toner não encontrou o formulário.", "erro");
    return;
  }

  const database = getDbAppBraga();
  if (!database || !database.collection) {
    mostrarMensagem("Firebase indisponível. Liga a internet e volta a tentar.", "erro");
    return;
  }

  const eq = String(equipamento.value || "").trim();
  const loc = String(localizacao ? localizacao.value : "").trim();
  const corValue = String(cor.value || "").trim();
  const dataValue = String(data ? data.value : "").trim();
  const dataFolhaValue = String(dataFolha ? dataFolha.value : "").trim();
  const loteValue = String(lote ? lote.value : "").trim().toUpperCase();
  const sdsRefValue = String(sdsRef ? sdsRef.value : "").trim().toUpperCase();
  const codigoEtiqueta = String(getCodigoEtiquetaAtualAppBraga() || "").trim().toUpperCase();

  if (!eq || !corValue) {
    mostrarMensagem("Preenche o equipamento e a cor.", "erro");
    return;
  }

  try {
    const id = await gerarID();
    const payload = sanitizeFirestorePayloadAppBraga({
      idInterno: id,
      equipamento: eq,
      localizacao: loc || "Sem Localização",
      cor: corValue,
      data: dataValue || new Date().toISOString().slice(0, 10),
      dataFolha: dataFolhaValue || "",
      lote: loteValue || "",
      sdsRef: /^S\d{7,12}$/.test(sdsRefValue) ? sdsRefValue : sdsRefValue,
      codigoEtiqueta,
      codigoScan: buildPayloadQrTonerAppBraga(codigoEtiqueta),
      estado: "stock",
      origem: "adicionar-toner",
      created: new Date(),
      createdAtMs: Date.now()
    });

    const ref = await database.collection("stock").add(payload);

    // v1.58.26: a etiqueta da página Etiquetas deve ficar guardada
    // sempre que o toner é adicionado ao stock. Não depende da geração/download
    // do Word, porque o browser pode bloquear ou falhar essa parte.
    const etiquetaPayload = {
      ...payload,
      stockDocId: ref.id,
      origem: "adicionar-toner",
      dataScan: payload.data || "",
      dataEtiqueta: formatDatePTShared(payload.data || payload.dataFolha || "") || payload.data || "Sem Data"
    };
    await guardarEtiquetaPartilhada(etiquetaPayload).catch((etiquetaError) => {
      console.warn("Toner guardado, mas a etiqueta partilhada falhou:", etiquetaError);
    });

    logActivityApp("stock-add", "Toner adicionado", `${id} - ${eq} - ${corValue}`, {
      idInterno: id,
      equipamento: eq,
      cor: corValue,
      localizacao: payload.localizacao,
      sdsRef: payload.sdsRef || "",
      codigoEtiqueta,
      stockDocId: ref.id
    }).catch(() => false);

    let etiquetaGerada = false;
    try {
      etiquetaGerada = await gerarWordEtiquetaFromForm(true);
    } catch (etiquetaError) {
      console.warn("Toner guardado, mas a etiqueta automática falhou:", etiquetaError);
    }

    equipamento.value = "";
    if (localizacao) localizacao.value = "";
    cor.value = "";
    if (data) data.value = "";
    if (dataFolha) dataFolha.value = "";
    if (lote) lote.value = "";
    if (sdsRef) sdsRef.value = "";
    if (codigoInput) prepararCodigoEtiquetaTonerAppBraga(true);

    mostrarMensagem(
      etiquetaGerada
        ? "Toner adicionado ao stock e etiqueta gerada."
        : "Toner adicionado ao stock. A etiqueta ficou disponível para gerar manualmente.",
      "sucesso"
    );
  } catch (error) {
    console.error("Erro ao adicionar toner:", error);
    const detalhe = error && (error.message || error.code) ? ` (${error.message || error.code})` : "";
    mostrarMensagem(`Erro ao adicionar toner${detalhe}`, "erro");
  }
}

appBragaBindFirestoreListener("stock-core", appBragaIsPage("index.html", "stock.html", "add-toner.html", "historico.html"), () => getDbAppBraga()?.collection("stock").onSnapshot(snap => {
  notificarAlteracaoRealtimeApp("stock", snap);
  stockGlobal = [];
  setText("countStock", snap.size);

  snap.forEach(doc => {
    const t = ({ firebaseId: doc.id, ...doc.data() });
    t.idDoc = doc.id;
    stockGlobal.push(t);
  });
  sortFirestoreCreatedDesc(stockGlobal);

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.stock, stockGlobal);
  hideBackupBadge();
  renderDashboardCards(stockGlobal);
  renderStockCards(stockGlobal);
  renderStockMinimoPainel();
  renderAlertasInteligentes();
  renderDashboardResumoInteligente();
  renderModoGestorExtremo();
  renderDashboardOpsResumoApp();
}, error => {
  console.error(error);
  stockGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.stock);
  setText("countStock", stockGlobal.length);
  showBackupBadge();
  renderDashboardCards(stockGlobal);
  renderStockCards(stockGlobal);
  renderStockMinimoPainel();
  renderAlertasInteligentes();
  renderDashboardResumoInteligente();
  renderModoGestorExtremo();
  renderDashboardOpsResumoApp();
}));

appBragaBindFirestoreListener("historico-core", appBragaIsPage("index.html", "historico.html"), () => db.collection("historico").onSnapshot(snap => {
  historicoGlobal = [];
  setText("countUsados", snap.size);

  snap.forEach(doc => {
    const t = ({ firebaseId: doc.id, ...doc.data() });
    t.idDoc = doc.id;
    historicoGlobal.push(t);
  });
  sortFirestoreCreatedDesc(historicoGlobal);

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.historico, historicoGlobal);
  hideBackupBadge();
  renderHistoricoCards(historicoGlobal);
  renderAlertasInteligentes();
  renderModoGestorExtremo();
  renderDashboardResumoInteligente();
  renderDashboardOpsResumoApp();
}, error => {
  console.error(error);
  historicoGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.historico);
  setText("countUsados", historicoGlobal.length);
  showBackupBadge();
  renderHistoricoCards(historicoGlobal);
  renderAlertasInteligentes();
  renderModoGestorExtremo();
  renderDashboardResumoInteligente();
  renderDashboardOpsResumoApp();
}));

if (window.db && window.db.collection) {
  if (appBragaIsPage("index.html", "historico.html", "diagnostico.html")) {
    window.db.collection("activityLog").orderBy("createdAtMs", "desc").limit(30).get().then((snap) => {
      activityLogGlobal = [];
      snap.forEach((doc) => activityLogGlobal.push({ idDoc: doc.id, ...doc.data() }));
      renderActivityLogApp();
    }).catch((error) => {
      console.warn("Erro ao carregar activityLog:", error);
    });
  }
}

appBragaBindFirestoreListener("pcs-core", appBragaIsPage("index.html", "computadores.html"), () => db.collection("pcs").onSnapshot(snap => {
  pcsGlobal = [];
  setText("countPCs", snap.size);

  snap.forEach(doc => {
    const d = ({ firebaseId: doc.id, ...doc.data() });
    d.idDoc = doc.id;
    pcsGlobal.push(d);
  });
  sortFirestoreCreatedDesc(pcsGlobal);

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.pcs, pcsGlobal);
  hideBackupBadge();
  renderPCCards(pcsGlobal);
  renderModoGestorExtremo();
}, error => {
  console.error(error);
  pcsGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.pcs);
  setText("countPCs", pcsGlobal.length);
  showBackupBadge();
  renderPCCards(pcsGlobal);
  renderModoGestorExtremo();
}));

appBragaBindFirestoreListener("manutencoes-core", appBragaIsPage("index.html", "manutencao-impressoras.html", "impressoras.html"), () => db.collection("manutencoes").onSnapshot(snap => {
  notificarAlteracaoRealtimeApp("manutencoes", snap);
  manutencoesGlobal = [];

  snap.forEach(doc => {
    const item = ({ firebaseId: doc.id, ...doc.data() });
    item.idDoc = doc.id;
    manutencoesGlobal.push(item);
  });
  sortFirestoreCreatedDesc(manutencoesGlobal);

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.manutencoes, manutencoesGlobal);
  hideBackupBadge();
  atualizarContadoresManutencao();
  renderManutencoes(manutencoesGlobal);
  renderImpressoras();
}, error => {
  console.error(error);
  manutencoesGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.manutencoes);
  showBackupBadge();
  atualizarContadoresManutencao();
  renderManutencoes(manutencoesGlobal);
  renderImpressoras();
}));

function atualizarContadoresManutencao() {
  setText("countManutTotal", manutencoesGlobal.length);
  setText("countManutPendentes", manutencoesGlobal.filter(i => i.estado === "Pendente").length);
  setText("countManutReparacao", manutencoesGlobal.filter(i => i.estado === "Em reparação").length);
  setText("countManutResolvidos", manutencoesGlobal.filter(i => i.estado === "Resolvido").length);
}


function getCriticalityBucketsAppBraga() {
  let critical = 0;
  let warning = 0;
  let normal = 0;

  impressorasData.forEach(item => {
    const info = tonerInfoState[item.ip] || null;
    const colors = Array.isArray(info?.colors) ? info.colors : [];
    const monoPercent = typeof info?.percent === "number" ? info.percent : null;
    const allPercents = colors.map(c => c.percent).filter(v => typeof v === "number");
    if (!allPercents.length && monoPercent !== null) allPercents.push(monoPercent);

    if (!allPercents.length) {
      normal++;
      return;
    }

    const minValue = Math.min(...allPercents);
    if (isTonerEmpty(minValue)) critical++;
    else normal++;
  });

  return { critical, warning, normal };
}

function getTopLocalizacoesHistorico(limit = 3) {
  const counts = {};
  historicoGlobal.forEach(item => {
    const key = String(item.localizacao || "Sem Localização");
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a,b) => b[1] - a[1])
    .slice(0, limit);
}

function getUltimosMovimentos(limit = 3) {
  return [...historicoGlobal]
    .sort((a,b) => {
      const ad = a.created && a.created.seconds ? a.created.seconds : 0;
      const bd = b.created && b.created.seconds ? b.created.seconds : 0;
      return bd - ad;
    })
    .slice(0, limit);
}

function renderDashboardResumoInteligente() {
  const host = el("dashboardResumoInteligente");
  if (!host) return;

  const buckets = getCriticalityBucketsAppBraga();
  const topLocs = getTopLocalizacoesHistorico(4);
  const ultimos = getUltimosMovimentos(4);

  const critLabel = buckets.critical > 0 ? "Ação imediata" : "Sem críticos";
  const warnLabel = buckets.warning > 0 ? "Vigiar" : "Sem avisos";

  host.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <h4>Criticidade Real</h4>
        <div class="summary-value">${buckets.critical}</div>
        <div class="meta-line">${critLabel} ? toner a 0%</div>
      </div>
      <div class="summary-card">
        <h4>Atenção</h4>
        <div class="summary-value">${buckets.warning}</div>
        <div class="meta-line">${warnLabel} · sem avisos intermédios de toner</div>
      </div>
      <div class="summary-card">
        <h4>Top Localizações</h4>
        <ul class="summary-list">${topLocs.length ? topLocs.map(([k,v]) => `<li>${k} - ${v}</li>`).join("") : "<li>Sem dados ainda</li>"}</ul>
      </div>
      <div class="summary-card">
        <h4>?ltimos Movimentos</h4>
        <ul class="summary-list">${ultimos.length ? ultimos.map(item => `<li>${item.equipamento || "-"} · ${item.cor || "-"} · ${item.localizacao || "-"}</li>`).join("") : "<li>Sem histórico ainda</li>"}</ul>
      </div>
    </div>`;
}

function getDashboardPrinterImage(item = {}) {
  const modelo = normalizarTexto(item.modelo || "");
  if (modelo.includes("taskalfa")) return "../img/taskalfa2554ci.png";
  if (modelo.includes("pa5500")) return "../img/pa5500x.png";
  if (modelo.includes("p3155")) return "../img/kyocerap3155dn.png";
  return "../img/printer.png";
}

function renderDashboardCards(items) {
  try { updateEnterpriseDashboard(); } catch (e) { console.error(e); }
  const lista = el("listaDashboardStock");
  if (!lista) return;

  const searchTxt = normalizarTexto(el("searchDashboard")?.value || "");

  const criticas = impressorasData.map(item => {
    const info = tonerInfoState[item.ip] || null;
    const colors = Array.isArray(info?.colors) ? info.colors : [];
    const residue = info?.residue || null;

    const criticalColors = colors.filter(c => isDashboardTonerLow(c.percent));
    const monoPercent = typeof info?.percent === "number" ? info.percent : null;
    const monoCritical = colors.length === 0 && isDashboardTonerLow(monoPercent);

    const isCritical = criticalColors.length > 0 || monoCritical;
    return { item, info, criticalColors, monoCritical, residue, isCritical };
  }).filter(entry => entry.isCritical).filter(entry => {
    if (!searchTxt) return true;
    const haystack = [
      entry.item.modelo,
      entry.item.serie,
      entry.item.ip,
      entry.item.localizacao,
      entry.item.armazem,
      ...(entry.criticalColors || []).map(c => c.label),
      entry.monoCritical ? "Preto" : ""
    ].join(" ");
    return normalizarTexto(haystack).includes(searchTxt);
  });

  if (!criticas.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem toners abaixo de 25%</h3><p>As impressoras com toner a 25% ou menos vão aparecer aqui.</p></div>`;
    return;
  }

  lista.innerHTML = criticas.map(({ item, info, criticalColors, monoCritical, residue }, index) => {
    const supplyHtml = criticalColors.length
      ? criticalColors.map(c => gerarHTMLBarraToner(c.percent, c.label, c.key)).join("")
      : (monoCritical ? gerarHTMLBarraToner(info.percent, "Preto", "black") : "");

    const residueHtml = residue ? gerarHTMLBarraToner(residue.percent, residue.label || "Resíduo", "waste") : "";

    const printerImage = getDashboardPrinterImage(item);
    return `
      <div class="dashboard-card dashboard-critical-card">
        <div class="equipment-art equipment-photo">
          <img class="equipment-real-image" src="${printerImage}" alt="${safeRefHtml(item.modelo)}" loading="lazy" onerror="this.src='../img/printer.png'">
        </div>
        <div class="stock-id">${item.modelo}</div>
        <div class="meta-line">Série: <span class="meta-value">${item.serie}</span></div>
        <div class="meta-line">Local: <span class="meta-value">${item.localizacao} (${item.armazem})</span></div>
        <div class="meta-line">IP: <span class="meta-value">${item.ip}</span></div>
        <div class="printer-toners-grid" style="margin-top:10px;">${supplyHtml}${residueHtml}</div>
        <div class="card-actions">
          ${equipmentFichaLinkAppBraga("impressora", item, index, "local-impressora", "Ver ficha", "small-btn btn-edit")}
        </div>
      </div>
    `;
  }).join("");
}

function renderStockCards(items) {
  const lista = el("listaStock");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem toners em stock</h3><p>Quando adicionares toners, aparecem aqui.</p></div>`;
    return;
  }

  lista.innerHTML = items.map(t => `
    <div class="stock-card">
      <div class="stock-id">${t.idInterno}</div>
      <div class="meta-line">Equipamento: <span class="meta-value">${t.equipamento}</span></div>
      <div class="meta-line">Cor: <span class="meta-value">${t.cor}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${t.localizacao}</span></div>
      <div class="meta-line">Lote: <span class="meta-value">${t.lote || "-"}</span></div>
      <div class="meta-line">SDS Ref: <span class="meta-value">${t.sdsRef || "-"}</span></div>
      <div class="meta-line">Código etiqueta: <span class="meta-value">${t.codigoEtiqueta || "-"}</span></div>
      <div class="meta-line">Data Scan: <span class="meta-value">${t.data || "Sem Data"}</span></div>
      <div class="meta-line">Data Folha: <span class="meta-value">${t.dataFolha || "Sem Data da Folha"}</span></div>
      <div class="card-actions">
        ${equipmentFichaLinkAppBraga("stock", t, 0, "local-stock", "Ver ficha", "small-btn btn-edit")}
        <button class="small-btn btn-use" onclick="usar('${t.idDoc}')">Marcar usado</button>
        <button class="small-btn btn-edit" onclick="abrirEditarStockModal('${t.idDoc}')">Editar</button>
        <button class="small-btn btn-delete" onclick="apagarStockItem('${t.idDoc}')">Apagar</button>
      </div>
    </div>
  `).join("");
  aplicarPerfilApp(appRoleAtual);
}

function renderHistoricoCards(items) {
  const lista = el("listaHistorico");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem histórico</h3><p>Os toners usados vão aparecer aqui.</p></div>`;
    return;
  }

  lista.innerHTML = items.map(t => `
    <div class="history-card">
      <div class="history-id">${t.idInterno}</div>
      <div class="meta-line">Equipamento: <span class="meta-value">${t.equipamento}</span></div>
      <div class="meta-line">Cor: <span class="meta-value">${t.cor || "-"}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${t.localizacao || "Sem Localização"}</span></div>
      <div class="meta-line">Lote: <span class="meta-value">${t.lote || "-"}</span></div>
      <div class="meta-line">SDS Ref: <span class="meta-value">${t.sdsRef || "-"}</span></div>
      <div class="meta-line">Código etiqueta: <span class="meta-value">${t.codigoEtiqueta || "-"}</span></div>
      <div class="meta-line">Data Scan: <span class="meta-value">${t.data || "Sem Data"}</span></div>
      <div class="meta-line">Data Folha: <span class="meta-value">${t.dataFolha || "Sem Data da Folha"}</span></div>
      <div class="card-actions">
        <button class="small-btn btn-edit" onclick="abrirEditarHistoricoModal('${t.idDoc}')">Editar</button>
        <button class="small-btn btn-delete" onclick="apagar('${t.idDoc}')">Apagar</button>
      </div>
    </div>
  `).join("");
  aplicarPerfilApp(appRoleAtual);
}

async function usar(id) {
  try {
    const ref = db.collection("stock").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      mostrarMensagem("Toner não encontrado.", "erro");
      return;
    }

    await db.collection("historico").add({
      ...snap.data(),
      estado: "usado",
      usadoAt: new Date(),
      stockDocId: id,
      created: new Date()
    });

    await ref.delete();
    await logActivityApp("stock-used", "Toner usado", `${snap.data().idInterno || id} movido para historico`, {
      stockDocId: id,
      idInterno: snap.data().idInterno || "",
      equipamento: snap.data().equipamento || "",
      cor: snap.data().cor || "",
      codigoEtiqueta: snap.data().codigoEtiqueta || ""
    });
    mostrarMensagem("Toner movido para histórico.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao mover para histórico.", "erro");
  }
}

async function usarPorCodigoEtiquetaToner(codigoOuPayload) {
  const codigo = extrairCodigoEtiquetaTonerAppBraga(codigoOuPayload);
  const raw = String(codigoOuPayload || "").trim();
  const rawUpper = extrairABTDoQrStock(raw);

  if (!codigo && !rawUpper) return false;

  try {
    let id = "";

    const matchLocal = stockGlobal.find((item) => {
      const codigoEtiqueta = String(item.codigoEtiqueta || "").toUpperCase();
      const codigoScan = String(item.codigoScan || "").toUpperCase();
      const idInterno = String(item.idInterno || "").toUpperCase();
      const serie = String(item.serie || "").toUpperCase();

      return (
        (codigo && codigoEtiqueta === codigo) ||
        (codigo && codigoScan.includes(codigo)) ||
        (codigo && idInterno === codigo) ||
        (codigo && serie === codigo) ||
        (rawUpper && codigoScan === rawUpper) ||
        (rawUpper && codigoScan.includes(rawUpper)) ||
        (rawUpper && codigoEtiqueta === rawUpper)
      );
    });

    if (matchLocal?.idDoc) id = matchLocal.idDoc;

    if (!id && db?.collection) {
      if (codigo) {
        let snap = await db.collection("stock").where("codigoEtiqueta", "==", codigo).limit(1).get();
        if (!snap.empty) id = snap.docs[0].id;

        if (!id) {
          snap = await db.collection("stock").where("idInterno", "==", codigo).limit(1).get();
          if (!snap.empty) id = snap.docs[0].id;
        }

        if (!id) {
          snap = await db.collection("stock").where("serie", "==", codigo).limit(1).get();
          if (!snap.empty) id = snap.docs[0].id;
        }
      }

      if (!id && rawUpper) {
        const snapAll = await db.collection("stock").limit(200).get();
        snapAll.forEach((doc) => {
          if (id) return;
          const item = doc.data() || {};
          const codigoEtiqueta = String(item.codigoEtiqueta || "").toUpperCase();
          const codigoScan = String(item.codigoScan || "").toUpperCase();
          const idInterno = String(item.idInterno || "").toUpperCase();
          const serie = String(item.serie || "").toUpperCase();

          if (
            codigoEtiqueta === rawUpper ||
            codigoScan === rawUpper ||
            codigoScan.includes(rawUpper) ||
            (codigo && codigoScan.includes(codigo)) ||
            idInterno === rawUpper ||
            serie === rawUpper
          ) {
            id = doc.id;
          }
        });
      }
    }

    if (!id) {
      mostrarMensagem("Código de toner não encontrado em stock.", "erro");
      return true;
    }

    await usar(id);
    mostrarMensagem(`Toner ${codigo || rawUpper} passado para histórico.`);
    return true;
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao passar toner para usado.", "erro");
    return true;
  }
}

async function apagar(id) {
  try {
    await db.collection("historico").doc(id).delete();
    mostrarMensagem("Histórico apagado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar.", "erro");
  }
}

function editar(id) {
  const t = stockGlobal.find(x => x.idDoc === id);
  if (!t) return;

  localStorage.setItem("editarToner", JSON.stringify(t));
  window.location.href = "add-toner.html";
}

function exportar() { exportarExcelStock(); }

function filtrar() { filtrarStockDebounced(); }

function filtrarDashboard() { filtrarDashDebounced(); }

/* =========================
   COMPUTADORES
========================= */
const passos = [
  "TEAMVIEWER HOST",
  "TEAMS",
  "DNS",
  "NOME DO SISTEMA",
  "Atribuir Dominio",
  "Desinstalar MCFee",
  "Instalar Sophos",
  "MICROSOFT 365",
  "Instalar Impressora",
  "Alterar Energia",
  "Apagar User",
  "Criar novo user"
];

function carregarChecklist() {
  const checklist = el("checklist");
  if (!checklist) return;

  checklist.innerHTML = passos.map((p, i) => `
    <label class="checkItem">
      <input type="checkbox" id="p${i}">
      <span>${escapeHtmlAppBraga(p)}</span>
    </label>
  `).join("");
}

function renderPCCards(items) {
  const lista = el("listaPC");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem registos de computadores</h3><p>Os computadores guardados aparecem aqui.</p></div>`;
    return;
  }

  lista.innerHTML = items.map((d, index) => {
    const htmlPassos = (d.passos || []).map(p => `
      <div class="meta-line">${p.feito ? "OK" : "Falhou"} <span class="meta-value">${p.passo}</span></div>
    `).join("");

    return `
      <div class="pc-card">
        <div class="pc-name">${d.nome}</div>
        <div class="meta-line">Data: <span class="meta-value">${d.data || "Sem Data"}</span></div>
        <div class="pc-meta" style="margin-top:12px;">
          ${htmlPassos}
        </div>
        <div class="card-actions">
          <button class="small-btn btn-delete" onclick="apagarPC('${d.idDoc}')">Apagar</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderPCCards(items) {
  const lista = el("listaPC");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem registos de computadores</h3><p>Os computadores guardados aparecem aqui.</p></div>`;
    return;
  }

  lista.innerHTML = items.map((d, index) => {
    const steps = Array.isArray(d.passos) ? d.passos : [];
    const total = steps.length || passos.length || 1;
    const done = steps.filter(p => !!p.feito).length;
    const progress = Math.round((done / total) * 100);
    const statusClass = progress >= 100 ? "ok" : (progress >= 60 ? "warn" : "bad");
    const htmlPassos = steps.map(p => `
      <div class="computer-step ${p.feito ? "is-done" : "is-open"}">
        <span class="computer-step-dot"></span>
        <span>${escapeHtmlAppBraga(p.passo || "-")}</span>
      </div>
    `).join("");

    return `
      <div class="pc-card computer-card">
        <div class="computer-card-head">
          <div>
            <div class="pc-name">${escapeHtmlAppBraga(d.nome || "Computador")}</div>
            <div class="meta-line">Data: <span class="meta-value">${escapeHtmlAppBraga(d.data || "Sem Data")}</span></div>
          </div>
          <span class="health-status ${statusClass}">${progress}%</span>
        </div>
        <div class="computer-progress"><span style="width:${progress}%"></span></div>
        <div class="computer-step-grid">
          ${htmlPassos || `<div class="meta-line">Sem passos registados.</div>`}
        </div>
        <div class="card-actions">
          ${equipmentFichaLinkAppBraga("computador", d, index, "local-computador", "Ver ficha")}
          <button class="secondary-btn btn-delete" onclick="apagarPC('${escapeHtmlAppBraga(d.idDoc)}')">Apagar</button>
        </div>
      </div>
    `;
  }).join("");
}

async function guardarPC() {
  const nomePC = el("nomePC");
  const dataPC = el("dataPC");

  if (!nomePC) return;

  const nome = nomePC.value.trim();
  let data = dataPC ? dataPC.value : "";

  if (!nome) {
    mostrarMensagem("Nome obrigatório.", "erro");
    return;
  }

  if (!data) data = "Sem Data";

  const dados = [];
  passos.forEach((p, i) => {
    dados.push({
      passo: p,
      feito: el("p" + i)?.checked || false
    });
  });

  try {
    await db.collection("pcs").add({
      nome,
      data,
      passos: dados,
      created: new Date()
    });

    nomePC.value = "";
    if (dataPC) dataPC.value = "";
    carregarChecklist();
    mostrarMensagem("Computador guardado com sucesso.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar computador.", "erro");
  }
}

async function apagarPC(id) {
  try {
    await db.collection("pcs").doc(id).delete();
    mostrarMensagem("Registo apagado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar registo.", "erro");
  }
}

/* =========================
   MANUTEN??O
========================= */
async function guardarManutencao() {
  const tecnico = el("manutencaoTecnico")?.value || "";
  const estado = el("manutencaoEstado")?.value || "Pendente";
  const armazem = el("manutencaoArmazem")?.value || "";
  const localizacao = el("manutencaoLocalizacao")?.value || "";
  const modelo = el("manutencaoModelo")?.value || "";
  const serie = el("manutencaoSerie")?.value || "";
  const ip = el("manutencaoIP")?.value || "";
  const motivo = el("manutencaoMotivo")?.value || "";
  const dataPedido = el("manutencaoPedido")?.value || "";
  const dataResolucao = el("manutencaoResolucao")?.value || "";

  if (!tecnico || !armazem || !localizacao || !modelo || !serie || !ip || !motivo || !dataPedido) {
    mostrarMensagem("Preenche os campos obrigatórios da manutenção.", "erro");
    return;
  }

  try {
    await db.collection("manutencoes").add({
      tecnico,
      estado,
      armazem,
      localizacao,
      modelo,
      serie,
      ip,
      motivo,
      dataPedido,
      dataResolucao: dataResolucao || "Sem resolução",
      created: new Date()
    });

    limparFormularioManutencao();
    mostrarMensagem("Manutenção guardada com sucesso.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar manutenção.", "erro");
  }
}

function renderManutencoes(items) {
  const lista = el("listaManutencoes");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `
      <div class="panel empty-state">
        <h3>Sem pedidos de manutenção</h3>
        <p>Os pedidos vão aparecer aqui.</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = items.map(item => `
    <div class="pc-card manut-card">
      <div class="manut-card-top">
        <div>
          <div class="pc-name">${item.modelo || "-"}</div>
          <div class="meta-line">Série: <span class="meta-value">${item.serie || "-"}</span></div>
        </div>
        <div>${badgeEstado(item.estado || "Pendente")}</div>
      </div>

      <div class="meta-line">Técnico: <span class="meta-value">${item.tecnico}</span></div>
      <div class="meta-line">Armazém: <span class="meta-value">${item.armazem}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${item.localizacao}</span></div>
      <div class="meta-line">IP: <span class="meta-value"><a href="http://${item.ip}" target="_blank" rel="noopener noreferrer">${item.ip}</a></span></div>
      <div class="meta-line">Pedido: <span class="meta-value">${item.dataPedido}</span></div>
      <div class="meta-line">Resolução: <span class="meta-value">${item.dataResolucao || "Sem resolução"}</span></div>
      <div class="meta-line">Motivo: <span class="meta-value">${item.motivo}</span></div>

      <div class="card-actions">
        <button class="small-btn btn-use" onclick="marcarResolvido('${item.idDoc}')">Resolver</button>
        <button class="small-btn btn-delete" onclick="apagarManutencao('${item.idDoc}')">Apagar</button>
      </div>
    </div>
  `).join("");
}

function filtrarManutencoes() {
  const texto = normalizarTexto(el("searchManutencoes")?.value || "");
  const estado = el("filterEstadoManutencao")?.value || "";
  const armazem = el("filterArmazemManutencao")?.value || "";

  const filtradas = manutencoesGlobal.filter(item => {
    const passaTexto =
      normalizarTexto(item.modelo).includes(texto) ||
      normalizarTexto(item.serie).includes(texto) ||
      normalizarTexto(item.ip).includes(texto) ||
      normalizarTexto(item.localizacao).includes(texto) ||
      normalizarTexto(item.motivo).includes(texto);

    const passaEstado = !estado || item.estado === estado;
    const passaArmazem = !armazem || item.armazem === armazem;

    return passaTexto && passaEstado && passaArmazem;
  });

  renderManutencoes(filtradas);
}

async function marcarResolvido(id) {
  try {
    await db.collection("manutencoes").doc(id).update({
      estado: "Resolvido",
      dataResolucao: new Date().toISOString().split("T")[0]
    });

    mostrarMensagem("Manutenção marcada como resolvida.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao atualizar manutenção.", "erro");
  }
}

async function apagarManutencao(id) {
  try {
    await db.collection("manutencoes").doc(id).delete();
    mostrarMensagem("Registo de manutenção apagado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar manutenção.", "erro");
  }
}

function carregarEdicaoToner() {
  const item = localStorage.getItem("editarToner");
  if (!item || !el("equipamento")) return;

  try {
    const toner = JSON.parse(item);
    el("equipamento").value = toner.equipamento || "";
    el("localizacao").value = toner.localizacao || "";
    el("cor").value = toner.cor || "";
    el("data").value = toner.data || "";
    if (el("lote")) el("lote").value = toner.lote || "";
    if (el("dataFolha")) el("dataFolha").value = toner.dataFolha || "";
  } catch (e) {
    console.error(e);
  }
}

function extrairPercentagemTonerDoHTML(html) {
  if (!html) return null;

  const texto = String(html);
  const linhaPreto = texto.match(/Preto[\s\S]{0,160}?(\d{1,3})\s*%/i) || texto.match(/Black[\s\S]{0,160}?(\d{1,3})\s*%/i);
  if (linhaPreto) {
    const valor = parseInt(linhaPreto[1], 10);
    if (!Number.isNaN(valor) && valor >= 0 && valor <= 100) return valor;
  }

  const match = texto.match(/(\d{1,3})\s?%/i);
  if (match) {
    const valor = parseInt(match[1], 10);
    if (!Number.isNaN(valor) && valor >= 0 && valor <= 100) return valor;
  }
  return null;
}

const tonerAlertState = {};
const tonerReplacementAlertState = {};
const tonerInfoState = {};
const TONER_EMPTY_THRESHOLD = 0;
const DASHBOARD_TONER_LOW_THRESHOLD = 25;
const APP_BRAGA_TONER_NOTIFY_URL = "https://europe-west1-toner-manager-756c4.cloudfunctions.net/sendNotificationBroadcast";

function isTonerEmpty(percentagem) {
  return typeof percentagem === "number" && percentagem <= TONER_EMPTY_THRESHOLD;
}

function isDashboardTonerLow(percentagem) {
  return typeof percentagem === "number" && percentagem <= DASHBOARD_TONER_LOW_THRESHOLD;
}

function normalizeTonerPercentApp(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function isTonerAtWarning25App(percentagem) {
  return normalizeTonerPercentApp(percentagem) === DASHBOARD_TONER_LOW_THRESHOLD;
}

function isTonerReplacedFromZeroApp(percentagem) {
  const value = normalizeTonerPercentApp(percentagem);
  return value === 99 || value === 100;
}

function getPreviousTonerPercentApp(previousInfo, itemKey) {
  if (!previousInfo) return null;
  const items = Array.isArray(previousInfo.colors) && previousInfo.colors.length
    ? previousInfo.colors
    : (typeof previousInfo.percent === "number" ? [{ key: "black", label: "Preto", percent: previousInfo.percent }] : []);
  const found = items.find((item) => String(item.key || item.label || "toner").toLowerCase() === itemKey);
  return found ? normalizeTonerPercentApp(found.percent) : null;
}

function tonerTransitionShouldNotifyApp(kind, previousPercent, nextPercent) {
  const before = normalizeTonerPercentApp(previousPercent);
  const after = normalizeTonerPercentApp(nextPercent);
  if (after === null) return false;
  if (kind === "zero") return after === 0 && before !== 0;
  if (kind === "warning25") return after === 25 && before !== 25;
  if (kind === "replaced") return before === 0 && (after === 99 || after === 100);
  return false;
}

function tonerNotifyUrlApp() {
  return "https://picafern-commits.github.io/App-Tablet/html/impressoras.html";
}

function shouldSendTonerCloudAlertApp(tag, ttlMs = 1000 * 60 * 60 * 8) {
  const key = `appBraga.tonerCloudAlert.${tag}`;
  const now = Date.now();
  try {
    const last = Number(localStorage.getItem(key) || 0);
    if (last && now - last < ttlMs) return false;
    localStorage.setItem(key, String(now));
  } catch (error) {
    console.warn("Nao foi possivel guardar anti-spam de notificacao toner:", error);
  }
  return true;
}

async function enviarNotificacaoCloudTonerApp(payload = {}) {
  if (!navigator.onLine || !payload.title || !payload.body) return false;
  try {
    const response = await fetch(APP_BRAGA_TONER_NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: payload.requestId || payload.tag || `toner-client-${Date.now()}`,
        title: payload.title,
        body: payload.body,
        event: payload.event || "system-toner-client",
        tag: payload.tag || payload.requestId || `toner-client-${Date.now()}`,
        url: payload.url || tonerNotifyUrlApp()
      })
    });
    return response.ok;
  } catch (error) {
    console.warn("Nao foi possivel enviar notificacao cloud de toner:", error);
    return false;
  }
}

function corBarraToner(percentagem, cor = "black") {
  if (percentagem === null || percentagem === undefined || Number.isNaN(Number(percentagem))) return "#64748b";

  const value = Math.max(0, Math.min(100, Number(percentagem)));

  // Resíduo ? ao contrário: quanto maior pior.
  if (cor === "waste") {
    if (value >= 85) return "#dc2626"; // vermelho
    if (value >= 65) return "#f97316"; // laranja
    if (value >= 45) return "#eab308"; // amarelo
    return "#22c55e";                 // verde
  }

  // Toner normal: quanto maior melhor.
  if (value <= 10) return "#dc2626";  // vermelho crítico
  if (value <= 25) return "#f97316";  // laranja baixo
  if (value <= 50) return "#eab308";  // amarelo médio
  return "#22c55e";                  // verde bom
}

function estadoBarraToner(percentagem, cor = "black") {
  if (percentagem === null || percentagem === undefined || Number.isNaN(Number(percentagem))) return "Sem leitura";

  const value = Math.max(0, Math.min(100, Number(percentagem)));

  if (cor === "waste") {
    if (value >= 85) return "Crítico";
    if (value >= 65) return "Alto";
    if (value >= 45) return "Médio";
    return "OK";
  }

  if (value <= 10) return "Crítico";
  if (value <= 25) return "Baixo";
  if (value <= 50) return "Médio";
  return "Bom";
}

function classeEstadoToner(percentagem, cor = "black") {
  if (percentagem === null || percentagem === undefined || Number.isNaN(Number(percentagem))) return "is-muted";

  const value = Math.max(0, Math.min(100, Number(percentagem)));

  if (cor === "waste") {
    if (value >= 85) return "is-critical";
    if (value >= 65) return "is-low";
    if (value >= 45) return "is-medium";
    return "is-good";
  }

  if (value <= 10) return "is-critical";
  if (value <= 25) return "is-low";
  if (value <= 50) return "is-medium";
  return "is-good";
}

function tonerBarClass(percentagem, cor = "black") {
  if (percentagem === null || percentagem === undefined || Number.isNaN(Number(percentagem))) return "toner-muted";
  const value = Math.max(0, Math.min(100, Number(percentagem)));

  if (cor === "waste") {
    if (value >= 85) return "toner-critical";
    if (value >= 65) return "toner-low";
    if (value >= 45) return "toner-medium";
    return "toner-good";
  }

  if (value <= 10) return "toner-critical";
  if (value <= 25) return "toner-low";
  if (value <= 50) return "toner-medium";
  return "toner-good";
}

function gerarHTMLBarraToner(percentagem, label = "Toner", cor = "black") {
  const estado = estadoBarraToner(percentagem, cor);
  const estadoClasse = classeEstadoToner(percentagem, cor);

  if (percentagem === null || percentagem === undefined) {
    return `
      <div class="printer-toner-box toner-muted">
        <div class="printer-toner-head">
          <span class="printer-toner-title">${label}</span>
          <span class="printer-toner-status ${estadoClasse}">${estado}</span>
        </div>
        <div class="printer-toner-bar-wrap">
          <div class="printer-toner-bar printer-toner-bar-empty" style="width:100%;"></div>
        </div>
        <div class="printer-toner-foot">
          <span class="printer-toner-value">N/D</span>
        </div>
      </div>
    `;
  }

  const largura = Math.max(0, Math.min(100, percentagem));
  const barraCor = corBarraToner(percentagem, cor);
  const barraClasse = tonerBarClass(percentagem, cor);

  return `
    <div class="printer-toner-box ${barraClasse}" style="--toner-color:${barraCor};">
      <div class="printer-toner-head">
        <span class="printer-toner-title">${label}</span>
        <span class="printer-toner-status ${estadoClasse}">${estado}</span>
      </div>
      <div class="printer-toner-bar-wrap">
        <div class="printer-toner-bar ${barraClasse}" style="width:${largura}%; background:${barraCor} !important; box-shadow:0 0 18px ${barraCor};"></div>
      </div>
      <div class="printer-toner-foot">
        <span class="printer-toner-value">${largura}%</span>
      </div>
    </div>
  `;
}

function gerarHTMLToners(info) {
  const colorItems = info && Array.isArray(info.colors) ? info.colors : [];
  const residueItem = info && info.residue ? info.residue : null;
  const monoPercent = info && typeof info.percent === "number" ? info.percent : null;

  if (!colorItems.length && !residueItem && monoPercent === null) {
    return gerarHTMLBarraToner(null, "Toner", "black");
  }

  const blocks = [];
  colorItems.forEach((c) => blocks.push(gerarHTMLBarraToner(c.percent, c.label, c.key)));

  if (!colorItems.length && monoPercent !== null) {
    blocks.push(gerarHTMLBarraToner(monoPercent, "Preto", "black"));
  }

  if (residueItem) {
    blocks.push(gerarHTMLBarraToner(residueItem.percent, residueItem.label || "Resíduo", "waste"));
  }

  return `<div class="printer-toners-grid">${blocks.join("")}</div>`;
}

function maybeNotifyCriticalSupply(ip, info, previousInfo = null) {
  // v1.58.26: nao enviar notificacoes cloud/local a partir das paginas.
  // As notificacoes de toner passam a ser decididas uma unica vez nas Cloud Functions,
  // para evitar loops quando o Dashboard ou outra pagina faz leituras repetidas.
  return;
  if (!info) return;

  const printer = impressorasData.find(i => i.ip === ip);
  const printerLabel = printer ? `${printer.modelo} - ${printer.localizacao}` : ip;
  const alerts = [];
  const tonerItems = Array.isArray(info.colors) && info.colors.length
    ? info.colors
    : (typeof info.percent === "number" ? [{ key: "black", label: "Preto", percent: info.percent }] : []);

  tonerItems.forEach((item) => {
    const itemKey = String(item.key || item.label || "toner").toLowerCase();
    const afterPercent = normalizeTonerPercentApp(item.percent);
    const beforePercent = getPreviousTonerPercentApp(previousInfo, itemKey);
    const label = item.label || "Toner";

    if (appNotificationState.tonerZero && tonerTransitionShouldNotifyApp("zero", beforePercent, afterPercent)) {
      alerts.push({
        title: "🚨 IMPORTANTE: Toner a 0%",
        event: "system-toner-zero",
        tag: `toner-zero-${ip}-${itemKey}-${Date.now()}`,
        issue: `${label}: 0%`,
        level: "erro",
        body: `${printerLabel}: ${label} chegou a 0%. Trocar toner assim que possível.`,
        ttlMs: 1000 * 60 * 60 * 6
      });
    } else if (appNotificationState.tonerLow25 && tonerTransitionShouldNotifyApp("warning25", beforePercent, afterPercent)) {
      alerts.push({
        title: "⚠️ Toner a 25%",
        event: "system-toner-25",
        tag: `toner-25-${ip}-${itemKey}-${Date.now()}`,
        issue: `${label}: 25%`,
        level: "aviso",
        body: `${printerLabel}: ${label} chegou a 25%.`,
        ttlMs: 1000 * 60 * 60 * 12
      });
    }
  });

  if (!alerts.length) return;

  alerts.forEach((alert) => {
    const message = alert.body || `${alert.title} em ${printerLabel} - ${alert.issue}`;
    mostrarMensagem(message, alert.level);
    enviarNotificacaoApp(alert.title, message, alert.tag, { url: "html/impressoras.html" });
    if (!shouldSendTonerCloudAlertApp(alert.tag, alert.ttlMs)) return;
    enviarNotificacaoCloudTonerApp({
      requestId: alert.tag,
      title: alert.title,
      body: message,
      event: alert.event,
      tag: alert.tag,
      url: tonerNotifyUrlApp()
    });
  });
}

function getTonerReplacementCandidatesApp(info) {
  if (!info) return [];
  const items = Array.isArray(info.colors) && info.colors.length
    ? info.colors
    : (typeof info.percent === "number" ? [{ key: "black", label: "Preto", percent: info.percent }] : []);

  return items
    .filter((item) => item && typeof item.percent === "number")
    .map((item) => ({
      key: String(item.key || item.label || "toner").toLowerCase(),
      label: item.label || "Toner",
      percent: Math.max(0, Math.min(100, Math.round(item.percent)))
    }));
}

function getTonerReplacementEventsApp(previousInfo, nextInfo) {
  const previous = getTonerReplacementCandidatesApp(previousInfo);
  const next = getTonerReplacementCandidatesApp(nextInfo);
  const previousMap = {};
  previous.forEach((item) => { previousMap[item.key] = item; });

  return next
    .map((item) => ({ before: previousMap[item.key], after: item }))
    .filter(({ before, after }) => before && before.percent <= 0 && isTonerReplacedFromZeroApp(after.percent));
}

function normalizeVapidPublicKeyApp(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function isValidVapidPublicKeyApp(value) {
  try {
    const key = normalizeVapidPublicKeyApp(value);
    if (!key || key.length < 80) return false;
    const bytes = urlBase64ToUint8ArrayAppBraga(key);
    return bytes.length === 65 && bytes[0] === 4;
  } catch {
    return false;
  }
}

function resolveVapidPublicKeyApp(value) {
  const configured = normalizeVapidPublicKeyApp(value);
  if (isValidVapidPublicKeyApp(configured)) return configured;
  return normalizeVapidPublicKeyApp(APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY);
}

async function maybeNotifyTonerReplacement(ip, previousInfo, nextInfo) {
  // v1.58.26: reposicao de toner tambem fica centralizada nas Cloud Functions.
  return;
  if (!appNotificationState.tonerChange) return;
  const events = getTonerReplacementEventsApp(previousInfo, nextInfo);
  if (!events.length) return;

  const printer = impressorasData.find(i => i.ip === ip);
  const printerLabel = printer ? `${printer.modelo} - ${printer.localizacao}` : ip;

  for (const event of events) {
    const key = `toner-replaced-${ip}-${event.after.key}-${event.before.percent}-${event.after.percent}-${Date.now()}`;
    if (tonerReplacementAlertState[key]) continue;
    tonerReplacementAlertState[key] = Date.now();

    const body = `${printerLabel}: ${event.after.label} passou de ${event.before.percent}% para ${event.after.percent}%.`;
    await enviarNotificacaoApp("✅ Toner reposto", body, key, { url: "html/impressoras.html" });
    if (shouldSendTonerCloudAlertApp(key, 1000 * 60 * 60 * 24)) {
      enviarNotificacaoCloudTonerApp({
        requestId: key,
        title: "✅ Toner reposto",
        body,
        event: "system-toner-replaced",
        tag: key,
        url: tonerNotifyUrlApp()
      });
    }
    mostrarMensagem(`Toner reposto: ${event.after.label} ${event.after.percent}%`);
    try {
      await db.collection("activityLog").add({
        type: "toner-replaced",
        ip,
        printer: printerLabel,
        colorKey: event.after.key,
        colorLabel: event.after.label,
        beforePercent: event.before.percent,
        afterPercent: event.after.percent,
        createdAt: new Date(),
        createdAtMs: Date.now()
      });
    } catch (error) {
      console.warn("Nao foi possivel gravar atividade de toner trocado:", error);
    }
  }
}

function aplicarConfigNotificacoesApp(config = {}) {
  if (APP_NOTIFICATIONS_REBUILD_MODE) {
    appNotificationState.enabled = false;
    clearInterval(appNotificationTimer);
    const enabled = document.getElementById("notifyEnabled");
    if (enabled) enabled.checked = false;
    setNotificationServiceText("notifyServiceStatus", "Em reconstrução", "warn");
    setNotificationServiceText("notifyServiceDetail", "Sistema antigo desativado temporariamente");
    setNotificationServiceText("notifyCredentialsStatus", "Pendente", "warn");
    setNotificationServiceText("notifyCredentialsDetail", "Nova página dedicada em preparação");
    return;
  }
  appNotificationState.enabled = config.notificationEnabled === true;
  appNotificationState.tonerZero = config.notifyTonerZero !== false;
  appNotificationState.tonerLow25 = config.notifyTonerLow25 !== false;
  appNotificationState.tonerChange = config.notifyTonerChange !== false;
  appNotificationState.stockMin = config.notifyStockMin !== false;
  appNotificationState.maintenance = config.notifyMaintenance !== false;
  appNotificationState.radios = config.notifyRadios === true;
  appNotificationState.intervalMinutes = Math.max(5, Number(config.notificationIntervalMinutes || 15));
  appNotificationState.vapidKey = resolveVapidPublicKeyApp(config.notificationVapidKey || APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY || "");

  const setChecked = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.checked = !!value;
  };
  setChecked("notifyEnabled", appNotificationState.enabled);
  setChecked("notifyTonerZero", appNotificationState.tonerZero);
  setChecked("notifyTonerLow25", appNotificationState.tonerLow25);
  setChecked("notifyTonerChange", appNotificationState.tonerChange);
  setChecked("notifyStockMin", appNotificationState.stockMin);
  setChecked("notifyMaintenance", appNotificationState.maintenance);
  setChecked("notifyRadios", appNotificationState.radios);
  const interval = document.getElementById("notifyIntervalMinutes");
  if (interval) interval.value = String(appNotificationState.intervalMinutes);
  const vapid = document.getElementById("notifyVapidKey");
  if (vapid) {
    vapid.value = appNotificationState.vapidKey;
    vapid.placeholder = "Public key Web Push ja configurada";
  }
  const vapidLocal = document.getElementById("notifyVapidPublicLocal");
  if (vapidLocal) vapidLocal.value = appNotificationState.vapidKey;

  iniciarMonitorNotificacoesApp();
  carregarDispositivosNotificacoesApp(false);
  restaurarRegistoPushAtualApp();
  if (window.electronAPI?.sendWebPushBroadcast && document.getElementById("notifyServiceStatus")) {
    iniciarPontePushElectronApp(false);
  }
}

function notificationPermissionApp() {
  if (window.electronAPI?.showNotification) return "electron";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function pedirPermissaoNotificacoesApp(options = {}) {
  const shouldRegisterDevice = options.registerDevice !== false;
  // Mesmo na app Electron, tentamos sempre registo Web Push real.
  // O registo nativo do Windows só serve para teste local e não recebe com a app fechada.

  if (!("Notification" in window)) {
    mostrarMensagem("Este dispositivo não suporta notificações Web.", "erro");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registarServiceWorkerAppBraga();
      await guardarConfigNotificacoesApp({ notificationEnabled: true });
      if (shouldRegisterDevice) {
        await registarDispositivoPushApp(false, { skipPermission: true });
      } else {
        await enviarNotificacaoApp("App Braga", "Notificações ativas neste dispositivo.", "test-web", { force: true });
      }
    } else {
      mostrarMensagem("Permissão de notificações recusada.", "erro");
    }
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao ativar notificações.", "erro");
  }
}

async function guardarConfigNotificacoesApp(overrides = null) {
  const data = overrides || {
    notificationEnabled: !!document.getElementById("notifyEnabled")?.checked,
    notifyTonerZero: !!document.getElementById("notifyTonerZero")?.checked,
    notifyTonerLow25: !!document.getElementById("notifyTonerLow25")?.checked,
    notifyTonerChange: !!document.getElementById("notifyTonerChange")?.checked,
    notifyStockMin: !!document.getElementById("notifyStockMin")?.checked,
    notifyMaintenance: !!document.getElementById("notifyMaintenance")?.checked,
    notifyRadios: !!document.getElementById("notifyRadios")?.checked,
    notificationIntervalMinutes: Number(document.getElementById("notifyIntervalMinutes")?.value || 15),
    notificationVapidKey: resolveVapidPublicKeyApp(document.getElementById("notifyVapidKey")?.value || appNotificationState.vapidKey || APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY || "")
  };

  if (overrides) {
    if (typeof data.notifyTonerZero === "undefined") data.notifyTonerZero = appNotificationState.tonerZero;
    if (typeof data.notifyTonerLow25 === "undefined") data.notifyTonerLow25 = appNotificationState.tonerLow25 !== false;
    if (typeof data.notifyTonerChange === "undefined") data.notifyTonerChange = appNotificationState.tonerChange;
    if (typeof data.notifyStockMin === "undefined") data.notifyStockMin = appNotificationState.stockMin;
    if (typeof data.notifyMaintenance === "undefined") data.notifyMaintenance = appNotificationState.maintenance;
    if (typeof data.notifyRadios === "undefined") data.notifyRadios = appNotificationState.radios;
    if (typeof data.notificationIntervalMinutes === "undefined") data.notificationIntervalMinutes = appNotificationState.intervalMinutes;
    if (typeof data.notificationVapidKey === "undefined") data.notificationVapidKey = appNotificationState.vapidKey;
  }

  aplicarConfigNotificacoesApp(data);

  if (!window.db || !window.db.collection) {
    mostrarMensagem("Firebase indisponível para guardar notificações.", "erro");
    return;
  }

  try {
    await window.db.collection("config").doc("layout").set({
      ...data,
      updatedAt: Date.now()
    }, { merge: true });
    mostrarMensagem("Notificações atualizadas.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar notificações.", "erro");
  }
}

async function enviarNotificacaoApp(title, body, tag = "app-braga", options = {}) {
  if (!options.force && !appNotificationState.enabled) return false;

  try {
    if (window.electronAPI?.showNotification) {
      const result = await window.electronAPI.showNotification({ title, body, tag, data: options });
      if (!result?.ok && result?.error) console.error("Erro notificacao Electron:", result.error);
      return !!result?.ok;
    }

    if (!("Notification" in window) || Notification.permission !== "granted") return false;

    const payload = { title, body, tag, data: options };
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: location.pathname.includes("/html/") ? "../icon-192.png" : "icon-192.png",
          badge: location.pathname.includes("/html/") ? "../icon-192.png" : "icon-192.png",
          tag,
          data: options
        });
        return true;
      }
      navigator.serviceWorker.controller?.postMessage({ type: "APP_BRAGA_NOTIFY", payload });
    }

    new Notification(title, { body, tag });
    return true;
  } catch (error) {
    console.error("Erro notificação:", error);
    return false;
  }
}

function buildAlertasNotificacoesApp() {
  const alerts = [];

  if (appNotificationState.stockMin && typeof buildAlertasInteligentes === "function") {
    buildAlertasInteligentes()
      .filter((item) => item.tipo === "stock")
      .forEach((item) => alerts.push({
        key: `stock-${item.titulo}-${item.detalhe}`,
        title: "Stock abaixo do mínimo",
        body: `${item.titulo}: ${item.detalhe}`,
        url: "html/stock.html"
      }));
  }

  if (appNotificationState.tonerZero && typeof impressorasData !== "undefined" && typeof tonerInfoState !== "undefined") {
    impressorasData.forEach((printer) => {
      const info = tonerInfoState[printer.ip];
      const colors = Array.isArray(info?.colors) ? info.colors : [];
      const empty = colors.filter((item) => isTonerEmpty(item.percent));
      if (!empty.length) return;
      alerts.push({
        key: `toner-${printer.ip}-${empty.map((item) => `${item.label}-${item.percent}`).join("-")}`,
        title: "Toner vazio",
        body: `${printer.modelo} ${printer.localizacao}: ${empty.map((item) => `${item.label} ${item.percent}%`).join(", ")}`,
        url: "html/impressoras.html"
      });
    });
  }

  if (appNotificationState.maintenance && Array.isArray(manutencoesGlobal)) {
    manutencoesGlobal
      .filter((item) => String(item.estado || "").toLowerCase().includes("pendente"))
      .slice(0, 5)
      .forEach((item) => alerts.push({
        key: `manut-${item.idDoc || item.ip || item.numeroSerie || item.modelo || item.dataPedido}`,
        title: "Manutenção pendente",
        body: `${item.modelo || item.numeroSerie || "Impressora"} - ${item.localizacao || item.ip || "sem local"}`,
        url: "html/manutencao-impressoras.html"
      }));
  }

  return alerts;
}

async function verificarAlertasNotificacoesApp(force = false) {
  // v1.58.26: alertas automáticos deixaram de correr no cliente.
  // A origem única é Cloud Functions para enviar uma só vez a todos os dispositivos.
  if (!force) return;
  const alerts = buildAlertasNotificacoesApp();
  if (force && !alerts.length) {
    mostrarMensagem("Sem alertas ativos para notificar.");
    return;
  }

  for (const alert of alerts) {
    if (!force && appNotificationState.sent[alert.key]) continue;
    appNotificationState.sent[alert.key] = Date.now();
    await enviarNotificacaoApp(alert.title, alert.body, alert.key, { url: alert.url, force });
  }
}

function getSnapshotChangeSummaryApp(snapshot) {
  const summary = { added: 0, modified: 0, removed: 0, total: snapshot?.size || 0 };
  if (!snapshot || typeof snapshot.docChanges !== "function") return summary;
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") summary.added += 1;
    if (change.type === "modified") summary.modified += 1;
    if (change.type === "removed") summary.removed += 1;
  });
  return summary;
}

function formatRealtimeChangeBodyApp(summary, label) {
  const parts = [];
  if (summary.added) parts.push(`${summary.added} novo${summary.added > 1 ? "s" : ""}`);
  if (summary.modified) parts.push(`${summary.modified} alterado${summary.modified > 1 ? "s" : ""}`);
  if (summary.removed) parts.push(`${summary.removed} apagado${summary.removed > 1 ? "s" : ""}`);
  return parts.length ? `${label}: ${parts.join(", ")}.` : `${label}: dados atualizados.`;
}

function canNotifyRealtimeCollectionApp(collectionKey) {
  if (!appNotificationState.enabled) return false;
  if (collectionKey === "stock") return appNotificationState.stockMin;
  if (collectionKey === "manutencoes") return appNotificationState.maintenance;
  if (collectionKey === "printers") return false;
  return false;
}

async function notificarAlteracaoRealtimeApp(collectionKey, snapshot) {
  // v1.58.26: não criar notificações automáticas a partir de listeners de página.
  // Listeners servem apenas para atualizar UI; notificações globais vêm das Functions.
  return;
  if (!snapshot || typeof snapshot.docChanges !== "function") return;

  if (!appNotificationState.realtimeBoot[collectionKey]) {
    appNotificationState.realtimeBoot[collectionKey] = true;
    return;
  }

  if (!canNotifyRealtimeCollectionApp(collectionKey)) return;

  const summary = getSnapshotChangeSummaryApp(snapshot);
  const changedCount = summary.added + summary.modified + summary.removed;
  if (!changedCount) return;

  const config = {
    stock: {
      title: "Stock atualizado",
      label: "Stock",
      url: "html/stock.html"
    },
    manutencoes: {
      title: "Manutenção atualizada",
      label: "Manutenções",
      url: "html/manutencao-impressoras.html"
    },
    printers: {
      title: "Impressoras atualizadas",
      label: "Impressoras / toner",
      url: "html/impressoras.html"
    }
  }[collectionKey];

  if (!config) return;

  const body = formatRealtimeChangeBodyApp(summary, config.label);
  const tag = `realtime-${collectionKey}-${Date.now()}`;
  await enviarNotificacaoApp(config.title, body, tag, { url: config.url });

  if (collectionKey === "stock" || collectionKey === "manutencoes" || collectionKey === "printers") {
    window.setTimeout(() => verificarAlertasNotificacoesApp(false), 350);
  }
}

function iniciarMonitorNotificacoesApp() {
  clearInterval(appNotificationTimer);
  // v1.58.26: sem monitor automático no cliente para evitar loops no Dashboard.
  // Os testes manuais continuam a funcionar; automáticas ficam nas Cloud Functions.
}

async function testarNotificacaoApp() {
  const ok = await enviarNotificacaoApp("App Braga", "Teste de notificacao concluido.", "app-braga-test", { force: true, url: "html/config.html" });
  setNotificationServiceText("notifyLastTestStatus", ok ? "Enviado" : "Falhou", ok ? "ok" : "bad");
  setNotificationServiceText("notifyLastTestDetail", new Date().toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }));
  await atualizarEstadoNotificacoesApp(false);
  if (window.electronAPI?.getNotificationStatus) {
    const status = await window.electronAPI.getNotificationStatus().catch(() => null);
    if (status?.ok && !status.supported) {
      await window.electronAPI.showNotificationDialogTest?.();
      mostrarMensagem("Electron funciona, mas o Windows nao aceitou toast nativo.", "erro");
      return;
    }
  }
  mostrarMensagem(ok ? "Notificacao de teste enviada." : "Ativa as permissoes de notificacoes primeiro.", ok ? "sucesso" : "erro");
}

async function obterDispositivoAtualNotificacoesApp() {
  if (!window.db?.collection) return null;
  const snapshot = await window.db.collection("notificationTokens").where("deviceKey", "==", getNotificationDeviceKeyApp()).get();
  let fallback = null;
  let current = null;
  snapshot.forEach((doc) => {
    const item = { id: doc.id, ...doc.data() };
    if (item.active === false) return;
    const sameDevice = item.deviceKey === getNotificationDeviceKeyApp();
    const sameToken = appNotificationState.fcmToken && item.token === appNotificationState.fcmToken;
    const sameEndpoint = appNotificationState.pushSubscriptionEndpoint &&
      (item.endpoint === appNotificationState.pushSubscriptionEndpoint || item.pushSubscription?.endpoint === appNotificationState.pushSubscriptionEndpoint);
    if (sameEndpoint || sameToken || item.id === appNotificationState.restoredTokenDocId) current = item;
    if (!fallback && sameDevice) fallback = item;
  });
  return current || fallback;
}

function getDispositivosPushRemotoElectronApp() {
  const sorted = [...electronPushBridgeState.devices]
    .filter((item) => item.active !== false)
    .filter((item) => item.pushSubscription?.endpoint)
    .sort((a, b) => normalizeTimestampApp(b.updatedAt || b.createdAt) - normalizeTimestampApp(a.updatedAt || a.createdAt));
  const unique = new Map();
  sorted.forEach((item) => {
    const key = item.deviceKey || item.pushSubscription?.endpoint || item.id;
    if (!unique.has(key)) unique.set(key, item);
  });
  return Array.from(unique.values());
}

async function processarPedidoPushElectronApp(doc) {
  if (!doc?.exists || !window.db?.collection || !window.electronAPI?.sendWebPushBroadcast) return;
  const requestId = doc.id;
  if (electronPushBridgeState.processing.has(requestId)) return;
  const fields = doc.data() || {};
  if (fields.forceCloud === true) return;
  const status = String(fields.status || "");
  const alreadyTriedByElectron = fields.electronFallbackTried === true || fields.processedBy === "electron-client-bridge";
  const canRetryFailedByCloud = status === "failed" && !alreadyTriedByElectron && Number(fields.sent || 0) <= 0;
  if (status && status !== "created" && !canRetryFailedByCloud) return;
  if (normalizeTimestampApp(fields.createdAt) && normalizeTimestampApp(fields.createdAt) < electronPushBridgeState.startedAt - 60000) return;

  electronPushBridgeState.processing.add(requestId);
  try {
    await doc.ref.set({
      status: "processing",
      processingAt: Date.now(),
      processedBy: "electron-client-bridge",
      electronFallbackTried: true
    }, { merge: true });

    const title = fields.title || "App Braga";
    const body = fields.body || "Teste remoto de notificacao.";
    const url = fields.url || "https://picafern-commits.github.io/App-Tablet/html/config.html";
    let devices = getDispositivosPushRemotoElectronApp();
    if (!devices.length) {
      const tokensSnap = await window.db.collection("notificationTokens").get();
      electronPushBridgeState.devices = [];
      tokensSnap.forEach((tokenDoc) => electronPushBridgeState.devices.push({ id: tokenDoc.id, ...tokenDoc.data() }));
      devices = getDispositivosPushRemotoElectronApp();
    }
    if (!devices.length) {
      throw new Error("Nenhum iPhone ou Android com Web Push standard registado. Abre a app nesses dispositivos e carrega em Reparar registo.");
    }
    const result = await window.electronAPI.sendWebPushBroadcast({
      title,
      body,
      devices,
      data: {
        collection: "notificationRequests",
        event: fields.event || "manual-remote-test",
        requestId,
        tag: `manual-remote-test-${requestId}`,
        url
      }
    });

    const sent = Number(result?.sent || 0);
    const failed = Number(result?.failed || 0);
    await doc.ref.set({
      status: sent > 0 ? "sent" : "failed",
      sent,
      failed,
      deviceCount: Number(result?.deviceCount || devices.length || 0),
      standardWebPushTargets: Number(result?.standardWebPushTargets || 0),
      standardWebPushReady: result?.standardWebPushReady !== false,
      error: result?.error || "",
      finishedAt: Date.now(),
      processedBy: "electron-client-bridge"
    }, { merge: true });
    await window.db.collection("config").doc("cloudNotifications").set({
      provider: "electron-client-bridge",
      region: "pc-local",
      lastTitle: title,
      lastBody: body,
      lastEvent: fields.event || "manual-remote-test",
      lastSent: sent,
      lastFailed: failed,
      lastError: result?.error || "",
      lastDeviceCount: devices.length,
      lastStandardWebPushTargets: Number(result?.standardWebPushTargets || 0),
      standardWebPushReady: result?.standardWebPushReady !== false,
      lastRunAt: Date.now(),
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error("Erro na ponte Electron Web Push:", error);
    await doc.ref.set({
      status: "failed",
      error: error.message || String(error),
      finishedAt: Date.now(),
      processedBy: "electron-client-bridge"
    }, { merge: true }).catch(() => {});
  } finally {
    electronPushBridgeState.processing.delete(requestId);
  }
}

async function iniciarPontePushElectronApp(showMessage = false) {
  if (APP_NOTIFICATIONS_REBUILD_MODE) return false;
  if (!window.electronAPI?.sendWebPushBroadcast || !window.db?.collection) return false;
  if (electronPushBridgeState.started) {
    if (showMessage) mostrarMensagem("Ponte PC ja esta ligada.");
    return true;
  }
  electronPushBridgeState.started = true;
  electronPushBridgeState.startedAt = Date.now();
  electronPushBridgeState.unsubscribeDevices = window.db.collection("notificationTokens").onSnapshot((snapshot) => {
    electronPushBridgeState.devices = [];
    snapshot.forEach((doc) => electronPushBridgeState.devices.push({ id: doc.id, ...doc.data() }));
  }, (error) => console.error("Erro na ponte PC ao ler dispositivos:", error));
  electronPushBridgeState.unsubscribeRequests = window.db.collection("notificationRequests").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") processarPedidoPushElectronApp(change.doc);
    });
  }, (error) => console.error("Erro na ponte PC ao ler pedidos:", error));
  if (showMessage) mostrarMensagem("Ponte Electron ligada como apoio. A Cloud continua a ser o envio principal.", "sucesso");
  await atualizarEstadoNotificacoesApp(false);
  return true;
}

async function aguardarResultadoPedidoPushRemotoApp(requestRef, startedAt) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    const requestDoc = await requestRef.get().catch(() => null);
    const requestData = requestDoc?.exists ? requestDoc.data() || {} : {};
    if (requestData.status === "sent") return requestData;
    if (requestData.status === "failed") {
      const electronCanRetry = requestData.forceCloud !== true && !!window.electronAPI?.sendWebPushBroadcast && requestData.electronFallbackTried !== true;
      if (!electronCanRetry) return requestData;
    }

    const cloudDoc = await window.db.collection("config").doc("cloudNotifications").get().catch(() => null);
    const cloudData = cloudDoc?.exists ? cloudDoc.data() || {} : null;
    if (cloudData && normalizeTimestampApp(cloudData.lastRunAt) >= startedAt) {
      return {
        status: Number(cloudData.lastSent || 0) > 0 ? "sent" : "failed",
        sent: cloudData.lastSent || 0,
        sentDevices: cloudData.lastSentDevices || cloudData.lastSent || 0,
        failed: cloudData.lastFailed || 0,
        ignored: cloudData.lastIgnored || 0,
        totalDevices: cloudData.lastTotalDeviceCount || 0,
        targetDevices: cloudData.lastDeviceCount || 0,
        deviceCount: cloudData.lastDeviceCount || 0,
        fcmTargets: cloudData.lastFcmTargets || 0,
        fcmSent: cloudData.lastFcmSent || 0,
        fcmFailed: cloudData.lastFcmFailed || 0,
        standardWebPushTargets: cloudData.lastStandardWebPushTargets || 0,
        standardWebPushSent: cloudData.lastStandardWebPushSent || 0,
        standardWebPushFailed: cloudData.lastStandardWebPushFailed || 0,
        standardWebPushReady: cloudData.standardWebPushReady,
        credentialSource: cloudData.credentialSource || "",
        error: cloudData.lastError || "",
        errors: cloudData.lastErrors || []
      };
    }
  }
  return null;
}

async function testarPushRemotoNotificacoesApp() {
  try {
    if (!window.db?.collection) throw new Error("Firestore indisponivel.");
    setNotificationServiceText("notifyLastTestStatus", "A preparar", "warn");
    setNotificationServiceText("notifyLastTestDetail", "A confirmar registo deste dispositivo");

    if (!window.electronAPI?.showNotification) {
      if (!("Notification" in window)) throw new Error("Este dispositivo nao suporta notificacoes Web.");
      if (Notification.permission !== "granted") {
        await pedirPermissaoNotificacoesApp();
      } else {
        await registarDispositivoPushApp(true, { skipPermission: true });
      }
    }

    const currentDevice = await obterDispositivoAtualNotificacoesApp();
    if (isIosAppBraga() && !isStandalonePwaAppBraga()) {
      throw new Error("No iPhone tens de abrir a APP pelo icone do ecra principal para receber push.");
    }
    if (isIosAppBraga() && !currentDevice?.pushSubscription?.endpoint) {
      throw new Error("O iPhone ainda nao criou Web Push standard. Carrega em Reparar registo e confirma que abriste pelo icone do ecra principal.");
    }
    if (!window.electronAPI?.showNotification && !currentDevice?.token && !currentDevice?.pushSubscription?.endpoint) {
      throw new Error("Este dispositivo ainda nao tem token/endpoint Web Push remoto. Carrega em Reparar registo deste dispositivo.");
    }

    const startedAt = Date.now();
    const requestRef = await window.db.collection("notificationRequests").add({
      title: "App Braga",
      body: "Teste remoto Web Push recebido. Este teste tambem funciona com a app fechada.",
      url: "https://picafern-commits.github.io/App-Tablet/html/config.html",
      event: "manual-remote-test",
      requestedDeviceDocId: currentDevice?.id || "",
      requestedDeviceSource: currentDevice?.source || "",
      requestedFrom: getNotificationDeviceTypeApp(),
      requestedUserAgent: navigator.userAgent || "",
      status: "created",
      createdAt: startedAt
    });
    setNotificationServiceText("notifyLastTestStatus", "Pedido criado", "warn");
    setNotificationServiceText("notifyLastTestDetail", "A aguardar resposta das Firebase Cloud Functions");

    const result = await aguardarResultadoPedidoPushRemotoApp(requestRef, startedAt);
    if (!result) {
      setNotificationServiceText("notifyLastTestStatus", "Sem resposta", "bad");
      setNotificationServiceText("notifyLastTestDetail", "Pedido criado, mas as Cloud Functions nao responderam");
      mostrarMensagem("Pedido criado, mas as Firebase Cloud Functions nao responderam. Confirma o deploy das Functions.", "erro");
      return;
    }

    const sent = Number(result.sent || 0);
    const failed = Number(result.failed || 0);
    const ok = result.status === "sent" && sent > 0;
    setNotificationServiceText("notifyLastTestStatus", ok ? "Enviado" : "Falhou", ok ? "ok" : "bad");
    const resultError = result.error ? ` - ${result.error}` : "";
    const targetInfo = typeof result.standardWebPushTargets !== "undefined" ? ` - Web Push: ${Number(result.standardWebPushTargets || 0)}` : "";
    setNotificationServiceText("notifyLastTestDetail", `Enviados: ${sent} - falhas: ${failed}${targetInfo}${resultError}`);
    if (result.standardWebPushReady === false && isIosAppBraga()) {
      setNotificationDeviceDiagnostic("Falta configurar a VAPID privada nas Firebase Cloud Functions para o iPhone receber Web Push.");
    }
    mostrarMensagem(ok ? "Push remoto enviado pelo servidor." : (result.error || "O servidor respondeu, mas nao enviou push. Ve as credenciais Web Push."), ok ? "sucesso" : "erro");
  } catch (error) {
    console.error("Erro no teste remoto push:", error);
    setNotificationServiceText("notifyLastTestStatus", "Falhou", "bad");
    mostrarMensagem(error.message || "Nao foi possivel criar o teste remoto.", "erro");
  }
}

async function entrarFullscreenApp() {
  try {
    if (document.fullscreenElement) {
      guardarFullscreenPreferidoApp(false);
      await document.exitFullscreen?.();
      mostrarMensagem("Fullscreen desligado.");
      atualizarBotaoFullscreenApp();
      return;
    }
    guardarFullscreenPreferidoApp(true);
    await pedirFullscreenApp(true);
  } catch (error) {
    console.warn("Erro fullscreen:", error);
    atualizarBotaoFullscreenApp();
    mostrarMensagem("Nao foi possivel trocar fullscreen.", "erro");
  }
}

const APP_FULLSCREEN_PREF_KEY = "appBragaFullscreenPreferido";

function fullscreenPreferidoApp() {
  try {
    return localStorage.getItem(APP_FULLSCREEN_PREF_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function guardarFullscreenPreferidoApp(value) {
  try {
    localStorage.setItem(APP_FULLSCREEN_PREF_KEY, value ? "1" : "0");
  } catch (error) {
    console.warn("Nao foi possivel guardar fullscreen.", error);
  }
}

function atualizarBotaoFullscreenApp() {
  const btn = document.getElementById("fullscreenToggleBtn");
  if (!btn) return;
  const active = !!document.fullscreenElement || fullscreenPreferidoApp();
  btn.textContent = active ? "Sair do fullscreen" : "Entrar em fullscreen";
  btn.classList.toggle("is-active", active);
}

async function pedirFullscreenApp(showMessage = true) {
  const root = document.documentElement;
  if (document.fullscreenElement) {
    if (showMessage) mostrarMensagem("Fullscreen ativo.");
    atualizarBotaoFullscreenApp();
    return true;
  }

  if (!root.requestFullscreen) {
    if (showMessage) mostrarMensagem("Instala a APP no ecra inicial para fullscreen no Android.", "erro");
    atualizarBotaoFullscreenApp();
    return false;
  }

  try {
    await root.requestFullscreen({ navigationUI: "hide" });
    if (showMessage) mostrarMensagem("Fullscreen ativo.");
    atualizarBotaoFullscreenApp();
    return true;
  } catch (error) {
    console.warn("Erro fullscreen:", error);
    if (showMessage) mostrarMensagem("Toca outra vez para ativar fullscreen.", "erro");
    atualizarBotaoFullscreenApp();
    return false;
  }
}

function initFullscreenPreferidoApp() {
  atualizarBotaoFullscreenApp();
  document.addEventListener("fullscreenchange", atualizarBotaoFullscreenApp);
  if (!fullscreenPreferidoApp() || document.fullscreenElement) return;
  window.setTimeout(() => pedirFullscreenApp(false), 800);
}

function setNotificationTokenStatus(text, state = "warn") {
  const node = document.getElementById("notifyTokenStatus");
  if (!node) return;
  node.textContent = text;
  node.className = `health-status ${state}`;
}

function setNotificationDeviceDiagnostic(text) {
  const node = document.getElementById("notifyDeviceDiagnostic");
  if (node) node.textContent = text || "Sem diagnostico.";
}

function carregarScriptAppBraga(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      if (window.firebase?.messaging) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function garantirFirebaseMessagingApp() {
  if (!window.isSecureContext) throw new Error("Push Service precisa de HTTPS.");
  if (!("serviceWorker" in navigator)) throw new Error("Service Worker indisponivel neste dispositivo.");
  if (!("PushManager" in window)) throw new Error("Push Service indisponivel neste dispositivo/browser.");
  if (!window.firebase || !firebase.apps?.length) throw new Error("Firebase v8 nao esta carregado.");
  if (!firebase.messaging) {
    await carregarScriptAppBraga("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");
  }
  if (!firebase.messaging) throw new Error("Firebase Messaging indisponível.");
  const supported = firebase.messaging.isSupported ? await Promise.resolve(firebase.messaging.isSupported()) : true;
  if (!supported) throw new Error("Este browser/dispositivo não suporta Firebase Messaging.");
  return firebase.messaging();
}

function getNotificationTokenDocId(token) {
  return encodeURIComponent(String(token || "")).replace(/\./g, "%2E").slice(0, 1400);
}

function hashTextoNotificacoesApp(text) {
  const value = String(text || "");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function urlBase64ToUint8ArrayAppBraga(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function uint8ArrayToBase64UrlAppBraga(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || []);
  let raw = "";
  bytes.forEach((byte) => { raw += String.fromCharCode(byte); });
  return window.btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pushSubscriptionUsaVapidAtualApp(subscription, vapidKey) {
  try {
    const currentKey = subscription?.options?.applicationServerKey;
    if (!currentKey) return true;
    return uint8ArrayToBase64UrlAppBraga(currentKey) === String(vapidKey || "").replace(/=+$/g, "");
  } catch {
    return true;
  }
}

function getNotificationSubscriptionDocId(endpoint) {
  return `standard-web-push-${hashTextoNotificacoesApp(endpoint || navigator.userAgent || "device")}`;
}

async function registarPushSubscriptionPadraoApp(vapidKey, options = {}) {
  if (!vapidKey || !webPushDisponivelApp()) return null;
  await registarServiceWorkerAppBraga();
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (subscription && (options.forceReset || !pushSubscriptionUsaVapidAtualApp(subscription, vapidKey))) {
    const oldEndpoint = subscription.endpoint;
    try { await subscription.unsubscribe(); } catch {}
    if (oldEndpoint && window.db?.collection) {
      await window.db.collection("notificationTokens").doc(getNotificationSubscriptionDocId(oldEndpoint)).set({
        active: false,
        disabledAt: Date.now(),
        disabledReason: options.forceReset ? "mobile-reregisto-manual" : "vapid-key-changed"
      }, { merge: true });
    }
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8ArrayAppBraga(vapidKey)
    });
  }

  const json = subscription.toJSON ? subscription.toJSON() : subscription;
  const endpoint = json.endpoint || subscription.endpoint;
  if (!endpoint || !window.db?.collection) return null;

  const docId = getNotificationSubscriptionDocId(endpoint);
  const deviceKey = getNotificationDeviceKeyApp();
  appNotificationState.pushSubscriptionEndpoint = endpoint;
  appNotificationState.restoredTokenDocId = docId;
  await window.db.collection("notificationTokens").doc(docId).set({
    active: true,
    source: "standard-web-push",
    pushSubscription: json,
    endpoint,
    keys: json.keys || {},
    p256dh: json.keys?.p256dh || "",
    auth: json.keys?.auth || "",
    appVersion: APP_VERSION,
    deviceKey,
    deviceName: labelDispositivoNotificacaoApp({ deviceType: getNotificationDeviceTypeApp() }),
    deviceType: getNotificationDeviceTypeApp(),
    userAgent: navigator.userAgent,
    platform: navigator.platform || "",
    permission: "Notification" in window ? Notification.permission : "unsupported",
    pushAvailable: true,
    vapidPublicKey: vapidKey,
    ...getNotificationDeviceProfilePayloadApp(),
    updatedAt: Date.now(),
    createdAt: Date.now()
  }, { merge: true });
  await desativarRegistosAntigosDispositivoApp(docId, deviceKey);
  return { docId, endpoint };
}

async function registarFcmWebPushApp(vapidKey) {
  const messaging = await garantirFirebaseMessagingApp();
  const registration = await navigator.serviceWorker.ready;
  const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Firebase nao devolveu token.");

  const docId = getNotificationTokenDocId(token);
  const deviceKey = getNotificationDeviceKeyApp();
  appNotificationState.fcmToken = token;
  appNotificationState.restoredTokenDocId = appNotificationState.restoredTokenDocId || docId;
  await window.db.collection("notificationTokens").doc(docId).set({
    token,
    active: true,
    source: "web-push-fcm",
    appVersion: APP_VERSION,
    deviceKey,
    deviceName: labelDispositivoNotificacaoApp({ deviceType: getNotificationDeviceTypeApp() }),
    deviceType: getNotificationDeviceTypeApp(),
    userAgent: navigator.userAgent,
    platform: navigator.platform || "",
    permission: "Notification" in window ? Notification.permission : "unsupported",
    pushAvailable: true,
    ...getNotificationDeviceProfilePayloadApp(),
    updatedAt: Date.now(),
    createdAt: Date.now()
  }, { merge: true });
  return { docId, token };
}

function webPushDisponivelApp() {
  return !!(window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window);
}

function isIosAppBraga() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalonePwaAppBraga() {
  return !!(
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
    window.navigator.standalone === true
  );
}

async function gravarDiagnosticoPushApp(data = {}) {
  try {
    if (!window.db?.collection) return;
    const id = getLocalNotificationDeviceIdApp("push-diagnostic");
    await window.db.collection("notificationDiagnostics").doc(id).set({
      appVersion: APP_VERSION,
      deviceType: getNotificationDeviceTypeApp(),
      ios: isIosAppBraga(),
      standalone: isStandalonePwaAppBraga(),
      pushAvailable: webPushDisponivelApp(),
      permission: "Notification" in window ? Notification.permission : "unsupported",
      userAgent: navigator.userAgent || "",
      updatedAt: Date.now(),
      ...data
    }, { merge: true });
  } catch (error) {
    console.warn("Nao foi possivel gravar diagnostico push:", error);
  }
}

function getNotificationDeviceTypeApp() {
  if (window.electronAPI?.showNotification) return "pc-electron";
  return window.appBragaDeviceType || (document.body.classList.contains("device-tablet") ? "tablet" : (document.body.classList.contains("device-phone") ? "phone" : "pc"));
}

function getLocalNotificationDeviceIdApp(source = "web-local") {
  return `${source}-${encodeURIComponent(navigator.platform || "device")}-${hashTextoNotificacoesApp(navigator.userAgent || "")}`;
}

function getNotificationDeviceKeyApp() {
  return `device-${hashTextoNotificacoesApp([
    navigator.platform || "",
    navigator.userAgent || "",
    getNotificationDeviceTypeApp()
  ].join("|"))}`;
}

function inferNotificationDeviceRoleApp() {
  if (window.electronAPI?.showNotification) return "pc-casa";
  if (isIosAppBraga()) return "iphone";
  if (/android/i.test(navigator.userAgent || "") || document.body.classList.contains("device-tablet")) return "tablet-android";
  return "pc-trabalho";
}

function labelNotificationDeviceRoleApp(role = "") {
  const map = {
    "pc-casa": "PC de casa",
    "pc-trabalho": "PC de trabalho",
    "tablet-android": "Tablet Android",
    iphone: "iPhone",
    outro: "Outro dispositivo"
  };
  return map[role] || "Dispositivo";
}

function getNotificationDeviceProfileApp() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(APP_BRAGA_DEVICE_PROFILE_STORAGE_KEY) || "{}") || {};
  } catch {
    stored = {};
  }
  const role = stored.role || inferNotificationDeviceRoleApp();
  const fallbackName = labelNotificationDeviceRoleApp(role);
  return {
    role,
    name: String(stored.name || fallbackName).trim() || fallbackName,
    deviceKey: getNotificationDeviceKeyApp()
  };
}

function setNotificationDeviceProfileApp(profile = {}) {
  const role = profile.role || inferNotificationDeviceRoleApp();
  const name = String(profile.name || labelNotificationDeviceRoleApp(role)).trim() || labelNotificationDeviceRoleApp(role);
  const data = { role, name, deviceKey: getNotificationDeviceKeyApp(), updatedAt: Date.now() };
  try {
    localStorage.setItem(APP_BRAGA_DEVICE_PROFILE_STORAGE_KEY, JSON.stringify(data));
  } catch {}
  return data;
}

function getNotificationDeviceProfilePayloadApp() {
  const profile = getNotificationDeviceProfileApp();
  return {
    notificationDeviceRole: profile.role,
    notificationDeviceName: profile.name,
    deviceRole: profile.role,
    deviceName: profile.name
  };
}

async function guardarPerfilDispositivoFirestoreApp(profile = getNotificationDeviceProfileApp()) {
  if (!window.db?.collection) return;
  await window.db.collection("notificationDeviceProfiles").doc(getNotificationDeviceKeyApp()).set({
    ...profile,
    appVersion: APP_VERSION,
    deviceType: getNotificationDeviceTypeApp(),
    platform: navigator.platform || "",
    userAgent: navigator.userAgent || "",
    updatedAt: Date.now()
  }, { merge: true });
}

async function aplicarPerfilDispositivoARegistosPushApp(profile = getNotificationDeviceProfileApp()) {
  if (!window.db?.collection) return;
  const snapshot = await window.db.collection("notificationTokens").where("deviceKey", "==", getNotificationDeviceKeyApp()).get();
  const batch = window.db.batch();
  let changes = 0;
  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    if (data.deviceKey !== getNotificationDeviceKeyApp()) return;
    batch.set(doc.ref, {
      notificationDeviceRole: profile.role,
      notificationDeviceName: profile.name,
      deviceRole: profile.role,
      deviceName: profile.name,
      updatedAt: Date.now()
    }, { merge: true });
    changes += 1;
  });
  if (changes) await batch.commit();
}

async function desativarRegistosAntigosDispositivoApp(currentDocId, deviceKey) {
  try {
    if (!window.db?.collection || !deviceKey) return;
    const snapshot = await window.db.collection("notificationTokens").where("deviceKey", "==", deviceKey).get();
    const batch = window.db.batch();
    let changes = 0;
    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      const sameDevice = data.deviceKey === deviceKey ||
        (!data.deviceKey && data.userAgent === navigator.userAgent && data.deviceType === getNotificationDeviceTypeApp());
      if (!sameDevice || doc.id === currentDocId || data.active === false) return;
      batch.set(doc.ref, {
        active: false,
        disabledAt: Date.now(),
        disabledReason: "substituido-por-registo-atual"
      }, { merge: true });
      changes += 1;
    });
    if (changes) await batch.commit();
  } catch (error) {
    console.warn("Nao foi possivel limpar registos antigos deste dispositivo:", error);
  }
}

function normalizeTimestampApp(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTimestampApp(value) {
  const time = normalizeTimestampApp(value);
  if (!time) return "-";
  return new Date(time).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function labelDispositivoNotificacaoApp(item = {}) {
  if (item.notificationDeviceName || item.deviceName) return item.notificationDeviceName || item.deviceName;
  if (item.notificationDeviceRole || item.deviceRole) return labelNotificationDeviceRoleApp(item.notificationDeviceRole || item.deviceRole);
  const type = String(item.deviceType || item.platform || "").toLowerCase();
  if (type.includes("electron")) return "PC Electron";
  if (type.includes("phone")) return "iPhone / Telemovel";
  if (type.includes("tablet")) return "Tablet";
  if (type.includes("pc")) return "PC Web";
  return "Dispositivo";
}

function labelMetodoNotificacaoApp(item = {}) {
  if (item.source === "electron-native") return "Electron nativo";
  if (item.pushSubscription?.endpoint) return "Web Push standard";
  if (item.token) return "Firebase FCM";
  if (item.source === "web-local-no-push") return "Local sem push cloud";
  return item.source || "Registo local";
}

function setNotificationServiceText(id, value, state = "") {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = value;
  if (state) node.className = `health-status ${state}`;
}

function formatStartedAtApp(value) {
  const time = normalizeTimestampApp(value);
  if (!time) return "-";
  return new Date(time).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function renderResumoDispositivosNotificacoesApp(items = []) {
  const activeItems = items.filter((item) => item.active !== false);
  const remoteItems = activeItems.filter((item) => item.token || item.pushSubscription?.endpoint);
  setNotificationServiceText("notifyActiveDevicesCount", String(activeItems.length), activeItems.length ? "ok" : "warn");
  const remoteText = `${remoteItems.length} com push remoto`;
  setNotificationServiceText("notifyActiveDevicesDetail", activeItems.length ? remoteText : "Sem dispositivos registados");
}

function atualizarDiagnosticoDispositivoNotificacoesApp(items = []) {
  const activeItems = items.filter((item) => item.active !== false);
  const currentItem = activeItems.find((item) => item.id === appNotificationState.restoredTokenDocId ||
    (appNotificationState.fcmToken && item.token === appNotificationState.fcmToken) ||
    (appNotificationState.pushSubscriptionEndpoint && (item.endpoint === appNotificationState.pushSubscriptionEndpoint || item.pushSubscription?.endpoint === appNotificationState.pushSubscriptionEndpoint)));
  const permission = notificationPermissionApp();
  const isIos = isIosAppBraga();
  const isStandalone = isStandalonePwaAppBraga();
  const isElectronNative = currentItem?.source === "electron-native";
  const hasRemotePush = !!(currentItem?.token || currentItem?.pushSubscription?.endpoint);
  const hasStandardPush = !!currentItem?.pushSubscription?.endpoint;
  const parts = [
    `Permissao: ${permission}`,
    `Push: ${webPushDisponivelApp() ? "disponivel" : "indisponivel"}`,
    `PWA: ${isStandalone ? "sim" : "nao"}`
  ];

  if (currentItem) {
    parts.push(isElectronNative ? "PC Electron: registo nativo/local" : (hasRemotePush ? "registo remoto OK" : "registo apenas local"));
  } else if (permission === "granted" || permission === "electron") {
    parts.push("carrega em Reparar registo");
  }

  if (isIos && !isStandalone) {
    parts.push("iPhone: abrir pelo icone do ecra principal");
  } else if (isIos && !hasStandardPush) {
    parts.push("iPhone: falta Web Push standard neste dispositivo");
  }

  setNotificationDeviceDiagnostic(parts.join(" | "));
}

async function atualizarEstadoNotificacoesApp(showMessage = false) {
  const service = document.getElementById("notifyServiceStatus");
  if (!service) return;

  async function renderElectronBridgeStatus() {
    if (!window.electronAPI?.getNotificationStatus) return false;
    const status = await window.electronAPI.getNotificationStatus().catch(() => null);
    if (!status) return false;
    const readiness = status.pushReadiness || {};
    const bridgeReady = status.webPushBridgeReady === true;
    setNotificationServiceText("notifyServiceStatus", bridgeReady ? "Ponte Electron" : "Electron incompleto", bridgeReady ? "ok" : "warn");
    setNotificationServiceText("notifyServiceDetail", bridgeReady ? "PC Electron pronto para enviar Web Push" : "Guarda a VAPID publica e privada neste PC");
    setNotificationServiceText("notifyCredentialsStatus", bridgeReady ? "Chaves OK" : "Faltam chaves", bridgeReady ? "ok" : "warn");
    setNotificationServiceText("notifyCredentialsDetail", bridgeReady
      ? "VAPID local guardada no Electron"
      : `Publica: ${readiness.vapidPublicReady ? "OK" : "falta"} - Privada: ${readiness.vapidPrivateReady ? "OK" : "falta"}`);
    return true;
  }

  if (await renderElectronBridgeStatus()) {
    if (showMessage) mostrarMensagem("Estado da ponte Electron atualizado.");
    return;
  }

  async function renderCloudFunctionsStatus() {
    if (!window.db?.collection) return false;
    const doc = await window.db.collection("config").doc("cloudNotifications").get().catch(() => null);
    const data = doc?.exists ? doc.data() || {} : null;
    if (!data) return false;
    const standardReady = data.standardWebPushReady !== false;
    setNotificationServiceText("notifyServiceStatus", "Cloud Functions", "ok");
    setNotificationServiceText("notifyServiceDetail", data.lastRunAt ? `Ultimo envio: ${formatTimestampApp(data.lastRunAt)}` : "Ativo no Firebase");
    setNotificationServiceText("notifyCredentialsStatus", standardReady ? "Web Push OK" : "Falta Web Push", standardReady ? "ok" : "bad");
    setNotificationServiceText("notifyCredentialsDetail", standardReady
      ? `Firebase ${data.region || "europe-west1"} - enviados: ${data.lastSent ?? 0} - falhas: ${data.lastFailed ?? 0}`
      : "Firebase sem secrets VAPID privadas: iPhone nao recebe push remoto.");
    if (!standardReady && isIosAppBraga()) {
      setNotificationDeviceDiagnostic("iPhone precisa de Web Push standard: configurar secrets VAPID privadas nas Cloud Functions.");
    }
    return true;
  }

  if (await renderCloudFunctionsStatus()) {
    if (showMessage) mostrarMensagem("Cloud Functions de notificacoes ativo.");
    return;
  }

  const permission = notificationPermissionApp();
  const ok = permission === "granted";
  setNotificationServiceText("notifyServiceStatus", ok ? "Web pronta" : "Permissão pendente", ok ? "ok" : "warn");
  setNotificationServiceText("notifyServiceDetail", ok ? "A aguardar primeiro envio das Cloud Functions" : "Ativa as notificações neste dispositivo");
  setNotificationServiceText("notifyCredentialsStatus", appNotificationState.vapidKey ? "VAPID OK" : "Falta VAPID", appNotificationState.vapidKey ? "ok" : "warn");
  setNotificationServiceText("notifyCredentialsDetail", "Cloud Functions envia as notificacoes no Firebase");
  if (showMessage) mostrarMensagem(ok ? "Notificacoes web prontas." : "Ativa permissoes e regista o dispositivo.", ok ? "sucesso" : "erro");
}

async function ligarServicoNotificacoesApp() {
  if (window.electronAPI?.sendWebPushBroadcast) {
    const ok = await iniciarPontePushElectronApp(true);
    if (ok) return;
  }
  mostrarMensagem("O envio remoto corre nas Firebase Cloud Functions.", "sucesso");
  await atualizarEstadoNotificacoesApp(false);
}

async function importarServiceAccountNotificacoesApp() {
  if (!window.electronAPI?.importServiceAccount) {
    mostrarMensagem("A app desktop instalada precisa de atualizar para importar automaticamente o service-account.json.", "erro");
    return;
  }
  const result = await window.electronAPI.importServiceAccount().catch((error) => ({ ok: false, error: error.message }));
  if (result?.canceled) return;
  if (!result?.ok) {
    mostrarMensagem(result?.error || "Nao foi possivel importar o service-account.json.", "erro");
    return;
  }
  setNotificationDeviceDiagnostic(`Service account importada para: ${result.path}`);
  mostrarMensagem("Service account importada. O envio remoto fica a cargo das Cloud Functions.", "sucesso");
  await atualizarEstadoNotificacoesApp(true);
}

async function configurarVapidPrivadaNotificacoesApp() {
  if (!window.electronAPI?.setPushVapidKeys) {
    mostrarMensagem("A app desktop instalada precisa de atualizar para guardar a VAPID privada.", "erro");
    return;
  }
  const publicKey = resolveVapidPublicKeyApp(document.getElementById("notifyVapidKey")?.value || appNotificationState.vapidKey || APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY || "");
  const input = document.getElementById("notifyVapidPrivateKey");
  const privateKey = String(input?.value || "").trim();
  if (!privateKey) {
    mostrarMensagem("Cola primeiro a VAPID privada.", "erro");
    return;
  }
  if (!publicKey) {
    mostrarMensagem("Cola primeiro a VAPID publica.", "erro");
    return;
  }
  await guardarConfigNotificacoesApp({ notificationEnabled: true, notificationVapidKey: publicKey });
  const result = await window.electronAPI.setPushVapidKeys({
    publicKey,
    privateKey,
    subject: "mailto:admin@appbraga.pt"
  }).catch((error) => ({ ok: false, error: error.message }));
  if (!result?.ok) {
    mostrarMensagem(result?.error || "Nao foi possivel guardar a VAPID privada.", "erro");
    return;
  }
  setNotificationDeviceDiagnostic(`VAPID privada guardada neste PC. Ficheiro local: ${result.path}`);
  if (input) input.value = "";
  mostrarMensagem("VAPID privada configurada neste PC.", "sucesso");
  await iniciarPontePushElectronApp(false);
  await atualizarEstadoNotificacoesApp(true);
}

function toggleVapidPrivadaVisivelApp() {
  const input = document.getElementById("notifyVapidPrivateKey");
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
}

function renderDispositivosNotificacoesApp(items = []) {
  const host = document.getElementById("notifyDevicesList");
  if (!host) return;

  const sortedActive = items
    .filter((item) => item.active !== false)
    .sort((a, b) => normalizeTimestampApp(b.updatedAt || b.createdAt) - normalizeTimestampApp(a.updatedAt || a.createdAt));
  const uniqueMap = new Map();
  sortedActive.forEach((item) => {
    const key = item.deviceKey || `${item.deviceType || ""}|${item.platform || ""}|${hashTextoNotificacoesApp(item.userAgent || item.id || "")}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, item);
  });
  const activeItems = Array.from(uniqueMap.values());
  renderResumoDispositivosNotificacoesApp(activeItems);
  atualizarDiagnosticoDispositivoNotificacoesApp(activeItems);
  atualizarEstadoNotificacoesApp(false);

  if (!activeItems.length) {
    host.innerHTML = `<div class="empty-state mini">Ainda nao ha dispositivos ativos.</div>`;
    return;
  }

  host.innerHTML = activeItems.map((item) => {
    const isCurrent = item.id === appNotificationState.restoredTokenDocId ||
      (appNotificationState.fcmToken && item.token === appNotificationState.fcmToken) ||
      (appNotificationState.pushSubscriptionEndpoint && (item.endpoint === appNotificationState.pushSubscriptionEndpoint || item.pushSubscription?.endpoint === appNotificationState.pushSubscriptionEndpoint));
    const device = labelDispositivoNotificacaoApp(item);
    const permission = item.permission || "sem dados";
    const mode = labelMetodoNotificacaoApp(item);
    const updated = formatTimestampApp(item.updatedAt || item.createdAt);
    const ready = item.source === "electron-native" || item.token || item.pushSubscription?.endpoint;
    const keyOk = !item.vapidPublicKey || item.vapidPublicKey === APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY;
    return `
      <div class="notification-device-card ${isCurrent ? "is-current" : ""}">
        <div>
          <strong>${escapeHtmlAppBraga(device)}</strong>
          <span>${escapeHtmlAppBraga(mode)} - ${escapeHtmlAppBraga(permission)}</span>
          <small>Ultimo contacto: ${escapeHtmlAppBraga(updated)}${keyOk ? "" : " - reparar VAPID"}</small>
        </div>
        <span class="health-status ${ready && keyOk ? "ok" : "warn"}">${isCurrent ? "Este dispositivo" : (ready ? (keyOk ? "Registado" : "Reparar") : "Local")}</span>
      </div>
    `;
  }).join("");
}

function carregarDispositivosNotificacoesApp(force = false) {
  const host = document.getElementById("notifyDevicesList");
  if (!host || !window.db?.collection) return;
  if (appNotificationState.devicesUnsubscribe && !force) return;
  if (appNotificationState.devicesUnsubscribe && force) {
    appNotificationState.devicesUnsubscribe();
    appNotificationState.devicesUnsubscribe = null;
  }

  appNotificationState.devicesUnsubscribe = window.db.collection("notificationTokens").onSnapshot((snapshot) => {
    const items = [];
    snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
    renderDispositivosNotificacoesApp(items);
  }, (error) => {
    console.error("Erro ao carregar dispositivos:", error);
    host.innerHTML = `<div class="empty-state mini">Erro ao carregar dispositivos.</div>`;
  });
}

function isPaginaNotificacoesCloudApp() {
  return /notificacoes\.html$/i.test(location.pathname || "");
}

function setCloudNotificationTextApp(id, text, statusClass = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "";
  if (statusClass) {
    el.classList.remove("ok", "warn", "bad");
    el.classList.add(statusClass);
  }
}

function setCloudNotificationDiagnosticApp(text, type = "") {
  const el = document.getElementById("cloudNotificationDiagnostic");
  if (el) {
    el.textContent = text || "";
    el.classList.remove("ok", "warn", "bad");
    if (type) el.classList.add(type);
  }
  if (text && typeof setNotificationDeviceDiagnostic === "function") setNotificationDeviceDiagnostic(text);
}

function cloudNotificationSettingsRefApp() {
  if (!window.db?.collection) return null;
  return window.db.collection(APP_BRAGA_NOTIFICATION_CONFIG_COLLECTION).doc(APP_BRAGA_NOTIFICATION_CLOUD_DOC);
}

function readCloudNotificationFormApp() {
  const enabled = document.getElementById("cloudNotifyEnabled")?.checked === true;
  return {
    enabled,
    notificationEnabled: enabled,
    vapidPublicKey: resolveVapidPublicKeyApp(document.getElementById("cloudVapidPublic")?.value || appNotificationState.vapidKey || APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY || ""),
    vapidPrivateKey: String(document.getElementById("cloudVapidPrivate")?.value || "").trim(),
    vapidSubject: String(document.getElementById("cloudVapidSubject")?.value || APP_BRAGA_DEFAULT_VAPID_SUBJECT).trim() || APP_BRAGA_DEFAULT_VAPID_SUBJECT,
    alerts: {
      tonerZero: document.getElementById("cloudAlertTonerZero")?.checked !== false,
      tonerLow25: document.getElementById("cloudAlertTonerLow")?.checked !== false,
      tonerChange: document.getElementById("cloudAlertTonerChange")?.checked !== false,
      stockMin: document.getElementById("cloudAlertStock")?.checked !== false,
      maintenance: document.getElementById("cloudAlertMaintenance")?.checked !== false,
      radios: document.getElementById("cloudAlertRadios")?.checked !== false
    }
  };
}

function applyCloudNotificationFormApp(settings = {}) {
  const alerts = settings.alerts || {};
  const setChecked = (id, value, fallback = true) => {
    const el = document.getElementById(id);
    if (el) el.checked = typeof value === "undefined" ? fallback : value === true;
  };
  setChecked("cloudNotifyEnabled", settings.enabled ?? settings.notificationEnabled, true);
  const publicInput = document.getElementById("cloudVapidPublic");
  const privateInput = document.getElementById("cloudVapidPrivate");
  const subjectInput = document.getElementById("cloudVapidSubject");
  if (publicInput) publicInput.value = settings.vapidPublicKey || settings.notificationVapidKey || APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY || "";
  if (privateInput) privateInput.value = settings.vapidPrivateKey ? String(settings.vapidPrivateKey) : "";
  if (subjectInput) subjectInput.value = settings.vapidSubject || APP_BRAGA_DEFAULT_VAPID_SUBJECT;
  setChecked("cloudAlertTonerZero", alerts.tonerZero ?? settings.notificationTonerZero, true);
  setChecked("cloudAlertTonerLow", alerts.tonerLow25 ?? settings.notificationTonerLow25, true);
  setChecked("cloudAlertTonerChange", alerts.tonerChange ?? settings.notificationTonerChange, true);
  setChecked("cloudAlertStock", alerts.stockMin ?? settings.notificationStockMin, true);
  setChecked("cloudAlertMaintenance", alerts.maintenance ?? settings.notificationMaintenance, true);
  setChecked("cloudAlertRadios", alerts.radios ?? settings.notificationRadios, true);
  appNotificationState.vapidKey = resolveVapidPublicKeyApp(settings.vapidPublicKey || settings.notificationVapidKey || APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY || "");
}

function atualizarRececaoEsperadaDispositivoApp() {
  const field = document.getElementById("cloudDeviceExpected");
  if (!field) return;
  const role = document.getElementById("cloudDeviceRole")?.value || getNotificationDeviceProfileApp().role;
  if (role === "pc-casa") field.value = "Gestao + pode receber quando app/segundo plano estiver ativo";
  else if (role === "pc-trabalho") field.value = "Cliente limitado; nao guardar chaves privadas";
  else if (role === "tablet-android") field.value = "Web Push standard esperado";
  else if (role === "iphone") field.value = "Web Push standard so pela app no ecra principal";
  else field.value = "Rececao conforme suporte do dispositivo";
}

function applyDeviceProfileFormApp() {
  const profile = getNotificationDeviceProfileApp();
  const nameInput = document.getElementById("cloudDeviceName");
  const roleInput = document.getElementById("cloudDeviceRole");
  if (nameInput) nameInput.value = profile.name || "";
  if (roleInput) {
    roleInput.value = profile.role || inferNotificationDeviceRoleApp();
    roleInput.onchange = atualizarRececaoEsperadaDispositivoApp;
  }
  atualizarRececaoEsperadaDispositivoApp();
}

function readDeviceProfileFormApp() {
  const role = document.getElementById("cloudDeviceRole")?.value || inferNotificationDeviceRoleApp();
  const name = document.getElementById("cloudDeviceName")?.value || labelNotificationDeviceRoleApp(role);
  return setNotificationDeviceProfileApp({ role, name });
}

async function guardarIdentidadeDispositivoNotificacoesApp(showMessage = true) {
  try {
    const profile = readDeviceProfileFormApp();
    await guardarPerfilDispositivoFirestoreApp(profile);
    await aplicarPerfilDispositivoARegistosPushApp(profile);
    applyDeviceProfileFormApp();
    setCloudNotificationDiagnosticApp(`Identidade guardada: ${profile.name}.`, "ok");
    if (showMessage) mostrarMensagem("Identidade do dispositivo guardada.", "sucesso");
    carregarDispositivosCloudNotificacoesApp(true);
    return profile;
  } catch (error) {
    setCloudNotificationDiagnosticApp(error.message || "Erro ao guardar identidade do dispositivo.", "bad");
    if (showMessage) mostrarMensagem(error.message || "Erro ao guardar identidade.", "erro");
    return null;
  }
}

function renderCloudDevicesNotificacoesApp(items = []) {
  const host = document.getElementById("cloudDevicesList");
  if (!host) return;
  const sortedActive = items
    .filter((item) => item.active !== false)
    .sort((a, b) => normalizeTimestampApp(b.updatedAt || b.createdAt) - normalizeTimestampApp(a.updatedAt || a.createdAt));
  const uniqueMap = new Map();
  sortedActive.forEach((item) => {
    const key = item.deviceKey || item.pushSubscription?.endpoint || item.token || item.id;
    if (!uniqueMap.has(key)) uniqueMap.set(key, item);
  });
  const activeItems = Array.from(uniqueMap.values());
  const webPushItems = activeItems.filter((item) => item.pushSubscription?.endpoint);
  setCloudNotificationTextApp("cloudDevicesStatus", `${activeItems.length} registados`, activeItems.length ? "ok" : "warn");
  setCloudNotificationTextApp("cloudDevicesDetail", `${webPushItems.length} com Web Push standard pronto para cloud`);
  if (activeItems.length && !webPushItems.length) {
    setCloudNotificationDiagnosticApp("A cloud nao tem nenhum alvo Web Push standard. No Android/iPhone abre a app instalada e carrega em Reparar este dispositivo.", "warn");
  }

  if (!activeItems.length) {
    host.innerHTML = `<div class="empty-state mini">Ainda nao ha dispositivos registados.</div>`;
    return;
  }

  host.innerHTML = activeItems.map((item) => {
    const isCurrent = item.id === appNotificationState.restoredTokenDocId ||
      (appNotificationState.fcmToken && item.token === appNotificationState.fcmToken) ||
      (appNotificationState.pushSubscriptionEndpoint && (item.endpoint === appNotificationState.pushSubscriptionEndpoint || item.pushSubscription?.endpoint === appNotificationState.pushSubscriptionEndpoint));
    const device = labelDispositivoNotificacaoApp(item);
    const role = labelNotificationDeviceRoleApp(item.notificationDeviceRole || item.deviceRole || "");
    const mode = labelMetodoNotificacaoApp(item);
    const permission = item.permission || "sem dados";
    const updated = formatTimestampApp(item.updatedAt || item.createdAt);
    const ready = !!item.pushSubscription?.endpoint;
    return `
      <div class="notification-device-card ${isCurrent ? "is-current" : ""}">
        <div>
          <strong>${escapeHtmlAppBraga(device)}</strong>
          <span>${escapeHtmlAppBraga(role)} - ${escapeHtmlAppBraga(mode)} - ${escapeHtmlAppBraga(permission)}</span>
          <small>Ultimo contacto: ${escapeHtmlAppBraga(updated)}</small>
        </div>
        <span class="health-status ${ready ? "ok" : "warn"}">${isCurrent ? (ready ? "Este dispositivo OK" : "Este dispositivo sem cloud") : (ready ? "Cloud pronto" : "Reparar")}</span>
      </div>
    `;
  }).join("");
}

function carregarDispositivosCloudNotificacoesApp(force = false) {
  const host = document.getElementById("cloudDevicesList");
  if (!host || !window.db?.collection) return;
  if (appNotificationState.devicesUnsubscribe && force) {
    appNotificationState.devicesUnsubscribe();
    appNotificationState.devicesUnsubscribe = null;
  }
  if (appNotificationState.devicesUnsubscribe) return;
  appNotificationState.devicesUnsubscribe = window.db.collection("notificationTokens").onSnapshot((snapshot) => {
    const items = [];
    snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
    renderCloudDevicesNotificacoesApp(items);
  }, (error) => {
    console.error("Erro ao carregar dispositivos cloud:", error);
    host.innerHTML = `<div class="empty-state mini">Erro ao carregar dispositivos.</div>`;
  });
}

async function carregarCloudNotificacoesApp() {
  const ref = cloudNotificationSettingsRefApp();
  if (!ref) {
    setCloudNotificationTextApp("cloudNotifyStatus", "Sem Firebase", "bad");
    setCloudNotificationDiagnosticApp("Firebase indisponivel nesta pagina.", "bad");
    return null;
  }
  const doc = await ref.get();
  const settings = doc.exists ? (doc.data() || {}) : {};
  if (!doc.exists) {
    settings.enabled = true;
    settings.vapidPublicKey = APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY;
    settings.vapidSubject = APP_BRAGA_DEFAULT_VAPID_SUBJECT;
    settings.alerts = { tonerZero: true, tonerLow25: true, tonerChange: true, stockMin: true, maintenance: true, radios: true };
  }
  applyCloudNotificationFormApp(settings);
  const hasPublic = !!resolveVapidPublicKeyApp(settings.vapidPublicKey || settings.notificationVapidKey || APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY || "");
  const hasPrivate = !!String(settings.vapidPrivateKey || "").trim();
  setCloudNotificationTextApp("cloudNotifyStatus", settings.enabled === false ? "Desligado" : "Ativo", settings.enabled === false ? "warn" : "ok");
  setCloudNotificationTextApp("cloudNotifyDetail", "Envio principal: Firebase Cloud Functions");
  setCloudNotificationTextApp("cloudCredentialsStatus", hasPublic && hasPrivate ? "Completas" : "Falta chave", hasPublic && hasPrivate ? "ok" : "bad");
  setCloudNotificationTextApp("cloudCredentialsDetail", hasPrivate ? "VAPID privada guardada na Firebase" : "Guarda a VAPID privada nesta pagina");
  return settings;
}

async function guardarCloudNotificacoesApp() {
  try {
    const ref = cloudNotificationSettingsRefApp();
    if (!ref) throw new Error("Firebase indisponivel.");
    const form = readCloudNotificationFormApp();
    if (!form.vapidPublicKey) throw new Error("Cola a VAPID publica.");
    if (!form.vapidPrivateKey) throw new Error("Cola a VAPID privada.");
    const payload = {
      ...form,
      updatedAt: Date.now(),
      updatedByDevice: getNotificationDeviceTypeApp(),
      updatedByKey: getNotificationDeviceKeyApp(),
      appVersion: APP_VERSION
    };
    await ref.set(payload, { merge: true });
    await guardarConfigNotificacoesApp({
      notificationEnabled: form.enabled,
      notificationVapidKey: form.vapidPublicKey,
      notifyTonerZero: form.alerts.tonerZero,
      notifyTonerLow25: form.alerts.tonerLow25,
      notifyTonerChange: form.alerts.tonerChange,
      notifyStockMin: form.alerts.stockMin,
      notifyMaintenance: form.alerts.maintenance,
      notifyRadios: form.alerts.radios
    });
    appNotificationState.vapidKey = form.vapidPublicKey;
    setCloudNotificationDiagnosticApp("Cloud guardada. Agora regista cada dispositivo nesta pagina.", "ok");
    mostrarMensagem("Configuracao cloud guardada.", "sucesso");
    await carregarCloudNotificacoesApp();
  } catch (error) {
    setCloudNotificationDiagnosticApp(error.message || "Erro ao guardar cloud.", "bad");
    mostrarMensagem(error.message || "Erro ao guardar cloud.", "erro");
  }
}

async function repararDispositivoNotificacoesCloudApp() {
  try {
    await guardarIdentidadeDispositivoNotificacoesApp(false);
    const settings = await carregarCloudNotificacoesApp();
    const vapidKey = resolveVapidPublicKeyApp(settings?.vapidPublicKey || document.getElementById("cloudVapidPublic")?.value || APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY || "");
    if (!vapidKey) throw new Error("Guarda primeiro a VAPID publica.");
    await registarDispositivoPushApp(true, { vapidKey });
    await aplicarPerfilDispositivoARegistosPushApp(getNotificationDeviceProfileApp());
    setCloudNotificationDiagnosticApp("Dispositivo reparado/registado para a cloud.", "ok");
    carregarDispositivosCloudNotificacoesApp(true);
  } catch (error) {
    setCloudNotificationDiagnosticApp(error.message || "Erro ao reparar dispositivo.", "bad");
    mostrarMensagem(error.message || "Erro ao reparar dispositivo.", "erro");
  }
}

function getCloudPushFunctionUrlApp() {
  return "https://europe-west1-toner-manager-756c4.cloudfunctions.net/sendPushAlert";
}

function resumoResultadoPushCloudApp(result = {}) {
  const enviados = Number(result.sentDevices ?? result.sent ?? 0);
  const falhados = Number(result.failed ?? 0);
  const ignorados = Number(result.ignored ?? 0);
  const webPush = Number(result.standardWebPushSent ?? result.standardWebPushTargets ?? 0);
  const fcm = Number(result.fcmSent ?? result.fcmTargets ?? 0);
  const total = Number(result.totalDevices ?? 0);
  const alvo = Number(result.targetDevices ?? 0);
  const partes = [
    `enviados: ${enviados}`,
    `falhados: ${falhados}`,
    `ignorados: ${ignorados}`,
    `Web Push: ${webPush}`,
    `FCM: ${fcm}`
  ];
  if (total || alvo) partes.push(`dispositivos: ${alvo}/${total}`);
  return partes.join(" | ");
}

function erroResultadoPushCloudApp(result = {}) {
  const errors = Array.isArray(result.errors) ? result.errors : [];
  const firstError = errors.find((item) => item?.message)?.message || "";
  return result.error || firstError || "A cloud respondeu sem enviar push.";
}

async function chamarCloudPushNotificacoesApp(payload = {}) {
  const response = await fetch(getCloudPushFunctionUrlApp(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  let result = {};
  try {
    result = await response.json();
  } catch (error) {
    result = { error: await response.text().catch(() => "") };
  }
  if (!response.ok || result.ok === false) {
    const err = new Error(erroResultadoPushCloudApp(result));
    err.result = result;
    throw err;
  }
  return result;
}

async function criarPedidoPushFirestoreNotificacoesApp(payload = {}) {
  const requestRef = await window.db.collection("notificationRequests").add({
    ...payload,
    status: "created",
    forceCloud: true,
    createdAt: payload.createdAt || Date.now()
  });
  return await aguardarResultadoPedidoPushRemotoApp(requestRef, payload.createdAt || Date.now());
}

async function enviarCloudPushNotificacoesApp(payload = {}) {
  try {
    return await chamarCloudPushNotificacoesApp(payload);
  } catch (error) {
    if (error.result) throw error;
    console.warn("Cloud Function HTTP indisponivel, a tentar trigger Firestore:", error);
    if (!window.db?.collection) throw error;
    const fallback = await criarPedidoPushFirestoreNotificacoesApp(payload);
    if (Number(fallback?.sent || fallback?.sentDevices || 0) <= 0) {
      const finalError = new Error(erroResultadoPushCloudApp(fallback) || error.message);
      finalError.result = fallback;
      throw finalError;
    }
    return fallback;
  }
}

async function testarCloudNotificacoesApp() {
  try {
    if (!window.db?.collection) throw new Error("Firebase indisponivel.");
    const settings = await carregarCloudNotificacoesApp();
    if (!settings || settings.enabled === false) throw new Error("Ativa primeiro as notificacoes cloud.");
    if (!settings.vapidPublicKey || !settings.vapidPrivateKey) throw new Error("Guarda a VAPID publica e privada antes do teste.");
    setCloudNotificationTextApp("cloudLastTestStatus", "A enviar", "warn");
    setCloudNotificationTextApp("cloudLastTestDetail", "A chamar Firebase Cloud Functions");
    const startedAt = Date.now();
    const currentDevice = await obterDispositivoAtualNotificacoesApp().catch(() => null);
    const result = await enviarCloudPushNotificacoesApp({
      title: "App Braga",
      body: "Teste cloud recebido. Funciona mesmo com o PC de casa desligado.",
      tag: `cloud-test-${startedAt}`,
      event: "manual-remote-test",
      url: "https://picafern-commits.github.io/App-Tablet/html/notificacoes.html",
      source: "app-cloud-page",
      createdAt: startedAt,
      requestedFrom: getNotificationDeviceTypeApp(),
      requestedDeviceKey: getNotificationDeviceKeyApp(),
      requestedDeviceDocId: currentDevice?.id || "",
      excludeDeviceKey: getNotificationDeviceKeyApp(),
      excludeDeviceId: currentDevice?.id || ""
    });
    const ok = Number(result?.sent || result?.sentDevices || 0) > 0;
    setCloudNotificationTextApp("cloudLastTestStatus", ok ? "Enviado" : "Falhou", ok ? "ok" : "bad");
    setCloudNotificationTextApp("cloudLastTestDetail", ok ? resumoResultadoPushCloudApp(result) : `${erroResultadoPushCloudApp(result)} | ${resumoResultadoPushCloudApp(result)}`);
    mostrarMensagem(ok ? "Teste cloud enviado." : erroResultadoPushCloudApp(result), ok ? "sucesso" : "erro");
    carregarDispositivosCloudNotificacoesApp(true);
  } catch (error) {
    const result = error.result || {};
    const message = error.message || erroResultadoPushCloudApp(result) || "Teste cloud falhou.";
    setCloudNotificationTextApp("cloudLastTestStatus", "Erro", "bad");
    setCloudNotificationTextApp("cloudLastTestDetail", `${message}${Object.keys(result).length ? ` | ${resumoResultadoPushCloudApp(result)}` : ""}`);
    setCloudNotificationDiagnosticApp(message, "bad");
    mostrarMensagem(message, "erro");
  }
}

async function enviarAlertaGeralNotificacoesApp() {
  try {
    if (!window.db?.collection) throw new Error("Firebase indisponível.");
    const settings = await carregarCloudNotificacoesApp();
    if (!settings || settings.enabled === false) throw new Error("Ativa primeiro as notificações cloud.");

    const currentDevice = await obterDispositivoAtualNotificacoesApp().catch(() => null);
    const deviceName = document.getElementById("cloudDeviceName")?.value || currentDevice?.deviceName || currentDevice?.name || labelDispositivoNotificacaoApp(currentDevice || {}) || "Dispositivo";
    const messageInput = document.getElementById("cloudGeneralAlertMessage");
    const customMessage = String(messageInput?.value || "").trim();
    const startedAt = Date.now();
    const body = customMessage || `Alerta geral enviado por ${deviceName}.`;

    setCloudNotificationTextApp("cloudLastTestStatus", "A enviar alerta", "warn");
    setCloudNotificationTextApp("cloudLastTestDetail", "A chamar Firebase Cloud Functions para os outros dispositivos");

    const result = await enviarCloudPushNotificacoesApp({
      title: "🚨 Alerta geral - App Braga",
      body,
      tag: `alerta-geral-${startedAt}`,
      event: "manual-general-alert",
      url: "https://picafern-commits.github.io/App-Tablet/html/notificacoes.html",
      source: "app-cloud-alert",
      requireInteraction: true,
      createdAt: startedAt,
      requestedBy: deviceName,
      requestedFrom: getNotificationDeviceTypeApp(),
      requestedDeviceKey: getNotificationDeviceKeyApp(),
      requestedDeviceDocId: currentDevice?.id || "",
      excludeDeviceKey: getNotificationDeviceKeyApp(),
      excludeDeviceId: currentDevice?.id || "",
      alertType: "general"
    });

    const ok = Number(result?.sent || result?.sentDevices || 0) > 0;
    setCloudNotificationTextApp("cloudLastTestStatus", ok ? "Alerta enviado" : "Alerta falhou", ok ? "ok" : "bad");
    setCloudNotificationTextApp("cloudLastTestDetail", ok ? resumoResultadoPushCloudApp(result) : `${erroResultadoPushCloudApp(result)} | ${resumoResultadoPushCloudApp(result)}`);
    mostrarMensagem(ok ? "Alerta geral enviado para os outros dispositivos." : erroResultadoPushCloudApp(result), ok ? "sucesso" : "erro");
    if (messageInput) messageInput.value = "";
    carregarDispositivosCloudNotificacoesApp(true);
  } catch (error) {
    const result = error.result || {};
    const message = error.message || erroResultadoPushCloudApp(result) || "Alerta geral falhou.";
    setCloudNotificationTextApp("cloudLastTestStatus", "Erro", "bad");
    setCloudNotificationTextApp("cloudLastTestDetail", `${message}${Object.keys(result).length ? ` | ${resumoResultadoPushCloudApp(result)}` : ""}`);
    setCloudNotificationDiagnosticApp(message, "bad");
    mostrarMensagem(message, "erro");
  }
}

async function atualizarPaginaNotificacoesCloudApp(showMessage = false) {
  if (!isPaginaNotificacoesCloudApp()) return;
  applyDeviceProfileFormApp();
  if (!window.db?.collection) {
    setCloudNotificationTextApp("cloudNotifyStatus", "Sem Firebase", "bad");
    setTimeout(() => atualizarPaginaNotificacoesCloudApp(showMessage), 700);
    return;
  }
  await carregarCloudNotificacoesApp();
  carregarDispositivosCloudNotificacoesApp(true);
  const current = await obterDispositivoAtualNotificacoesApp().catch(() => null);
  if (current?.pushSubscription?.endpoint) {
    setCloudNotificationDiagnosticApp("Este dispositivo esta registado com Web Push standard.", "ok");
  } else {
    setCloudNotificationDiagnosticApp("Abre esta pagina no dispositivo e carrega em Reparar este dispositivo.", "warn");
  }
  if (showMessage) mostrarMensagem("Notificacoes atualizadas.", "sucesso");
}

function inicializarPaginaNotificacoesCloudApp() {
  if (!isPaginaNotificacoesCloudApp()) return;
  atualizarPaginaNotificacoesCloudApp(false);
}

async function restaurarRegistoPushAtualApp() {
  if (appNotificationState.restoreRunning || !window.db?.collection) return;
  appNotificationState.restoreRunning = true;
  try {
    if (window.electronAPI?.showNotification) {
      const docId = "electron-native";
      const doc = await window.db.collection("notificationTokens").doc(docId).get();
      if (doc.exists && doc.data()?.active !== false) {
        appNotificationState.restoredTokenDocId = docId;
        await window.db.collection("notificationTokens").doc(docId).set({
          active: true,
          appVersion: APP_VERSION,
          deviceType: "pc-electron",
          permission: "native",
          ...getNotificationDeviceProfilePayloadApp(),
          updatedAt: Date.now()
        }, { merge: true });
        setNotificationTokenStatus("Electron registado", "ok");
      }
      return;
    }

    const permission = "Notification" in window ? Notification.permission : "unsupported";
    if (permission !== "granted") {
      setNotificationTokenStatus(permission === "denied" ? "Permissão bloqueada" : "Sem permissão", permission === "denied" ? "bad" : "warn");
      return;
    }

    const vapidKey = resolveVapidPublicKeyApp(appNotificationState.vapidKey || document.getElementById("notifyVapidKey")?.value || APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY || "");
    if (vapidKey && webPushDisponivelApp()) {
      let restored = false;
      try {
        restored = !!(await registarPushSubscriptionPadraoApp(vapidKey));
      } catch (error) {
        console.warn("Web Push standard indisponivel:", error);
      }
      try {
        restored = !!(await registarFcmWebPushApp(vapidKey)) || restored;
      } catch (error) {
        console.warn("FCM Web Push indisponivel:", error);
      }
      if (restored) {
        setNotificationTokenStatus("Registado", "ok");
        return;
      }
    }

    const localId = getLocalNotificationDeviceIdApp("web-local-no-push");
    const localDoc = await window.db.collection("notificationTokens").doc(localId).get();
    if (localDoc.exists && localDoc.data()?.active !== false) {
      appNotificationState.restoredTokenDocId = localId;
      await window.db.collection("notificationTokens").doc(localId).set({
        active: true,
        appVersion: APP_VERSION,
        deviceType: getNotificationDeviceTypeApp(),
        permission,
        ...getNotificationDeviceProfilePayloadApp(),
        updatedAt: Date.now()
      }, { merge: true });
      setNotificationTokenStatus("Local ativo", "warn");
    }
  } catch (error) {
    console.warn("Não foi possível restaurar registo push:", error);
  } finally {
    appNotificationState.restoreRunning = false;
    carregarDispositivosNotificacoesApp(false);
  }
}

async function registarDispositivoLocalNotificacoesApp(source = "web-local") {
  await guardarConfigNotificacoesApp({ notificationEnabled: true, notificationVapidKey: appNotificationState.vapidKey });
  if (window.db?.collection) {
    const id = getLocalNotificationDeviceIdApp(source);
    const deviceKey = getNotificationDeviceKeyApp();
    appNotificationState.restoredTokenDocId = id;
    await window.db.collection("notificationTokens").doc(id).set({
      active: true,
      source,
      appVersion: APP_VERSION,
      deviceKey,
      deviceName: labelDispositivoNotificacaoApp({ deviceType: getNotificationDeviceTypeApp() }),
      deviceType: getNotificationDeviceTypeApp(),
      userAgent: navigator.userAgent,
      platform: navigator.platform || "",
      permission: "Notification" in window ? Notification.permission : "unsupported",
      pushAvailable: webPushDisponivelApp(),
      ...getNotificationDeviceProfilePayloadApp(),
      updatedAt: Date.now(),
      createdAt: Date.now()
    }, { merge: true });
    await desativarRegistosAntigosDispositivoApp(id, deviceKey);
  }
  setNotificationTokenStatus("Local ativo", "warn");
  await enviarNotificacaoApp("App Braga", "Notificacoes locais ativas neste dispositivo.", `${source}-register`, { force: true });
  mostrarMensagem("Push remoto indisponivel; notificacoes locais ativadas.");
}

async function registarDispositivoPushApp(forceReset = false, options = {}) {
  try {
    if (!window.db || !window.db.collection) throw new Error("Firestore indisponivel.");
    const vapidKey = resolveVapidPublicKeyApp(options.vapidKey || document.getElementById("cloudVapidPublic")?.value || document.getElementById("notifyVapidKey")?.value || appNotificationState.vapidKey || APP_BRAGA_DEFAULT_VAPID_PUBLIC_KEY || "");
    setNotificationDeviceDiagnostic(`Permissao: ${notificationPermissionApp()} | Push: ${webPushDisponivelApp() ? "disponivel" : "indisponivel"} | PWA: ${isStandalonePwaAppBraga() ? "sim" : "nao"} | iOS: ${isIosAppBraga() ? "sim" : "nao"}`);

    // Nao fazemos return aqui no Electron: ele tambem precisa de um token/endpoint Web Push
    // para receber pela cloud sem depender do PC ligado ou de watcher local.

    if (!vapidKey) {
      mostrarMensagem("Coloca primeiro a VAPID key do Firebase.", "erro");
      setNotificationTokenStatus("Falta VAPID key", "bad");
      return;
    }

    await guardarConfigNotificacoesApp({ notificationEnabled: true, notificationVapidKey: vapidKey });
    if (!options.skipPermission) {
      await pedirPermissaoNotificacoesApp({ registerDevice: false });
    }
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    if (!webPushDisponivelApp()) {
      setNotificationDeviceDiagnostic("PushManager indisponivel neste browser/app. No iPhone tem de abrir pelo icone do ecra principal e ter iOS 16.4+.");
      await registarDispositivoLocalNotificacoesApp("web-local-no-push");
      return;
    }

    setNotificationTokenStatus("A registar...", "warn");
    let standardOk = false;
    let fcmOk = false;
    let standardError = "";
    let fcmError = "";

    try {
      standardOk = !!(await registarPushSubscriptionPadraoApp(vapidKey, { forceReset }));
      if (standardOk) await gravarDiagnosticoPushApp({ standardPush: true, standardPushError: "" });
    } catch (error) {
      console.warn("Erro no Web Push standard:", error);
      standardError = error?.message || String(error);
      await gravarDiagnosticoPushApp({
        standardPush: false,
        standardPushError: standardError
      });
    }

    try {
      fcmOk = !!(await registarFcmWebPushApp(vapidKey));
    } catch (error) {
      console.warn("Erro no FCM Web Push:", error);
      fcmError = error?.message || String(error);
    }

    if (!standardOk && !fcmOk) {
      const details = [
        isIosAppBraga() && !isStandalonePwaAppBraga() ? "iPhone nao esta em modo app do ecra principal" : "",
        !webPushDisponivelApp() ? "PushManager indisponivel" : "",
        standardError ? `Web Push: ${standardError}` : "",
        fcmError ? `FCM: ${fcmError}` : ""
      ].filter(Boolean).join(" | ");
      throw new Error(details || "Nenhum servico push remoto ficou disponivel neste dispositivo.");
    }

    await guardarConfigNotificacoesApp({ notificationEnabled: true, notificationVapidKey: vapidKey });
    setNotificationTokenStatus("Registado", "ok");
    setNotificationDeviceDiagnostic(`Registo OK | Web Push standard: ${standardOk ? "sim" : "nao"} | FCM: ${fcmOk ? "sim" : "nao"}`);
    if (isIosAppBraga() && !isStandalonePwaAppBraga()) {
      mostrarMensagem("No iPhone, abre a APP pelo ecra principal para receber push com a app fechada.", "erro");
      return;
    }
    if (isIosAppBraga() && !standardOk) {
      mostrarMensagem("iPhone registado sem Web Push standard. Carrega em Reparar registo depois de abrir a APP pelo ecra principal.", "erro");
      return;
    }
    mostrarMensagem(forceReset ? "Registo de notificacoes reparado neste dispositivo." : (standardOk && fcmOk ? "Dispositivo registado para Web Push e FCM." : "Dispositivo registado para push."));
  } catch (error) {
    console.error("Erro ao registar push:", error);
    setNotificationTokenStatus("Erro no registo", "bad");
    setNotificationDeviceDiagnostic(error?.message || "Erro desconhecido no registo push.");
    const code = String(error?.code || "");
    const message = String(error?.message || "");
    let friendly = message || "Erro ao registar push.";
    if (code.includes("messaging/permission-blocked")) friendly = "As notificacoes estao bloqueadas neste dispositivo/browser.";
    if (code.includes("messaging/unsupported-browser")) friendly = "Este browser/dispositivo nao suporta Firebase Cloud Messaging.";
    if (code.includes("messaging/invalid-vapid-key")) friendly = "A VAPID key nao e valida. Confirma a chave Web Push no Firebase.";
    if (code.includes("messaging/token-subscribe-failed")) friendly = "Falhou a subscricao push. Confirma permissoes e a VAPID key.";
    if (message.toLowerCase().includes("push service")) {
      await registarDispositivoLocalNotificacoesApp("web-local-no-push");
      return;
    }
    mostrarMensagem(friendly, "erro");
  }
}

async function obterTonerInfo(ip) {
  try {
    if (!window.electronAPI || !window.electronAPI.getTonerSNMP) return null;
    const resposta = await window.electronAPI.getTonerSNMP(ip);

    if (resposta && resposta.ok) {
      return {
        colors: Array.isArray(resposta.colors) ? resposta.colors : [],
        residue: resposta.residue || null,
        percent: typeof resposta.percent === "number" ? resposta.percent : null
      };
    }

    if (window.electronAPI.getPrinterHTML) {
      const htmlResp = await window.electronAPI.getPrinterHTML(ip);
      if (htmlResp && htmlResp.ok && htmlResp.body) {
        const percent = extrairPercentagemTonerDoHTML(htmlResp.body);
        return { colors: [{ key: "black", label: "Preto", percent }], residue: null };
      }
    }
    return null;
  } catch (error) {
    console.error("Erro ao obter toner da impressora:", error);
    return null;
  }
}

async function testarTonerImpressora(ip, outputId) {
  const output = el(outputId);
  if (output) {
    output.innerHTML = `
      <div class="printer-toner-box">
        <div class="printer-toner-head">
          <span class="printer-toner-title">Consumíveis</span>
          <span class="printer-toner-status is-muted">A testar</span>
        </div>
        <div class="printer-toner-bar-wrap">
          <div class="printer-toner-bar" style="width:35%;"></div>
        </div>
        <div class="printer-toner-foot">
          <span class="printer-toner-value">...</span>
        </div>
      </div>
    `;
  }

  const info = await obterTonerInfo(ip);
  tonerInfoState[ip] = info || null;

  if (output) output.innerHTML = gerarHTMLToners(info);
  if (info) maybeNotifyCriticalSupply(ip, info);
  updateTonerDiagnosticStatus(info ? "ok" : "error", { running: false, lastRunAt: new Date(), successCount: info ? 1 : 0, totalCount: 1, source: resolveDiagSource() });
  pushTonerDiagnosticLog(ip, info ? summarizeTonerInfo(info) : "sem resposta");
  renderDashboardCards();
}

async function testarTodasAsImpressoras() {
  for (const item of impressorasData) {
    const alvoId = `toner-${item.ip.replace(/\./g, "-")}`;

    if (el(alvoId)) {
      await testarTonerImpressora(item.ip, alvoId);
    } else {
      const info = await obterTonerInfo(item.ip);
      tonerInfoState[item.ip] = info || null;
      if (info) maybeNotifyCriticalSupply(item.ip, info);
    }
  }

  renderDashboardCards();
}

window.testarTonerImpressora = testarTonerImpressora;


function filtrarHistoricoPorImpressora(item) {
  const serie = String(item.serie || "");
  const loc = String(item.localizacao || "");
  const arm = String(item.armazem || "");

  return historicoGlobal.filter(h => {
    const hLoc = String(h.localizacao || "");
    const hEq = String(h.equipamento || "");
    return hLoc.includes(serie) ||
      hLoc.includes(loc) ||
      (hLoc.includes(arm) && hLoc.includes(loc)) ||
      normalizarTexto(hEq).includes(normalizarTexto(item.modelo));
  });
}

function abrirHistoricoImpressora(item) {
  const host = el("historicoImpressoraPanel");
  if (!host) return;

  const itens = filtrarHistoricoPorImpressora(item);
  const ultimo = itens[0] || null;

  host.innerHTML = `
    <div class="printer-history-card">
      <div class="section-header">
        <div>
          <h3>${item.modelo} - ${item.serie}</h3>
          <p class="section-subtitle">${item.armazem} ? ${item.localizacao}</p>
        </div>
      </div>

      <div class="history-mini-grid">
        <div class="summary-card">
          <h4>Total de Toners</h4>
          <div class="summary-value">${itens.length}</div>
        </div>
        <div class="summary-card">
          <h4>?ltimo Registo</h4>
          <div class="meta-line">${ultimo ? `${ultimo.cor || "-"} ? ${ultimo.data || "Sem Data"}` : "Sem registos"}</div>
        </div>
      </div>

      <div class="printer-history-items">
        ${itens.length ? itens.slice(0,8).map(h => `
          <div class="printer-history-item">
            <div class="meta-line">ID: <span class="meta-value">${h.idInterno || "-"}</span></div>
            <div class="meta-line">Cor: <span class="meta-value">${h.cor || "-"}</span></div>
            <div class="meta-line">Data: <span class="meta-value">${h.data || "Sem Data"}</span></div>
            <div class="meta-line">Localização: <span class="meta-value">${h.localizacao || "Sem Localização"}</span></div>
          </div>
        `).join("") : `<div class="panel empty-state"><h3>Sem histórico para esta impressora</h3><p>Quando houver movimentos associados, aparecem aqui.</p></div>`}
      </div>
    </div>
  `;
}

function guardarImpressorasLocal() {
  try {
    impressorasData.forEach((item, i) => { if (!item._ref) item._ref = item.idDoc || `local-impressora-${i}`; });
    localStorage.setItem(IMPRESSORAS_STORAGE_KEY, JSON.stringify(impressorasData.map(i => ({ ...i }))));
  } catch (e) { console.warn('Nao foi possivel guardar impressoras no localStorage.', e); }
}

function carregarImpressorasLocal() {
  try {
    const raw = localStorage.getItem(IMPRESSORAS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return;
    parsed.forEach((item, i) => { if (!item._ref) item._ref = item.idDoc || `local-impressora-${i}`; });
    impressorasData.splice(0, impressorasData.length, ...parsed);
  } catch (e) { console.warn('Nao foi possivel carregar impressoras do localStorage.', e); }
}

function renderImpressoras(lista = impressorasData) {
  const tbody = el("impressorasTableBody");
  if (!tbody) return;

  const total = impressorasData.length;
  const ok = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "OK").length;
  const problema = impressorasData.filter(i => {
    const e = obterEstadoImpressora(i.ip);
    return e === "Pendente" || e === "Em reparação";
  }).length;
  const resolvidas = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "Resolvido").length;

  setText("countImpressoras", total);
  setText("countImpressorasOk", ok);
  setText("countImpressorasProblema", problema);
  setText("countImpressorasResolvidas", resolvidas);

  tbody.innerHTML = lista.map((item, index) => {
    const estado = obterEstadoImpressora(item.ip);
    const tonerId = `toner-${item.ip.replace(/\./g, "-")}`;

    return `
      <tr>
        <td>${item.modelo}</td>
        <td>${item.serie}</td>
        <td>${item.armazem}</td>
        <td>${item.localizacao}</td>
        <td><a href="http://${item.ip}" target="_blank" rel="noopener noreferrer">${item.ip}</a></td>
        <td>${badgeEstado(estado)}</td>
        <td>
          <div id="${tonerId}">${gerarHTMLBarraToner(null)}</div>
          <div class="table-actions" style="margin-top:8px;">
            <button class="action-btn ip" onclick="abrirIP('${item.ip}')">Abrir IP</button>
            <button class="action-btn manut" onclick='abrirManutencaoDireta(${JSON.stringify(item)})'>Manutenção</button>
            <button class="action-btn" onclick='abrirHistoricoImpressora(${JSON.stringify(item)})'>Histórico</button>
            <button class="action-btn" onclick="window.testarTonerImpressora('${item.ip}', '${tonerId}')">Testar toner</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function filtrarImpressoras() {
  const texto = normalizarTexto(el("searchImpressoras")?.value || "");
  const armazem = el("filterArmazem")?.value || "";
  const estado = el("filterEstadoImpressora")?.value || "";

  const filtrada = impressorasData.filter(item => {
    const estadoAtual = obterEstadoImpressora(item.ip);

    const passaTexto =
      normalizarTexto(item.modelo).includes(texto) ||
      normalizarTexto(item.serie).includes(texto) ||
      normalizarTexto(item.ip).includes(texto) ||
      normalizarTexto(item.localizacao).includes(texto) ||
      normalizarTexto(item.armazem).includes(texto);

    const passaArmazem = !armazem || item.armazem === armazem;
    const passaEstado = !estado || estadoAtual === estado;

    return passaTexto && passaArmazem && passaEstado;
  });

  renderImpressoras(filtrada);
}

/* =========================
   PISTOLAS - EMPRESA EXTREMO
========================= */
function badgePistolaReserva(valor) {
 
  return String(valor || "")
    .toLowerCase()
    .includes("reserva")
 
    ? `<span class="badge reserva">Reserva</span>`
 
    : `<span class="badge ok">Ativa</span>`;
 
}

function renderPistolas(lista = window.pistolasData) {

  lista = Array.isArray(lista) ? lista : [];


 
  lista = Array.isArray(lista) ? lista : [];
 
  lista.sort((a,b)=>{
 
    const aTxt =
      String(
        a.nome ||
        a.codigo ||
        a.numero ||
        a.num ||
        ""
      )
      .toLowerCase()
      .trim();
 
    const bTxt =
      String(
        b.nome ||
        b.codigo ||
        b.numero ||
        b.num ||
        ""
      )
      .toLowerCase()
      .trim();
 
    return aTxt.localeCompare(
      bTxt,
      'pt',
      {
        numeric:true,
        sensitivity:'base'
      }
    );
 
  });
 
  
  setText("countPistolas", lista.length);

  setText(
    "countPistolasBraga",
    lista.filter(p =>
      String(p.armazem || "")
        .toLowerCase()
        .includes("braga")
    ).length
  );

  setText(
    "countPistolasReserva",
    lista.filter(p =>
      String(p.operador || "")
        .toLowerCase()
        .includes("reserva")
    ).length
  );

 
  const container = document.querySelector("#listaPistolas");
 
  if (!container) return;
 
  container.innerHTML = lista.map((p, index) => {
 
	const ref = "'" + (p.idDoc || ("local-pistola-" + index)) + "'";
 
    return `
    <div class="pc-card">

      <div class="pc-name">${p.nome || "-"}</div>
 
      <div class="meta-line">
        N?:
        <span class="meta-value">${p.num || "-"}</span>
      </div>
 
      <div class="meta-line">
        Password:
        <span class="meta-value">${p.password || "-"}</span>
      </div>
 
      <div class="meta-line">
        CN:
        <span class="meta-value">${p.cn || "-"}</span>
      </div>
 
      <div class="meta-line">
        SN:
        <span class="meta-value">${p.sn || "-"}</span>
      </div>
 
      <div class="meta-line">
        MAC:
        <span class="meta-value">${p.mac || "-"}</span>
      </div>
 
      <div class="meta-line">
        Operador:
        <span class="meta-value">${p.operador || "-"}</span>
      </div>
 
      <div class="meta-line">
        Armazém:
        <span class="meta-value">${p.armazem || "-"}</span>
      </div>
 
      <div class="meta-line">
        Prontas:
        <span class="meta-value">${p.prontas || "-"}</span>
      </div>
 
      <div class="meta-line">
        Estado:
        <span class="meta-value">
          ${badgePistolaReserva(p.operador)}
        </span>
      </div>
 
      <div class="item-actions">
        <button class="secondary-btn" onclick="editarPistola(${ref})">
          Editar
        </button>
 
        <button class="secondary-btn" onclick="apagarPistola(${ref})">
          Apagar
        </button>
      </div>
 
    </div>
    `;
 
  }).join("");

 renderUsers(filtrado);
}	
	
function filtrarUsersComFiltros() {
  const texto = el("searchUsers")?.value || "";
  filtrarUsers(texto);
}

/* =========================
   PORTAS - EMPRESA EXTREMO
========================= */
function estadoPorta(porta) {
  const temIP = normalizarTexto(porta.ip) !== "";
  const temUser = normalizarTexto(porta.user) !== "";

  if (!temIP && !temUser) return "livre";
  if (temIP && temUser) return "ocupado";
  if (temIP && !temUser) return "semUser";
  return "livre";
}

function badgePorta(estado) {
  if (estado === "ocupado") return `<span class="badge ocupado">Ocupado</span>`;
  if (estado === "livre") return `<span class="badge livre">Livre</span>`;
  if (estado === "semUser") return `<span class="badge aviso">Sem user</span>`;
  return `<span class="badge">-</span>`;
}

function atualizarContadoresPortas(lista = window.portasData) {
  let total = lista.length;
  let usadas = 0;
  let livres = 0;
  let semUser = 0;

  lista.forEach(porta => {
    const estado = estadoPorta(porta);
    if (estado === "ocupado") usadas++;
    if (estado === "livre") livres++;
    if (estado === "semUser") semUser++;
  });

  setText("countPortas", total);
  setText("countPortasUsadas", usadas);
  setText("countPortasLivres", livres);
  setText("countPortasSemUser", semUser);
}

function renderPortas(lista = window.portasData) {
  const container = el("listaPortas");
  if (!container) return;

  atualizarContadoresPortas(lista);

  container.innerHTML = lista.map((p, index) => {
    const estado = estadoPorta(p);
    const ref = p.idDoc ? `'${p.idDoc}'` : `'${p._ref || `local-porta-${window.portasData.indexOf(p)}`}'`;
    return `
      <div class="pc-card">
        <div class="pc-name">Porta ${p.porta || "-"}</div>
        <div class="meta-line">Local: <span class="meta-value">${p.local || "-"}</span></div>
        <div class="meta-line">User: <span class="meta-value">${p.user || "-"}</span></div>
        <div class="meta-line">Equipamento: <span class="meta-value">${p.equipamento || "-"}</span></div>
        <div class="meta-line">IP: <span class="meta-value">${p.ip ? `<a href="http://${p.ip}" target="_blank">${p.ip}</a>` : "-"}</span></div>
        <div class="meta-line">Estado: <span class="meta-value">${badgePorta(estado)}</span></div>
        <div class="item-actions">
          ${equipmentFichaLinkAppBraga("porta", p, index, "local-porta")}
          <button
            class="secondary-btn"
            onclick="editarPorta(${ref})">
            Editar
          </button>
          <button class="secondary-btn" onclick="apagarPorta(${ref})">Apagar</button>
        </div>
      </div>
    `;
  }).join("");
}

function filtrarPortas(txt = "") {
  const texto = normalizarTexto(txt);
  const estadoSelecionado = normalizarTexto(el("filterEstadoPortas")?.value || "");

  const filtradas = window.portasData.filter(p => {
    const passaTexto =
      normalizarTexto(p.porta).includes(texto) ||
      normalizarTexto(p.local).includes(texto) ||
      normalizarTexto(p.user).includes(texto) ||
      normalizarTexto(p.ip).includes(texto);

    const passaEstado = !estadoSelecionado || estadoPorta(p) === estadoSelecionado;

    return passaTexto && passaEstado;
  });

  renderPortas(filtradas);
}

function filtrarPortasComEstado() {
  const texto = el("searchPortas")?.value || "";
  filtrarPortas(texto);
}


const PISTOLAS_STORAGE_KEY = 'appbraga_pistolas_custom_v1';
const PORTAS_STORAGE_KEY = 'appbraga_portas_custom_v1';

function prepararRefsPistolas() {
  window.pistolasData.forEach((p, i) => {
    if (!p.idDoc && !p._ref) p._ref = `local-pistola-${i}`;
  });
}

function guardarPistolasLocal() {
  try {
    const serializavel = window.pistolasData.map(p => ({ ...p }));
    localStorage.setItem(PISTOLAS_STORAGE_KEY, JSON.stringify(serializavel));
  } catch (e) {
    console.warn('Nao foi possivel guardar pistolas no localStorage.', e);
  }
}

function carregarPistolasLocal() {
  try {
    const raw = localStorage.getItem(PISTOLAS_STORAGE_KEY);
    if (!raw) {
      prepararRefsPistolas();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      prepararRefsPistolas();
      return;
    }
    window.pistolasData.splice(0, window.pistolasData.length, ...parsed);
    prepararRefsPistolas();
  } catch (e) {
    console.warn('Nao foi possivel carregar pistolas do localStorage.', e);
    prepararRefsPistolas();
  }
}

function prepararRefsPortas() {
  window.portasData.forEach((p, i) => {
    if (!p.idDoc && !p._ref) p._ref = `local-porta-${i}`;
  });
}

function guardarPortasLocal() {
  try {
    const serializavel = window.portasData.map(p => ({ ...p }));
    localStorage.setItem(PORTAS_STORAGE_KEY, JSON.stringify(serializavel));
  } catch (e) {
    console.warn('Nao foi possivel guardar portas no localStorage.', e);
  }
}

function carregarPortasLocal() {
  try {
    const raw = localStorage.getItem(PORTAS_STORAGE_KEY);
    if (!raw) {
      prepararRefsPortas();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      prepararRefsPortas();
      return;
    }
    window.portasData.splice(0, window.portasData.length, ...parsed);
    prepararRefsPortas();
  } catch (e) {
    console.warn('Nao foi possivel carregar portas do localStorage.', e);
    prepararRefsPortas();
  }
}

/* =========================
   USERS - EMPRESA EXTREMO
========================= */
function utilizadorTemMO365(u) {
  return normalizarTexto(u.user_mo365) !== "";
}

function utilizadorTemPistola(u) {
  return normalizarTexto(u.op_pistola) !== "";
}

function utilizadorTemTeamviewer(u) {
  return normalizarTexto(u.teamviewer) !== "";
}

function badgeUser(valor) {
  return valor ? `<span class="badge ok">Sim</span>` : `<span class="badge livre">Não</span>`;
}

function atualizarContadoresUsers(lista = window.usersData) {
  setText("countUsers", lista.length);
  setText("countUsersMO365", lista.filter(utilizadorTemMO365).length);
  setText("countUsersPistola", lista.filter(utilizadorTemPistola).length);
  setText("countUsersTV", lista.filter(utilizadorTemTeamviewer).length);
}

function renderUsers(lista = window.usersData) {
  const container = el("listaUsers");
  if (!container) return;

  const usersList = Array.isArray(lista) ? [...lista] : [];
  atualizarContadoresUsers(usersList);

usersList.sort((a,b)=>{
 
  const aTxt =
    String(a.nome || "")
      .toLowerCase()
      .trim();
 
  const bTxt =
    String(b.nome || "")
      .toLowerCase()
      .trim();
 
  return aTxt.localeCompare(
    bTxt,
    'pt',
    {
      numeric:true,
      sensitivity:'base'
    }
  );
 
});
  
  container.innerHTML = usersList.length ? usersList.map((u, index) => {
    const refValue = u.idDoc || u.firebaseId || u._ref || `local-user-${index}`;
    const ref = `'${escapeHtmlAppBraga(refValue)}'`;
    return `
    <div class="pc-card">
      <div class="pc-name">${escapeHtmlAppBraga(u.nome || "Sem nome")}</div>
      <div class="meta-line">Zona: <span class="meta-value">${u.zona || "-"}</span></div>
      <div class="meta-line">User PC/EYE: <span class="meta-value">${u.user_pc_eye || "-"}</span></div>
      <div class="meta-line">Pass Remote: <span class="meta-value">${u.pass_remote || "-"}</span></div>
      <div class="meta-line">Pass Eye Peak: <span class="meta-value">${u.pass_eye_peak || "-"}</span></div>
      <div class="meta-line">Op. Pistola: <span class="meta-value">${u.op_pistola || "-"}</span></div>
      <div class="meta-line">Pass Pistola: <span class="meta-value">${u.pass_pistola || "-"}</span></div>
      <div class="meta-line">Nome PC: <span class="meta-value">${u.nome_pc || "-"}</span></div>
      <div class="meta-line">TeamViewer: <span class="meta-value">${u.teamviewer || "-"}</span></div>
      <div class="meta-line">User MO365: <span class="meta-value">${u.user_mo365 || "-"}</span></div>
      <div class="meta-line">Pw MO365: <span class="meta-value">${u.pw_mo365 || "-"}</span></div>
      <div class="meta-line">Email Bragalis: <span class="meta-value">${u.email_bragalis || "-"}</span></div>
      <div class="meta-line">Pass Bragalis: <span class="meta-value">${u.pass_bragalis || "-"}</span></div>
      <div class="item-actions">
        ${equipmentFichaLinkAppBraga("user", u, index, "local-user")}
        <button class="secondary-btn" onclick="editarUser(${ref})">Editar</button>
		<button class="secondary-btn" onclick='imprimirUser(${JSON.stringify(u)})'>Imprimir Dados</button>
        <button class="secondary-btn" onclick="apagarUser(${ref})">Apagar</button>
      </div>
    </div>
  `;
  }).join("") : `<div class="reference-empty">Sem users carregados da Firebase.</div>`;
}

function filtrarUsers(txt = "") {
  const texto = normalizarTexto(txt);
  const filtroMO365 = normalizarTexto(el("filterUsersMO365")?.value || "");
  const filtroPistola = normalizarTexto(el("filterUsersPistola")?.value || "");

  const filtrado = window.usersData.filter(u => {
    const passaTexto =
      normalizarTexto(u.nome).includes(texto) ||
      normalizarTexto(u.zona).includes(texto) ||
      normalizarTexto(u.user_pc_eye).includes(texto) ||
      normalizarTexto(u.pass_remote).includes(texto) ||
      normalizarTexto(u.pass_eye_peak).includes(texto) ||
      normalizarTexto(u.op_pistola).includes(texto) ||
      normalizarTexto(u.pass_pistola).includes(texto) ||
      normalizarTexto(u.nome_pc).includes(texto) ||
      normalizarTexto(u.teamviewer).includes(texto) ||
      normalizarTexto(u.user_mo365).includes(texto) ||
      normalizarTexto(u.pw_mo365).includes(texto) ||
      normalizarTexto(u.email_bragalis).includes(texto) ||
      normalizarTexto(u.pass_bragalis).includes(texto);

    let passaMO365 = true;
    if (filtroMO365 === "sim") passaMO365 = utilizadorTemMO365(u);
    if (filtroMO365 === "nao") passaMO365 = !utilizadorTemMO365(u);

    let passaPistola = true;
    if (filtroPistola === "sim") passaPistola = utilizadorTemPistola(u);
    if (filtroPistola === "nao") passaPistola = !utilizadorTemPistola(u);

    return passaTexto && passaMO365 && passaPistola;
  });

  renderUsers(filtrado);
}

function filtrarUsersComFiltros() {
  const texto = el("searchUsers")?.value || "";
  filtrarUsers(texto);
}

function applyAppTheme(mode) {
  const isDark = mode !== "light";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("app-dark", isDark);
  document.documentElement.classList.toggle("app-light", !isDark);
  document.body.classList.toggle("dark", isDark);
  document.body.classList.toggle("app-dark", isDark);
  document.body.classList.toggle("app-light", !isDark);

  document.querySelectorAll(".theme-toggle").forEach((button) => {
    button.textContent = isDark ? "Modo claro" : "Modo escuro";
    button.setAttribute("aria-pressed", String(isDark));
  });

  const sw = el("darkSwitch");
  if (sw) sw.checked = isDark;
}

function initGlobalTheme() {
  applyAppTheme("dark");
  if (window.AppThemePro) {
    window.AppThemePro.apply(window.AppThemePro.getCachedTheme(), { persist: false });
    window.AppThemePro.bindControls?.();
    window.AppThemePro.connectFirestore?.();
  }

  const sidebar = document.querySelector(".sidebar");
  if (sidebar && !document.querySelector(".theme-toggle")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.addEventListener("click", () => {
      applyAppTheme("dark");
    });

    const brand = sidebar.querySelector(".brand, .premium-brand, .brand-block");
    if (brand && brand.parentNode) {
      brand.insertAdjacentElement("afterend", button);
    } else {
      sidebar.insertBefore(button, sidebar.firstChild);
    }
  }

  if (sidebar && !sidebar.querySelector(".sidebar-user-card")) {
    const footer = document.createElement("div");
    footer.className = "sidebar-user-card";
    footer.innerHTML = `
      <div class="sidebar-user-avatar">BR</div>
      <div>
        <strong>Administrador</strong>
        <span>admin@appbraga.pt</span>
      </div>
    `;
    sidebar.appendChild(footer);
  }

  const sw = el("darkSwitch");
  if (sw && !sw.dataset.themeBound) {
    sw.dataset.themeBound = "1";
    sw.addEventListener("change", () => {
      applyAppTheme("dark");
    });
  }

  applyAppTheme("dark");
}

function aplicarResolucaoApp(mode = "comfortable") {
  const value = ["compact", "comfortable", "wide"].includes(mode) ? mode : "comfortable";
  document.body.classList.remove("resolution-compact", "resolution-comfortable", "resolution-wide");
  document.documentElement.classList.remove("resolution-compact", "resolution-comfortable", "resolution-wide");
  document.body.classList.add(`resolution-${value}`);
  document.documentElement.classList.add(`resolution-${value}`);
  const select = document.getElementById("appResolution");
  if (select) select.value = value;
}

const APP_DEFAULT_ACCENT = "#ef4444";
const appSecurityState = {
  pinHash: "",
  pinLength: 0,
  authMethod: "pin",
  biometricEnabled: false,
  biometricCredentialId: "",
  lockTimeoutMinutes: 0,
  unlocked: false,
  timer: null,
  overlay: null,
  autoUnlockTimer: null
};

function normalizarCorApp(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : APP_DEFAULT_ACCENT;
}

function hexToRgbAppBraga(hex) {
  const clean = normalizarCorApp(hex).slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function ajustarCorAppBraga(hex, amount = -28) {
  const rgb = hexToRgbAppBraga(hex);
  const next = [rgb.r, rgb.g, rgb.b].map((value) => Math.max(0, Math.min(255, value + amount)));
  return `#${next.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function getCachedCorApp() {
  if (window.AppThemePro) return window.AppThemePro.getCachedTheme().primary;
  const match = document.cookie.match(/(?:^|;\s*)appAccentColor=([^;]+)/);
  return match ? normalizarCorApp(decodeURIComponent(match[1])) : "";
}

function cacheCorApp(value) {
  const color = normalizarCorApp(value);
  document.cookie = `appAccentColor=${encodeURIComponent(color)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function getCookieAppBraga(name) {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : "";
  } catch (error) {
    return "";
  }
}

function setCookieAppBraga(name, value, maxAgeSeconds = null) {
  try {
  const age = Number.isFinite(maxAgeSeconds) ? `; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}` : "";
  document.cookie = `${name}=${encodeURIComponent(String(value || ""))}${age}; Path=/; SameSite=Lax`;
  } catch (error) {
    console.warn("Cookie indisponível", error);
  }
}

function deleteCookieAppBraga(name) {
  try {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch (error) {
    console.warn("Cookie indisponível", error);
  }
}

function getSessionAppBraga(name) {
  try {
    return window.sessionStorage?.getItem(name) || "";
  } catch (error) {
    return "";
  }
}

function setSessionAppBraga(name, value) {
  try {
    window.sessionStorage?.setItem(name, String(value || ""));
  } catch (error) {
    console.warn("Sess\u00e3o tempor\u00e1ria indispon\u00edvel", error);
  }
}

function deleteSessionAppBraga(name) {
  try {
    window.sessionStorage?.removeItem(name);
  } catch (error) {
    console.warn("Sess\u00e3o tempor\u00e1ria indispon\u00edvel", error);
  }
}

function aplicarCorApp(value = APP_DEFAULT_ACCENT) {
  if (window.AppThemePro) {
    window.AppThemePro.apply({ ...window.AppThemePro.getCachedTheme(), primary: value });
    return;
  }
  const color = normalizarCorApp(value);
  const hover = ajustarCorAppBraga(color, -28);
  const light = ajustarCorAppBraga(color, 34);
  const rgb = hexToRgbAppBraga(color);
  const soft = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .16)`;
  const softer = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .08)`;
  const glow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .28)`;
  const line = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .22)`;
  const vars = {
    "--app-accent": color,
    "--app-accent-hover": hover,
    "--app-accent-light": light,
    "--app-accent-rgb": `${rgb.r} ${rgb.g} ${rgb.b}`,
    "--app-accent-soft": soft,
    "--app-accent-softer": softer,
    "--app-accent-line": line,
    "--app-accent-glow": glow,
    "--az-orange": color,
    "--az-orange-2": hover,
    "--az-orange-soft": soft,
    "--az-line": line,
    "--primary": color,
    "--primary-hover": hover,
    "--sidebar-hover": color,
    "--brinka-pink": color,
    "--brinka-purple": hover,
    "--brinka-orange": color,
    "--brinka-orange2": light,
    "--ent-blue": color,
    "--ent-purple": hover,
    "--ent-orange": color,
    "--app-blue": color,
    "--app-blue-soft": soft
  };
  Object.entries(vars).forEach(([key, val]) => document.documentElement.style.setProperty(key, val));
  const picker = document.getElementById("appAccentColor");
  if (picker) picker.value = color;
}

function initResolucaoApp() {
  aplicarResolucaoApp("comfortable");
  const aplicarLayoutApp = (data = {}) => {
    aplicarResolucaoApp(data.resolution || "comfortable");
    if (window.AppThemePro) {
      window.AppThemePro.apply({
        ...window.AppThemePro.getCachedTheme(),
        ...(data.themePro || {}),
        primary: data.themePro?.primary || data.accentColor || window.AppThemePro.getCachedTheme().primary,
        secondary: data.themePro?.secondary || data.accentColor2 || window.AppThemePro.getCachedTheme().secondary,
        buttonTextMode: data.buttonTextMode || data.themePro?.buttonTextMode || window.AppThemePro.getCachedTheme().buttonTextMode
      });
    } else {
      const accentColor = data.accentColor || getCachedCorApp() || APP_DEFAULT_ACCENT;
      aplicarCorApp(accentColor);
      cacheCorApp(accentColor);
    }
    setCookieAppBraga("appButtonTextMode", data.buttonTextMode || getButtonTextMode(), 31536000);
    if (typeof aplicarModoTextoBotoes === "function") aplicarModoTextoBotoes(data.buttonTextMode || getButtonTextMode());
    aplicarConfigNotificacoesApp(data);
    aplicarSegurancaApp(data.pinHash || "", data.lockTimeoutMinutes || 0, data.pinLength || 0, data.authMethod || "pin", data.biometricEnabled || false, data.biometricCredentialId || "");
  };
  if (!window.__appBragaLayoutEventBound) {
    window.__appBragaLayoutEventBound = true;
    window.addEventListener("appbraga:layout", (event) => aplicarLayoutApp(event.detail || {}));
  }
  if (window.AppThemePro) {
    window.AppThemePro.apply(window.AppThemePro.getCachedTheme(), { persist: false });
    window.AppThemePro.bindControls?.();
    window.AppThemePro.connectFirestore?.();
  } else {
    aplicarCorApp(getCachedCorApp() || APP_DEFAULT_ACCENT);
  }
}

async function guardarResolucaoApp(value) {
  aplicarResolucaoApp(value);
  if (!window.db || !window.db.collection) return;
  try {
    await window.db.collection("config").doc("layout").set({
      resolution: value,
      updatedAt: Date.now()
    }, { merge: true });
    mostrarMensagem("Resolução atualizada.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar resolução.", "erro");
  }
}

async function guardarCorApp(value) {
  if (window.AppThemePro) {
    await window.AppThemePro.save({ ...window.AppThemePro.getCachedTheme(), primary: value });
    return;
  }
  const accentColor = normalizarCorApp(value);
  aplicarCorApp(accentColor);
  cacheCorApp(accentColor);
  if (!window.db || !window.db.collection) return;
  try {
    await window.db.collection("config").doc("layout").set({
      accentColor,
      updatedAt: Date.now()
    }, { merge: true });
    mostrarMensagem("Cor da APP atualizada.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar cor da APP.", "erro");
  }
}

async function guardarTemaApp() {
  if (!window.AppThemePro) return guardarCorApp(getCachedCorApp() || APP_DEFAULT_ACCENT);
  try {
    await window.AppThemePro.save(window.AppThemePro.readControls());
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar tema da APP.", "erro");
  }
}

async function reporTemaApp() {
  if (!window.AppThemePro) return guardarCorApp(APP_DEFAULT_ACCENT);
  try {
    await window.AppThemePro.save(window.AppThemePro.PRESETS.autozitania);
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao repor tema da APP.", "erro");
  }
}

async function hashAppPin(pin) {
  const text = String(pin || "");
  if (!text) return "";
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text);
    const hash = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash) + text.charCodeAt(i);
  return `fallback-${Math.abs(hash)}`;
}

function setLockTimeoutInput(value) {
  const select = document.getElementById("appLockTimeout");
  if (select) select.value = String(Math.max(0, Number(value) || 0));
}

function setAuthMethodInput(value) {
  const select = document.getElementById("appAuthMethod");
  if (select) select.value = ["pin", "biometric", "both"].includes(value) ? value : "pin";
}

function getSecurityTokenApp() {
  return appSecurityState.pinHash || appSecurityState.biometricCredentialId || "";
}

function hasSecurityEnabledApp() {
  const method = appSecurityState.authMethod || "pin";
  const pinOk = Boolean(appSecurityState.pinHash && method !== "biometric");
  const bioOk = Boolean(appSecurityState.biometricEnabled && appSecurityState.biometricCredentialId && method !== "pin");
  return pinOk || bioOk;
}

function webAuthnDisponivelApp() {
  return Boolean(window.PublicKeyCredential && navigator.credentials?.create && navigator.credentials?.get && window.crypto?.getRandomValues);
}

function randomBytesApp(length = 32) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

function base64UrlFromBufferApp(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bufferFromBase64UrlApp(value) {
  const padded = String(value || "").replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function renderAppLockOverlayContent(overlay) {
  const canUsePin = Boolean(appSecurityState.pinHash && appSecurityState.authMethod !== "biometric");
  const canUseBio = Boolean(appSecurityState.biometricEnabled && appSecurityState.biometricCredentialId && appSecurityState.authMethod !== "pin");
  overlay.innerHTML = `
    <div class="app-lock-card">
      <div class="brand-badge">BR</div>
      <h2>APP bloqueada</h2>
      <p>${canUseBio ? "Usa Face ID, impressão digital ou o PIN disponível." : "Introduz o PIN para continuar."}</p>
      ${canUseBio ? `<button class="primary-btn biometric-unlock-btn" type="button" onclick="desbloquearAppComBiometria()">Face ID / impressão digital</button>` : ""}
      ${canUsePin ? `<input id="appPinUnlock" type="password" inputmode="numeric" maxlength="12" placeholder="PIN" autocomplete="off">
      <button class="secondary-btn" type="button" onclick="desbloquearAppComPin()">Desbloquear com PIN</button>` : ""}
      <small id="appPinError"></small>
    </div>
  `;
}

function criarAppLockOverlay() {
  let overlay = document.getElementById("appLockOverlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "appLockOverlay";
  overlay.className = "app-lock-overlay";
  document.body.appendChild(overlay);
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Enter") desbloquearAppComPin();
  });
  overlay.addEventListener("input", (event) => {
    if (event.target?.id !== "appPinUnlock") return;
    if (appSecurityState.autoUnlockTimer) clearTimeout(appSecurityState.autoUnlockTimer);
    appSecurityState.autoUnlockTimer = setTimeout(() => tentarDesbloquearPinAutomatico(), 120);
  });
  return overlay;
}

function mostrarBloqueioApp() {
  if (!hasSecurityEnabledApp()) return;
  limparSessaoPinApp();
  const overlay = criarAppLockOverlay();
  renderAppLockOverlayContent(overlay);
  appSecurityState.overlay = overlay;
  appSecurityState.unlocked = false;
  overlay.classList.add("show");
  setTimeout(() => {
    document.getElementById("appPinUnlock")?.focus();
    if (appSecurityState.authMethod === "biometric") desbloquearAppComBiometria();
  }, 120);
}

function esconderBloqueioApp() {
  appSecurityState.overlay?.classList.remove("show");
  appSecurityState.unlocked = true;
  renovarSessaoPinApp();
  reiniciarTemporizadorBloqueioApp();
}

function renovarSessaoPinApp() {
  if (!hasSecurityEnabledApp() || !appSecurityState.unlocked || !appSecurityState.lockTimeoutMinutes) return;
  const until = Date.now() + (appSecurityState.lockTimeoutMinutes * 60000);
  setSessionAppBraga("appPinUnlockedUntil", String(until));
  setSessionAppBraga("appPinHash", getSecurityTokenApp());
}

function sessaoPinAindaValida() {
  const savedHash = getSessionAppBraga("appPinHash");
  const sessionUntil = Number(getSessionAppBraga("appPinUnlockedUntil") || 0);
  const until = sessionUntil;
  const token = getSecurityTokenApp();
  return Boolean(until && until > Date.now() && (!savedHash || savedHash === token));
}

function limparSessaoPinApp() {
  deleteCookieAppBraga("appPinUnlockedUntil");
  deleteSessionAppBraga("appPinUnlockedUntil");
  deleteSessionAppBraga("appPinHash");
}

function reiniciarTemporizadorBloqueioApp() {
  if (appSecurityState.timer) clearTimeout(appSecurityState.timer);
  appSecurityState.timer = null;
  if (!appSecurityState.pinHash || !appSecurityState.unlocked || !appSecurityState.lockTimeoutMinutes) return;
  renovarSessaoPinApp();
  appSecurityState.timer = setTimeout(() => mostrarBloqueioApp(), appSecurityState.lockTimeoutMinutes * 60000);
}

function aplicarSegurancaApp(pinHash, lockTimeoutMinutes, pinLength = 0, authMethod = "pin", biometricEnabled = false, biometricCredentialId = "") {
  const previousToken = getSecurityTokenApp();
  appSecurityState.pinHash = String(pinHash || "");
  appSecurityState.pinLength = Math.max(0, Number(pinLength) || 0);
  appSecurityState.authMethod = ["pin", "biometric", "both"].includes(authMethod) ? authMethod : "pin";
  appSecurityState.biometricEnabled = Boolean(biometricEnabled);
  appSecurityState.biometricCredentialId = String(biometricCredentialId || "");
  appSecurityState.lockTimeoutMinutes = Math.max(0, Number(lockTimeoutMinutes) || 0);
  setLockTimeoutInput(appSecurityState.lockTimeoutMinutes);
  setAuthMethodInput(appSecurityState.authMethod);
  if (!hasSecurityEnabledApp()) {
    appSecurityState.unlocked = true;
    limparSessaoPinApp();
    esconderBloqueioApp();
    return;
  }
  if (!appSecurityState.lockTimeoutMinutes) {
    appSecurityState.unlocked = true;
    limparSessaoPinApp();
    esconderBloqueioApp();
    return;
  }
  if (previousToken !== getSecurityTokenApp() || !appSecurityState.unlocked) {
    appSecurityState.unlocked = sessaoPinAindaValida();
  }
  if (!appSecurityState.unlocked) mostrarBloqueioApp();
  reiniciarTemporizadorBloqueioApp();
}

function initAppSecurityActivity() {
  if (window.__appSecurityActivityBound) return;
  window.__appSecurityActivityBound = true;
  ["click", "keydown", "touchstart", "mousemove", "scroll"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (!appSecurityState.overlay?.classList.contains("show")) reiniciarTemporizadorBloqueioApp();
    }, { passive: true });
  });
}

async function desbloquearAppComPin() {
  const input = document.getElementById("appPinUnlock");
  const error = document.getElementById("appPinError");
  const pin = input?.value || "";
  if (!pin) {
    if (error) error.textContent = "Escreve o PIN.";
    return;
  }
  const hash = await hashAppPin(pin);
  if (hash !== appSecurityState.pinHash) {
    if (error) error.textContent = "PIN incorreto.";
    if (input) input.value = "";
    return;
  }
  if (error) error.textContent = "";
  if (input) input.value = "";
  esconderBloqueioApp();
}

async function tentarDesbloquearPinAutomatico() {
  const input = document.getElementById("appPinUnlock");
  const pin = input?.value || "";
  if (!appSecurityState.pinHash || pin.length < 1) return;
  if (appSecurityState.pinLength && pin.length < appSecurityState.pinLength) return;
  const hash = await hashAppPin(pin);
  if (hash !== appSecurityState.pinHash) return;
  const error = document.getElementById("appPinError");
  if (error) error.textContent = "";
  if (input) input.value = "";
  esconderBloqueioApp();
}

async function ativarBiometriaApp() {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  if (!webAuthnDisponivelApp()) return mostrarMensagem("Este dispositivo não suporta Face ID / fingerprint nesta app.", "erro");
  try {
    const userId = randomBytesApp(16);
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: randomBytesApp(32),
        rp: { name: "App Braga" },
        user: {
          id: userId,
          name: "admin@appbraga.pt",
          displayName: "Administrador"
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred"
        },
        timeout: 60000,
        attestation: "none"
      }
    });
    if (!credential?.rawId) return mostrarMensagem("Não foi possível ativar biometria.", "erro");
    const biometricCredentialId = base64UrlFromBufferApp(credential.rawId);
    await window.db.collection("config").doc("layout").set({
      biometricEnabled: true,
      biometricCredentialId,
      biometricLabel: "Face ID / impressão digital",
      authMethod: document.getElementById("appAuthMethod")?.value || "both",
      updatedAt: Date.now()
    }, { merge: true });
    mostrarMensagem("Face ID / fingerprint ativado neste dispositivo.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Ativação biométrica cancelada ou indisponível.", "erro");
  }
}

async function desbloquearAppComBiometria() {
  if (!webAuthnDisponivelApp()) return mostrarMensagem("Biometria indisponível neste dispositivo.", "erro");
  if (!appSecurityState.biometricCredentialId) return mostrarMensagem("Ativa primeiro a biometria nas Configurações.", "erro");
  try {
    await navigator.credentials.get({
      publicKey: {
        challenge: randomBytesApp(32),
        allowCredentials: [{
          type: "public-key",
          id: bufferFromBase64UrlApp(appSecurityState.biometricCredentialId)
        }],
        userVerification: "required",
        timeout: 60000
      }
    });
    esconderBloqueioApp();
  } catch (error) {
    console.error(error);
    const message = document.getElementById("appPinError");
    if (message) message.textContent = "Face ID / fingerprint cancelado.";
  }
}

async function guardarMetodoEntradaApp(value) {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  const authMethod = ["pin", "biometric", "both"].includes(value) ? value : "pin";
  if (authMethod === "biometric" && !appSecurityState.biometricCredentialId) {
    setAuthMethodInput(appSecurityState.authMethod);
    return mostrarMensagem("Ativa primeiro Face ID / fingerprint neste dispositivo.", "erro");
  }
  try {
    await window.db.collection("config").doc("layout").set({
      authMethod,
      updatedAt: Date.now()
    }, { merge: true });
    appSecurityState.authMethod = authMethod;
    mostrarMensagem("Método de entrada atualizado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar método de entrada.", "erro");
  }
}

async function removerBiometriaApp() {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  if (!window.confirm("Remover Face ID / fingerprint desta APP?")) return;
  try {
    await window.db.collection("config").doc("layout").set({
      biometricEnabled: false,
      biometricCredentialId: "",
      authMethod: appSecurityState.pinHash ? "pin" : "pin",
      updatedAt: Date.now()
    }, { merge: true });
    limparSessaoPinApp();
    mostrarMensagem("Biometria removida.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao remover biometria.", "erro");
  }
}

async function guardarPinApp() {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  const input = document.getElementById("appPinCode");
  const pin = input?.value.trim() || "";
  if (!pin) return mostrarMensagem("Escreve um PIN novo antes de guardar.", "erro");
  const pinHash = await hashAppPin(pin);
  const pinLength = pin.length;
  const lockTimeoutMinutes = Math.max(0, Number(document.getElementById("appLockTimeout")?.value || appSecurityState.lockTimeoutMinutes) || 0);
  try {
    await window.db.collection("config").doc("layout").set({
      pinHash,
      pinLength,
      lockTimeoutMinutes,
      updatedAt: Date.now()
    }, { merge: true });
    if (input) input.value = "";
    mostrarMensagem("PIN da APP atualizado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar PIN.", "erro");
  }
}

async function guardarTempoBloqueioApp(value) {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  const lockTimeoutMinutes = Math.max(0, Number(value) || 0);
  try {
    await window.db.collection("config").doc("layout").set({
      lockTimeoutMinutes,
      updatedAt: Date.now()
    }, { merge: true });
    aplicarSegurancaApp(appSecurityState.pinHash, lockTimeoutMinutes, appSecurityState.pinLength, appSecurityState.authMethod, appSecurityState.biometricEnabled, appSecurityState.biometricCredentialId);
    mostrarMensagem("Tempo de bloqueio atualizado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar tempo de bloqueio.", "erro");
  }
}

async function removerPinApp() {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  if (!window.confirm("Remover o PIN de bloqueio da APP?")) return;
  try {
    await window.db.collection("config").doc("layout").set({
      pinHash: "",
      pinLength: 0,
      lockTimeoutMinutes: 0,
      authMethod: appSecurityState.biometricCredentialId ? "biometric" : "pin",
      updatedAt: Date.now()
    }, { merge: true });
    limparSessaoPinApp();
    aplicarSegurancaApp("", 0);
    mostrarMensagem("PIN removido.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao remover PIN.", "erro");
  }
}

function bloquearAppAgora() {
  if (!appSecurityState.pinHash) return mostrarMensagem("Define um PIN primeiro.", "erro");
  mostrarBloqueioApp();
}

document.addEventListener("DOMContentLoaded", initAppSecurityActivity);

function setHealthStatus(id, label, state = "ok") {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = label;
  node.className = `health-status ${state}`;
}

async function verificarSistemasApp() {
  if (!document.getElementById("systemHealthGrid")) return;
  setHealthStatus("healthNetwork", navigator.onLine ? "Online" : "Offline", navigator.onLine ? "ok" : "bad");
  setHealthStatus("healthDevice", window.appBragaDeviceType || (document.body.classList.contains("device-phone") ? "Telemóvel" : (document.body.classList.contains("device-tablet") ? "Tablet" : "PC")), "ok");
  setHealthStatus("healthPin", appSecurityState.biometricEnabled ? "Biometria ativa" : (appSecurityState.pinHash ? "PIN ativo" : "Desligado"), hasSecurityEnabledApp() ? "ok" : "warn");
  setHealthStatus("healthNotifications", "Removido", "warn");
  setHealthStatus("healthPushWatcher", "Removido", "warn");
  setHealthStatus("healthFirebase", window.firebase ? "Carregado" : "Indisponível", window.firebase ? "ok" : "bad");
  setHealthStatus("healthAuth", window.firebase?.auth ? "Carregado" : "Indisponível", window.firebase?.auth ? "ok" : "warn");

  if (!window.db || typeof window.db.collection !== "function") {
    setHealthStatus("healthFirestore", "Indisponível", "bad");
    return;
  }

  setHealthStatus("healthFirestore", "A testar", "warn");
  try {
    await window.db.collection("config").doc("layout").get();
    setHealthStatus("healthFirestore", "Realtime OK", "ok");
  } catch (error) {
    console.error("Erro no diagnóstico Firestore:", error);
    setHealthStatus("healthFirestore", "Erro", "bad");
  }
}

document.addEventListener("DOMContentLoaded", () => setTimeout(verificarSistemasApp, 900));

function initFullScreenScroll() {
  if (window.__appBragaFullScrollBound) return;
  window.__appBragaFullScrollBound = true;

  const forwardWheelToPage = (event) => {
    const modalOpen = document.querySelector('.modal-overlay[style*="flex"], .modal-overlay.show');
    if (modalOpen && modalOpen.contains(event.target)) return;

    const interactive = event.target.closest("input, textarea, select, option");
    if (interactive) return;

    const fixedZone = event.target.closest(".sidebar, .app-menu-toggle, .app-sidebar-overlay");
    if (!fixedZone) return;

    event.preventDefault();
    window.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
      behavior: "auto"
    });
  };

  document.addEventListener("wheel", forwardWheelToPage, { passive: false, capture: true });
}

document.addEventListener("DOMContentLoaded", initFullScreenScroll);

function initDeviceViewportMode() {
  const apply = () => {
    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    const height = window.innerHeight || document.documentElement.clientHeight || 0;
    const ua = navigator.userAgent || "";

    const isAndroid = /Android/i.test(ua);
    const isIosPhone = /iPhone|iPod/i.test(ua);
    const isIpad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const hasTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

    const minSide = Math.min(width, height);
    const maxSide = Math.max(width, height);

    /*
      Android tablets em Chrome/Samsung/desktop mode podem ter largura > 1400px.
      Antes a APP marcava isso como PC.
      Agora:
      - Android + touch + ecr? grande = tablet
      - iPad = tablet
      - telem?veis continuam phone
      - s? ? PC quando N?O ? Android/iPad touch tablet
    */
    const isPhone =
      isIosPhone ||
      (isAndroid && minSide < 700) ||
      width <= 760;

    const isAndroidTablet =
      isAndroid && hasTouch && minSide >= 700;

    const isTablet =
      isIpad ||
      isAndroidTablet ||
      (!isPhone && hasTouch && minSide >= 700 && maxSide <= 1800) ||
      (width > 760 && width <= 1400);

    const isDesktop =
      !isPhone && !isTablet;

    document.documentElement.style.setProperty("--app-vh", `${height * 0.01}px`);

    document.body.classList.toggle("device-phone", isPhone);
    document.body.classList.toggle("device-tablet", isTablet);
    document.body.classList.toggle("device-desktop", isDesktop);

    document.body.classList.toggle("tablet-portrait", isTablet && height >= width);
    document.body.classList.toggle("tablet-landscape", isTablet && width > height);

    document.body.classList.toggle("is-ios", isIosPhone || isIpad);
    document.body.classList.toggle("is-android", isAndroid);
    document.body.classList.toggle("is-android-tablet", isAndroidTablet);
    document.body.classList.toggle("is-ipad", isIpad);

    window.appBragaDeviceType = isPhone
      ? (isAndroid ? "Android Telemóvel" : "iPhone/Telemóvel")
      : (isAndroidTablet ? "Tablet Android" : (isIpad ? "iPad" : (isTablet ? "Tablet" : "PC")));
  };

  apply();
  window.addEventListener("resize", apply, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(apply, 250), { passive: true });
}

document.addEventListener("DOMContentLoaded", initDeviceViewportMode);

let radiosData = [];
let radioEditId = null;
let unsubscribeRadios = null;
let radioUsersData = [];
let radioWeeklyRecords = [];
let radioWeeklyEditId = null;
let unsubscribeRadioUsers = null;
let unsubscribeRadioWeekly = null;
let informacoesData = [];
let informacaoSelecionada = null;
let unsubscribeInformacoes = null;

function nowPt() {
  return new Date().toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function safeRefHtml(value) {
  if (typeof escapeHtmlAppBraga === "function") return escapeHtmlAppBraga(value);
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[char] || char));
}

function getRadioWeekInfo(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  const start = new Date(date);
  const currentDay = start.getDay() || 7;
  start.setDate(start.getDate() - currentDay + 1);
  start.setHours(0, 0, 0, 0);
  const endDate = new Date(start);
  endDate.setDate(start.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  const fmt = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  return {
    year: start.getFullYear(),
    week,
    start,
    end: endDate,
    key: `${start.getFullYear()}-W${String(week).padStart(2, "0")}`,
    label: `Semana ${week} de ${fmt.format(start)} a ${fmt.format(endDate)}`
  };
}

function radioUserLabel(user) {
  return user.nome || user.user_pc_eye || user.email_bragalis || user.user_mo365 || "User sem nome";
}

function radioUserId(user) {
  return user.id || user.firebaseId || user.idDoc || user._ref || radioUserLabel(user);
}

function radioCssEscape(value) {
  const text = String(value || "");
  return window.CSS && typeof window.CSS.escape === "function" ? window.CSS.escape(text) : text.replace(/"/g, '\\"');
}

function getRadioWeeklyRecord(weekKey = getRadioWeekInfo().key) {
  return getSortedRadioWeeklyRecords().find(item => item.weekKey === weekKey) || null;
}

function getSortedRadioWeeklyRecords() {
  return [...radioWeeklyRecords].sort((a, b) => {
    const ad = Number(a.createdAt || a.updatedAt || a.startAt || 0);
    const bd = Number(b.createdAt || b.updatedAt || b.startAt || 0);
    if (ad !== bd) return bd - ad;
    return String(b.weekKey || "").localeCompare(String(a.weekKey || ""), "pt", { numeric: true });
  });
}

function getRadioWeeklyRecordId(record) {
  return record?.recordId || record?.id || record?.weekKey || "REG";
}

function getRadiosFiltrados() {
  const search = normalizarTexto(document.getElementById("radioSearch")?.value || "");
  return radiosData.filter((item) => {
    const text = `${item.nome || ""} ${item.mac || ""} ${item.serial || ""}`;
    return !search || normalizarTexto(text).includes(search);
  });
}

function appAssetPath(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  const isHtmlPage = /\/html\//i.test(window.location.pathname || "");
  return `${isHtmlPage ? "../" : ""}${clean}`;
}

function getRadioImageSource(radio = {}) {
  return radio.imagem || radio.imageUrl || radio.foto || radio.photoUrl || appAssetPath("img/motorola-tlk25-radio.webp");
}

function radioDeviceImageHtml(radio = {}) {
  const serial = String(radio.serial || radio.nome || "Radio").trim();
  return `<img class="radio-device-img" src="${safeRefHtml(getRadioImageSource(radio))}" alt="${safeRefHtml(serial)}" loading="lazy">`;
}

function radioCurrentUserName(radio = {}) {
  return radio.userNome || radio.user || radio.utilizador || radio.operadorAtual || "";
}

function radioSearchText(item = {}) {
  return normalizarTexto([
    item.nome,
    item.mac,
    item.serial,
    item.numeroSerie,
    item.sn,
    item.userNome,
    item.user,
    item.utilizador,
    item.operadorAtual
  ].join(" "));
}

function renderRadios() {
  const listaNode = document.getElementById("listaRadios");
  const totalNode = document.getElementById("radiosTotal");
  const semanaNode = document.getElementById("radioSemanaLabel");
  const detalheNode = document.getElementById("radioDetalhesLista");
  const resumoNode = document.getElementById("radioWeeklySummary");
  if (!listaNode) return;

  const search = normalizarTexto(document.getElementById("radioSearch")?.value || "");
  const lista = radiosData
    .filter((item) => !search || radioSearchText(item).includes(search))
    .slice()
    .sort((a, b) => String(a.nome || a.serial || a.mac || "").localeCompare(String(b.nome || b.serial || b.mac || ""), "pt", { numeric: true, sensitivity: "base" }));

  const weekInfo = getRadioWeekInfo();
  const records = getSortedRadioWeeklyRecords();

  if (totalNode) totalNode.textContent = String(radiosData.length);
  if (semanaNode) semanaNode.textContent = records.length
    ? `${records.length} registo${records.length === 1 ? "" : "s"} semanal${records.length === 1 ? "" : "is"} guardado${records.length === 1 ? "" : "s"}`
    : weekInfo.label;

  listaNode.innerHTML = lista.length ? lista.map((item) => {
    const currentUser = radioCurrentUserName(item);
    const assigned = !!currentUser;
    const assignedAt = item.atribuidoAt ? new Date(Number(item.atribuidoAt)).toLocaleString("pt-PT") : "";
    return `
    <article class="radio-card" data-radio-id="${safeRefHtml(item.id)}" onclick="atualizarRadioSelecionado('${safeRefHtml(item.id)}')">
      <div class="radio-card-icon">${radioDeviceImageHtml(item)}</div>
      <div class="radio-card-main">
        <strong>${safeRefHtml(item.nome || "Sem nome")}</strong>
        <small>MAC ${safeRefHtml(item.mac || "-")} ? Série ${safeRefHtml(item.serial || item.numeroSerie || "-")}</small>
        <div class="radio-status-pill ${assigned ? "assigned" : "available"}">${assigned ? "Atribuído" : "Disponível"}</div>
        <div class="radio-card-user">${assigned ? `User: ${safeRefHtml(currentUser)}` : "Sem user atribuído"}</div>
        ${assignedAt ? `<small>Atribuído em ${safeRefHtml(assignedAt)}</small>` : ""}
        <div class="equipment-inline-actions">
          ${equipmentFichaLinkAppBraga("radio", item, 0, "local-radio", "Ver ficha")}
        </div>
      </div>

    </article>
  `;
  }).join("") : `<div class="reference-empty">Sem rádios registados na Firestore.</div>`;

  if (resumoNode) {
    resumoNode.innerHTML = records.length ? records.map((record) => {
      const assignments = Array.isArray(record.assignments) ? record.assignments : [];
      const usedCount = assignments.filter(item => item.userNome || item.userId).length;
      const recordId = getRadioWeeklyRecordId(record);
      return `
      <div class="weekly-radio-row compact radio-record-row">
        <div>
          <strong>${safeRefHtml(recordId)}</strong>
          <span>${safeRefHtml(record.label || "Semana sem intervalo")}</span>
          <small>${usedCount}/${assignments.length} rádios com user associado</small>
        </div>
        <div class="weekly-record-actions">
          <button class="secondary-btn reference-outline" type="button" onclick="abrirRelatorioRadios('${safeRefHtml(record.id)}')">Ver mais</button>
          <button class="secondary-btn" type="button" onclick="abrirEditarRegistoSemanalRadios('${safeRefHtml(record.id)}')">Editar</button>
          <button class="secondary-btn danger" type="button" onclick="apagarRegistoSemanalRadios('${safeRefHtml(record.id)}')">Apagar</button>
        </div>
      </div>
    `;
    }).join("") : `<div class="reference-empty">Ainda não existem registos semanais.</div>`;
  }

  if (detalheNode) {
    detalheNode.innerHTML = `<div class="reference-empty">Escolhe um registo e clica em Ver mais.</div>`;
  }

  atualizarRadioSelectOptions();
  atualizarRadioSelecionado(radioSelectedId);
}

function initRadiosPage() {
  if (!document.getElementById("listaRadios")) return;
  const dbRef = window.db;
  if (!dbRef || typeof dbRef.collection !== "function") {
    const listaNode = document.getElementById("listaRadios");
    if (listaNode) listaNode.innerHTML = `<div class="reference-empty">Firebase indisponível. Confirma a ligação da app.</div>`;
    return;
  }

  if (unsubscribeRadios) unsubscribeRadios();
  unsubscribeRadios = dbRef.collection("radios").onSnapshot((snapshot) => {
    radiosData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    radiosData.sort((a, b) => String(a.nome || a.serial || a.mac || "").localeCompare(String(b.nome || b.serial || b.mac || ""), "pt", { numeric: true, sensitivity: "base" }));
    renderRadios();
  }, (error) => {
    console.error("Erro realtime radios:", error);
    const listaNode = document.getElementById("listaRadios");
    if (listaNode) listaNode.innerHTML = `<div class="reference-empty">Erro ao carregar rádios da Firestore.</div>`;
  });


  if (unsubscribeRadioUsers) unsubscribeRadioUsers();
  unsubscribeRadioUsers = dbRef.collection("users").onSnapshot((snapshot) => {
    radioUsersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    radioUsersData.sort((a, b) => radioUserLabel(a).localeCompare(radioUserLabel(b), "pt", { numeric: true, sensitivity: "base" }));
    window.usersData = radioUsersData;
    renderRadioWeeklyForm();
  }, (error) => console.error("Erro realtime users para radios:", error));

  if (unsubscribeRadioWeekly) unsubscribeRadioWeekly();
  unsubscribeRadioWeekly = dbRef.collection("radioWeeklyRecords").onSnapshot((snapshot) => {
    radioWeeklyRecords = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderRadios();
    renderRadioWeeklyForm();
  }, (error) => console.error("Erro realtime radioWeeklyRecords:", error));
}

function adicionarRadio() {
  abrirModalRadio();
}

function abrirModalRadio(id = null) {
  radioEditId = id;
  const item = id ? radiosData.find((radio) => radio.id === id) : null;
  const title = document.getElementById("radioModalTitle");
  const nome = document.getElementById("radioNome");
  const mac = document.getElementById("radioMac");
  const serial = document.getElementById("radioSerial");
  if (title) title.textContent = id ? "Editar Rádio" : "Novo Rádio";
  if (nome) nome.value = item?.nome || "";
  if (mac) mac.value = item?.mac || "";
  if (serial) serial.value = item?.serial || "";
  const modal = document.getElementById("radioModal");
  if (modal) modal.style.display = "flex";
}

function fecharModalRadio() {
  radioEditId = null;
  const modal = document.getElementById("radioModal");
  if (modal) modal.style.display = "none";
}

async function guardarRadio() {
  const nome = document.getElementById("radioNome")?.value.trim() || "";
  const mac = document.getElementById("radioMac")?.value.trim() || "";
  const serial = document.getElementById("radioSerial")?.value.trim() || "";
  if (!nome) {
    mostrarMensagem("Preenche o nome do rádio.", "erro");
    return;
  }

  const payload = { nome, mac, serial, updatedAt: Date.now() };

  try {
    if (radioEditId) {
      await window.db.collection("radios").doc(radioEditId).update(payload);
      mostrarMensagem("Rádio atualizado.");
    } else {
      await window.db.collection("radios").add({ ...payload, createdAt: Date.now() });
      mostrarMensagem("Rádio criado.");
    }
    fecharModalRadio();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar rádio.", "erro");
  }
}

function editarRadio(id) {
  abrirModalRadio(id);
}

async function apagarRadio(id) {
  try {
    await window.db.collection("radios").doc(id).delete();
    mostrarMensagem("Rádio apagado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar rádio.", "erro");
  }
}

function filtrarRadios() {
  renderRadios();
}

function renderRadioWeeklyRecordDetails(recordId) {
  const detalheNode = document.getElementById("radioDetalhesLista");
  if (!detalheNode) return;
  const record = radioWeeklyRecords.find(item => item.id === recordId || item.recordId === recordId);
  if (!record) {
    detalheNode.innerHTML = `<div class="reference-empty">Registo não encontrado.</div>`;
    return;
  }

  const assignments = Array.isArray(record.assignments) ? record.assignments : [];
  detalheNode.innerHTML = `
    <div class="weekly-radio-row compact radio-record-row">
      <div>
        <strong>${safeRefHtml(getRadioWeeklyRecordId(record))}</strong>
        <span>${safeRefHtml(record.label || "Semana sem intervalo")}</span>
        <small>Registo criado em ${safeRefHtml(record.createdLabel || record.updatedLabel || "-")}</small>
      </div>
    </div>
    ${assignments.length ? assignments.map((item) => {
      const user1 = item.user1Nome || item.userNome || "";
      const user2 = item.user2Nome || "";
      const piso = item.piso || "Nenhum";
      return `
      <div class="weekly-radio-row">
        <strong>${safeRefHtml(item.radioNome || "Rádio")}</strong>
        <span>User 1: ${safeRefHtml(user1 || "Sem user selecionado")}</span>
        <span>User 2: ${safeRefHtml(user2 || "Sem user selecionado")}</span>
        <span>Piso: ${safeRefHtml(piso)}</span>
        <small>MAC ${safeRefHtml(item.radioMac || "-")} | Serial ${safeRefHtml(item.radioSerial || "-")}</small>
      </div>
    `;
    }).join("") : `<div class="reference-empty">Este registo não tem rádios associados.</div>`}
  `;
}

function abrirRelatorioRadios(recordId = null) {
  if (recordId) renderRadioWeeklyRecordDetails(recordId);
  const modal = document.getElementById("radioWeeklyModal");
  if (modal) modal.style.display = "flex";
}

function fecharRelatorioRadios() {
  const modal = document.getElementById("radioWeeklyModal");
  if (modal) modal.style.display = "none";
}

function setRadioWeeklyDateDefault() {
  const input = document.getElementById("radioWeeklyDate");
  if (!input || input.value) return;
  input.valueAsDate = new Date();
}

function setRadioWeeklyDateFromTimestamp(timestamp) {
  const input = document.getElementById("radioWeeklyDate");
  if (!input || !timestamp) return;
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return;
  input.value = date.toISOString().slice(0, 10);
}

function getRadioWeeklySelectedInfo() {
  const input = document.getElementById("radioWeeklyDate");
  const date = input?.value ? new Date(`${input.value}T12:00:00`) : new Date();
  return getRadioWeekInfo(date);
}

function renderRadioWeeklyForm() {
  const rows = document.getElementById("radioWeeklyRows");
  if (!rows) return;
  const label = document.getElementById("radioWeeklyRecordLabel");
  const editRecord = radioWeeklyEditId ? radioWeeklyRecords.find(item => item.id === radioWeeklyEditId || item.recordId === radioWeeklyEditId) : null;
  const weekInfo = editRecord ? getRadioWeekInfo(new Date(Number(editRecord.startAt || Date.now()))) : getRadioWeeklySelectedInfo();
  const record = editRecord || getRadioWeeklyRecord(weekInfo.key);
  const saved = Array.isArray(record?.assignments) ? record.assignments : [];
  if (label) label.textContent = editRecord ? `${getRadioWeeklyRecordId(editRecord)} ? ${weekInfo.label}` : weekInfo.label;

  const users = (radioUsersData.length ? radioUsersData : window.usersData || [])
    .slice()
    .sort((a, b) => radioUserLabel(a).localeCompare(radioUserLabel(b), "pt", { sensitivity: "base" }));

  const pisoOptions = ["Nenhum", "Piso 0", "Piso 1", "Piso 2"];

  function buildUserOptions(selectedId = "") {
    return [
      `<option value="">Sem user</option>`,
      ...users.map(user => {
        const userId = radioUserId(user);
        const selected = String(selectedId || "") === String(userId) ? " selected" : "";
        return `<option value="${safeRefHtml(userId)}"${selected}>${safeRefHtml(radioUserLabel(user))}</option>`;
      })
    ].join("");
  }

  rows.innerHTML = radiosData.length ? radiosData.map((radio) => {
    const current = saved.find(item => item.radioId === radio.id) || {};
    const user1Id = current.user1Id || current.userId || "";
    const user2Id = current.user2Id || "";
    const pisoAtual = current.piso || "Nenhum";
    const pisoSelect = pisoOptions.map((piso) => {
      const selected = pisoAtual === piso ? " selected" : "";
      return `<option value="${safeRefHtml(piso)}"${selected}>${safeRefHtml(piso)}</option>`;
    }).join("");

    return `
      <div class="radio-week-row radio-week-row-v2" data-radio-id="${safeRefHtml(radio.id)}">
        <div class="radio-week-device">
          <strong>${safeRefHtml(radio.nome || "Sem nome")}</strong>
          <span>MAC ${safeRefHtml(radio.mac || "-")} | Serial ${safeRefHtml(radio.serial || "-")}</span>
        </div>
        <label><span>User 1</span><select data-radio-user1="${safeRefHtml(radio.id)}">${buildUserOptions(user1Id)}</select></label>
        <label><span>User 2</span><select data-radio-user2="${safeRefHtml(radio.id)}">${buildUserOptions(user2Id)}</select></label>
        <label><span>Piso</span><select data-radio-piso="${safeRefHtml(radio.id)}">${pisoSelect}</select></label>
      </div>
    `;
  }).join("") : `<div class="reference-empty">Cria rádios primeiro para conseguires fazer o registo semanal.</div>`;
}

function abrirRegistoSemanalRadios() {
  radioWeeklyEditId = null;
  const title = document.getElementById("radioWeeklyModalTitle");
  if (title) title.textContent = "Novo registo semanal";
  const input = document.getElementById("radioWeeklyDate");
  if (input) input.valueAsDate = new Date();
  setRadioWeeklyDateDefault();
  renderRadioWeeklyForm();
  const modal = document.getElementById("radioWeeklyRecordModal");
  if (modal) modal.style.display = "flex";
}

function abrirEditarRegistoSemanalRadios(recordId) {
  const record = radioWeeklyRecords.find(item => item.id === recordId || item.recordId === recordId);
  if (!record) return mostrarMensagem("Registo semanal não encontrado.", "erro");
  radioWeeklyEditId = record.id;
  const title = document.getElementById("radioWeeklyModalTitle");
  if (title) title.textContent = `Editar ${getRadioWeeklyRecordId(record)}`;
  setRadioWeeklyDateFromTimestamp(record.startAt);
  renderRadioWeeklyForm();
  const modal = document.getElementById("radioWeeklyRecordModal");
  if (modal) modal.style.display = "flex";
}

function fecharRegistoSemanalRadios() {
  radioWeeklyEditId = null;
  const modal = document.getElementById("radioWeeklyRecordModal");
  if (modal) modal.style.display = "none";
}

async function guardarRegistoSemanalRadios() {
  if (!window.db) return mostrarMensagem("Firebase indisponível.", "erro");
  const weekInfo = getRadioWeeklySelectedInfo();
  const users = radioUsersData.length ? radioUsersData : window.usersData || [];
  const assignments = radiosData.map((radio) => {
    const user1Select = document.querySelector(`[data-radio-user1="${radioCssEscape(radio.id)}"]`);
    const user2Select = document.querySelector(`[data-radio-user2="${radioCssEscape(radio.id)}"]`);
    const pisoSelect = document.querySelector(`[data-radio-piso="${radioCssEscape(radio.id)}"]`);

    const user1Id = user1Select?.value || "";
    const user2Id = user2Select?.value || "";
    const user1 = users.find(item => radioUserId(item) === user1Id);
    const user2 = users.find(item => radioUserId(item) === user2Id);
    const piso = pisoSelect?.value || "Nenhum";

    return {
      radioId: radio.id,
      radioNome: radio.nome || "",
      radioMac: radio.mac || "",
      radioSerial: radio.serial || "",

      // Compatibilidade com registos antigos
      userId: user1Id,
      userNome: user1 ? radioUserLabel(user1) : "",

      // Novo sistema semanal
      user1Id,
      user1Nome: user1 ? radioUserLabel(user1) : "",
      user2Id,
      user2Nome: user2 ? radioUserLabel(user2) : "",
      piso
    };
  });

  try {
    const docRef = radioWeeklyEditId
      ? window.db.collection("radioWeeklyRecords").doc(radioWeeklyEditId)
      : window.db.collection("radioWeeklyRecords").doc();
    const existing = radioWeeklyEditId ? radioWeeklyRecords.find(item => item.id === radioWeeklyEditId) : null;
    const recordId = existing?.recordId || `REG-${weekInfo.key}-${docRef.id.slice(-5).toUpperCase()}`;
    const payload = {
      recordId,
      weekKey: weekInfo.key,
      week: weekInfo.week,
      year: weekInfo.year,
      label: weekInfo.label,
      startAt: weekInfo.start.getTime(),
      endAt: weekInfo.end.getTime(),
      assignments,
      updatedAt: Date.now()
    };
    if (!existing) {
      payload.createdAt = Date.now();
      payload.createdLabel = nowPt();
    }
    await docRef.set(payload, { merge: true });
    mostrarMensagem(existing ? "Registo semanal atualizado." : "Registo semanal guardado.");
    fecharRegistoSemanalRadios();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar registo semanal.", "erro");
  }
}

async function apagarRegistoSemanalRadios(recordId) {
  if (!window.db) return mostrarMensagem("Firebase indisponível.", "erro");
  const record = radioWeeklyRecords.find(item => item.id === recordId || item.recordId === recordId);
  if (!record) return mostrarMensagem("Registo semanal não encontrado.", "erro");
  if (!window.confirm(`Apagar ${getRadioWeeklyRecordId(record)}?`)) return;
  try {
    await window.db.collection("radioWeeklyRecords").doc(record.id).delete();
    mostrarMensagem("Registo semanal apagado.");
    renderRadios();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar registo semanal.", "erro");
  }
}

function getInformacoesFiltradas() {
  const pesquisa = normalizarTexto(document.getElementById("pesquisaInfo")?.value || "");
  if (!pesquisa) return informacoesData;
  return informacoesData.filter((item) => {
    const texto = `${item.titulo || ""} ${item.obs || ""}`;
    return normalizarTexto(texto).includes(pesquisa);
  });
}

function renderInformacoes() {
  const lista = document.getElementById("informacoesLista");
  if (!lista) return;
  const listaFiltrada = getInformacoesFiltradas();
  lista.innerHTML = listaFiltrada.length ? listaFiltrada.map(item => `
    <article class="info-list-item ${informacaoSelecionada === item.id ? "active" : ""}">
      <strong>${safeRefHtml(item.titulo || "Sem título")}</strong>
      <span>${safeRefHtml(item.obs || "Sem observações")}</span>
      <div class="meta-line">${safeRefHtml(item.updatedLabel || item.createdLabel || "")}</div>
      <div class="info-card-actions">
        <button class="secondary-btn reference-outline" type="button" onclick="verInformacao('${item.id}')">Ver mais</button>
        <button class="secondary-btn" type="button" onclick="editarInformacao('${item.id}')">Editar</button>
        <button class="secondary-btn danger" type="button" onclick="apagarInformacao('${item.id}')">Apagar</button>
      </div>
    </article>
  `).join("") : `<div class="info-empty">Ainda sem informações guardadas na Firebase.</div>`;
}

function initInformacoesPage() {
  if (!document.getElementById("informacoesLista")) return;
  const pesquisa = document.getElementById("pesquisaInfo");
  if (pesquisa) pesquisa.addEventListener("input", renderInformacoes);

  if (!window.db || typeof window.db.collection !== "function") {
    const lista = document.getElementById("informacoesLista");
    if (lista) lista.innerHTML = `<div class="info-empty">Firebase indisponível. Confirma a ligação da app.</div>`;
    return;
  }

  if (unsubscribeInformacoes) unsubscribeInformacoes();
  unsubscribeInformacoes = window.db.collection("informacoes").onSnapshot((snapshot) => {
    informacoesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    informacoesData.sort((a, b) => {
      const ad = Number(a.updatedAt || a.createdAt || 0);
      const bd = Number(b.updatedAt || b.createdAt || 0);
      if (ad !== bd) return bd - ad;
      return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt", { numeric: true, sensitivity: "base" });
    });
    renderInformacoes();
  }, (error) => {
    console.error("Erro realtime informacoes:", error);
    const lista = document.getElementById("informacoesLista");
    if (lista) lista.innerHTML = `<div class="info-empty">Erro ao carregar informações da Firebase.</div>`;
  });
}

async function adicionarInformacao() {
  const titulo = document.getElementById("infoTitulo")?.value || "";
  const obs = document.getElementById("infoObs")?.value || "";
  if (!normalizarTexto(titulo) && !normalizarTexto(obs)) {
    mostrarMensagem("Preenche pelo menos um título ou observação.", "erro");
    return;
  }

  if (!window.db || typeof window.db.collection !== "function") {
    mostrarMensagem("Firebase indisponível.", "erro");
    return;
  }

  const payload = {
    titulo,
    obs,
    updatedAt: Date.now(),
    updatedLabel: nowPt()
  };

  try {
    if (informacaoSelecionada) {
      await window.db.collection("informacoes").doc(informacaoSelecionada).set(payload, { merge: true });
      mostrarMensagem("Informação atualizada.");
    } else {
      await window.db.collection("informacoes").add({
        ...payload,
        createdAt: Date.now(),
        createdLabel: nowPt()
      });
      mostrarMensagem("Informação criada.");
    }
    document.getElementById("infoTitulo").value = "";
    document.getElementById("infoObs").value = "";
    informacaoSelecionada = null;
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar informação.", "erro");
  }
}

function selecionarInformacao(id) {
  editarInformacao(id);
}

function verInformacao(id) {
  const item = informacoesData.find(info => info.id === id);
  if (!item) return mostrarMensagem("Informação não encontrada.", "erro");
  const modal = document.getElementById("infoModal");
  const titulo = document.getElementById("modalInfoTitulo");
  const descricao = document.getElementById("modalInfoDescricao");
  if (titulo) titulo.textContent = item.titulo || "Informação";
  if (descricao) descricao.textContent = item.obs || "Sem observações";
  if (modal) modal.classList.remove("hidden");
}

function fecharInfoModal() {
  const modal = document.getElementById("infoModal");
  if (modal) modal.classList.add("hidden");
}

function editarInformacao(id) {
  const item = informacoesData.find(info => info.id === id);
  if (!item) return mostrarMensagem("Informação não encontrada.", "erro");
  informacaoSelecionada = id;
  document.getElementById("infoTitulo").value = item.titulo || "";
  document.getElementById("infoObs").value = item.obs || "";
  renderInformacoes();
}

async function apagarInformacao(id) {
  const item = informacoesData.find(info => info.id === id);
  if (!item) return mostrarMensagem("Informação não encontrada.", "erro");
  if (!window.confirm(`Apagar "${item.titulo || "esta informação"}"?`)) return;
  try {
    await window.db.collection("informacoes").doc(id).delete();
    if (informacaoSelecionada === id) {
      informacaoSelecionada = null;
      const titulo = document.getElementById("infoTitulo");
      const obs = document.getElementById("infoObs");
      if (titulo) titulo.value = "";
      if (obs) obs.value = "";
    }
    mostrarMensagem("Informação apagada.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar informação.", "erro");
  }
}

function verInformacaoSelecionada() {
  if (!informacaoSelecionada) return mostrarMensagem("Seleciona uma informação primeiro.", "erro");
  verInformacao(informacaoSelecionada);
}

function editarInformacaoSelecionada() {
  if (!informacaoSelecionada) return mostrarMensagem("Seleciona uma informação primeiro.", "erro");
  editarInformacao(informacaoSelecionada);
}

function apagarInformacaoSelecionada() {
  if (!informacaoSelecionada) return mostrarMensagem("Seleciona uma informação primeiro.", "erro");
  apagarInformacao(informacaoSelecionada);
}

function guardarInformacoes() {
  adicionarInformacao();
}

let radioAssignId = null;
let unsubscribeRadioHistoryOpen = null;

function getRadioById(id) {
  return radiosData.find((radio) => String(radio.id) === String(id));
}

function getRadioUsersList() {
  return (radioUsersData.length ? radioUsersData : (window.usersData || []));
}

function renderRadioAssignUsers(selectedId = "") {
  const select = document.getElementById("radioAssignUser");
  if (!select) return;

  const users = getRadioUsersList()
    .slice()
    .sort((a, b) => radioUserLabel(a).localeCompare(radioUserLabel(b), "pt", { numeric: true, sensitivity: "base" }));

  select.innerHTML = `<option value="">Escolher user...</option>` + users.map((user) => {
    const id = radioUserId(user);
    return `<option value="${safeRefHtml(id)}"${String(id) === String(selectedId) ? " selected" : ""}>${safeRefHtml(radioUserLabel(user))}</option>`;
  }).join("");
}

function abrirAtribuirRadio(id) {
  const radio = getRadioById(id);
  if (!radio) return mostrarMensagem("Rádio não encontrado.", "erro");
  radioAssignId = id;

  const title = document.getElementById("radioAssignTitle");
  if (title) title.textContent = `Atribuir ${radio.nome || "Rádio"}`;

  renderRadioAssignUsers(radio.userId || "");

  const obs = document.getElementById("radioAssignObs");
  if (obs) obs.value = "";

  const modal = document.getElementById("radioAssignModal");
  if (modal) modal.style.display = "flex";
}

function fecharAtribuirRadio() {
  radioAssignId = null;
  const modal = document.getElementById("radioAssignModal");
  if (modal) modal.style.display = "none";
}

async function guardarHistoricoRadio(radio, tipo, extra = {}) {
  if (!window.db?.collection || !radio?.id) return;
  await window.db.collection("radioHistory").add({
    radioId: String(radio.id),
    radioNome: radio.nome || "",
    radioMac: radio.mac || "",
    radioSerial: radio.serial || radio.numeroSerie || "",
    tipo,
    ...extra,
    createdAt: Date.now(),
    createdLabel: nowPt()
  });
}

async function guardarAtribuirRadio() {
  if (!window.db) return mostrarMensagem("Firebase indisponível.", "erro");

  const radio = getRadioById(radioAssignId);
  if (!radio) return mostrarMensagem("Rádio não encontrado.", "erro");

  const userId = document.getElementById("radioAssignUser")?.value || "";
  if (!userId) return mostrarMensagem("Escolhe um user.", "erro");

  const user = getRadioUsersList().find((item) => radioUserId(item) === userId);
  const userNome = user ? radioUserLabel(user) : userId;
  const obs = document.getElementById("radioAssignObs")?.value.trim() || "";

  try {
    await window.db.collection("radios").doc(radio.id).set({
      userId,
      userNome,
      estado: "atribuido",
      atribuidoAt: Date.now(),
      obsAtribuicao: obs,
      updatedAt: Date.now()
    }, { merge: true });

    await guardarHistoricoRadio(radio, "atribuido", { userId, userNome, obs });
    fecharAtribuirRadio();
    mostrarMensagem("Rádio atribuído.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao atribuir rádio.", "erro");
  }
}

async function devolverRadio(id) {
  if (!window.db) return mostrarMensagem("Firebase indisponível.", "erro");

  const radio = getRadioById(id);
  if (!radio) return mostrarMensagem("Rádio não encontrado.", "erro");

  const userNome = radioCurrentUserName(radio);
  if (!userNome && !window.confirm("Este rádio não tem user associado. Marcar como devolvido mesmo assim?")) return;

  try {
    await window.db.collection("radios").doc(radio.id).set({
      userId: "",
      userNome: "",
      user: "",
      utilizador: "",
      operadorAtual: "",
      estado: "disponivel",
      devolvidoAt: Date.now(),
      updatedAt: Date.now()
    }, { merge: true });

    await guardarHistoricoRadio(radio, "devolvido", { userNome, obs: "Devolução manual" });
    mostrarMensagem("Rádio devolvido.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao devolver rádio.", "erro");
  }
}

function abrirHistoricoRadio(id) {
  const radio = getRadioById(id);
  if (!radio) return mostrarMensagem("Rádio não encontrado.", "erro");

  const title = document.getElementById("radioHistoryTitle");
  const list = document.getElementById("radioHistoryList");

  if (title) title.textContent = `Histórico ? ${radio.nome || "Rádio"}`;
  if (list) list.innerHTML = `<div class="reference-empty">A carregar histórico...</div>`;

  const modal = document.getElementById("radioHistoryModal");
  if (modal) modal.style.display = "flex";

  if (unsubscribeRadioHistoryOpen) unsubscribeRadioHistoryOpen();

  if (!window.db?.collection) {
    if (list) list.innerHTML = `<div class="reference-empty">Firebase indisponível.</div>`;
    return;
  }

  unsubscribeRadioHistoryOpen = window.db.collection("radioHistory")
    .where("radioId", "==", String(radio.id))
    .onSnapshot((snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

      if (!list) return;
      list.innerHTML = items.length ? items.map((item) => `
        <div class="radio-history-item">
          <strong>${safeRefHtml(item.tipo === "atribuido" ? "Atribuído" : item.tipo === "devolvido" ? "Devolvido" : item.tipo || "Evento")}</strong>
          <small>User: ${safeRefHtml(item.userNome || "-")}</small>
          <small>${safeRefHtml(item.createdLabel || (item.createdAt ? new Date(Number(item.createdAt)).toLocaleString("pt-PT") : "-"))}</small>
          ${item.obs ? `<small>Obs: ${safeRefHtml(item.obs)}</small>` : ""}
        </div>
      `).join("") : `<div class="reference-empty">Sem histórico para este rádio.</div>`;
    }, (error) => {
      console.error(error);
      if (list) list.innerHTML = `<div class="reference-empty">Erro ao carregar histórico.</div>`;
    });
}

function fecharHistoricoRadio() {
  if (unsubscribeRadioHistoryOpen) {
    unsubscribeRadioHistoryOpen();
    unsubscribeRadioHistoryOpen = null;
  }
  const modal = document.getElementById("radioHistoryModal");
  if (modal) modal.style.display = "none";
}



let radioSelectedId = "";

function getRadioSelected() {
  return radiosData.find((radio) => String(radio.id) === String(radioSelectedId));
}

function atualizarRadioSelectOptions() {
  const select = document.getElementById("radioSelectedId");
  if (!select) return;

  const current = select.value || radioSelectedId || "";
  const lista = radiosData
    .slice()
    .sort((a, b) => String(a.nome || a.serial || a.mac || "").localeCompare(String(b.nome || b.serial || b.mac || ""), "pt", { numeric: true, sensitivity: "base" }));

  select.innerHTML = `<option value="">Selecionar rádio...</option>` + lista.map((radio) => {
    const label = `${radio.nome || "Rádio"}${radio.mac ? " ? " + radio.mac : ""}${radio.serial ? " ? " + radio.serial : ""}`;
    return `<option value="${safeRefHtml(radio.id)}"${String(radio.id) === String(current) ? " selected" : ""}>${safeRefHtml(label)}</option>`;
  }).join("");

  if (current && lista.some((radio) => String(radio.id) === String(current))) {
    select.value = current;
    radioSelectedId = current;
  } else if (radioSelectedId && !lista.some((radio) => String(radio.id) === String(radioSelectedId))) {
    radioSelectedId = "";
    select.value = "";
  }
}

function atualizarRadioSelecionado(id = null) {
  const select = document.getElementById("radioSelectedId");

  if (id !== null) {
    radioSelectedId = String(id || "");
    if (select) select.value = radioSelectedId;
  } else {
    radioSelectedId = select?.value || "";
  }

  const radio = getRadioSelected();
  const info = document.getElementById("radioSelectedInfo");

  document.querySelectorAll(".radio-card").forEach((card) => {
    card.classList.toggle("is-selected", String(card.dataset.radioId || "") === String(radioSelectedId));
  });

  if (info) {
    if (!radio) {
      info.textContent = "Seleciona um rádio para mexer.";
    } else {
      const user = radioCurrentUserName(radio);
      info.textContent = `${radio.nome || "Rádio"} ? MAC ${radio.mac || "-"} ? Série ${radio.serial || radio.numeroSerie || "-"} ? ${user ? "User: " + user : "Disponível"}`;
    }
  }
}

function radioAcaoSelecionada(acao) {
  const radio = getRadioSelected();
  if (!radio) {
    mostrarMensagem("Seleciona primeiro um rádio.", "erro");
    return;
  }

  const id = radio.id;

  if (acao === "editar") return editarRadio(id);
  if (acao === "atribuir") return abrirAtribuirRadio(id);
  if (acao === "devolver") return devolverRadio(id);
  if (acao === "historico") return abrirHistoricoRadio(id);
  if (acao === "apagar") return apagarRadio(id);
}


document.addEventListener("DOMContentLoaded", initRadiosPage);
document.addEventListener("DOMContentLoaded", initInformacoesPage);
document.addEventListener("DOMContentLoaded", initResolucaoApp);
document.addEventListener("DOMContentLoaded", initFullscreenPreferidoApp);
window.adicionarRadio = adicionarRadio;
window.editarRadio = editarRadio;
window.guardarRadio = guardarRadio;
window.fecharModalRadio = fecharModalRadio;
window.apagarRadio = apagarRadio;
window.filtrarRadios = filtrarRadios;
window.abrirRelatorioRadios = abrirRelatorioRadios;
window.fecharRelatorioRadios = fecharRelatorioRadios;
window.abrirRegistoSemanalRadios = abrirRegistoSemanalRadios;
window.abrirEditarRegistoSemanalRadios = abrirEditarRegistoSemanalRadios;
window.fecharRegistoSemanalRadios = fecharRegistoSemanalRadios;
window.renderRadioWeeklyForm = renderRadioWeeklyForm;
window.guardarRegistoSemanalRadios = guardarRegistoSemanalRadios;
window.apagarRegistoSemanalRadios = apagarRegistoSemanalRadios;

window.abrirAtribuirRadio = abrirAtribuirRadio;
window.fecharAtribuirRadio = fecharAtribuirRadio;
window.guardarAtribuirRadio = guardarAtribuirRadio;
window.devolverRadio = devolverRadio;
window.abrirHistoricoRadio = abrirHistoricoRadio;
window.fecharHistoricoRadio = fecharHistoricoRadio;

window.atualizarRadioSelecionado = atualizarRadioSelecionado;
window.radioAcaoSelecionada = radioAcaoSelecionada;


window.guardarResolucaoApp = guardarResolucaoApp;
window.guardarCorApp = guardarCorApp;
window.guardarTemaApp = guardarTemaApp;
window.reporTemaApp = reporTemaApp;
window.guardarPinApp = guardarPinApp;
window.guardarTempoBloqueioApp = guardarTempoBloqueioApp;
window.guardarMetodoEntradaApp = guardarMetodoEntradaApp;
window.removerPinApp = removerPinApp;
window.ativarBiometriaApp = ativarBiometriaApp;
window.removerBiometriaApp = removerBiometriaApp;
window.bloquearAppAgora = bloquearAppAgora;
window.desbloquearAppComPin = desbloquearAppComPin;
window.desbloquearAppComBiometria = desbloquearAppComBiometria;
window.entrarFullscreenApp = entrarFullscreenApp;
window.verificarSistemasApp = verificarSistemasApp;
window.adicionarInformacao = adicionarInformacao;
window.selecionarInformacao = selecionarInformacao;
window.verInformacao = verInformacao;
window.editarInformacao = editarInformacao;
window.apagarInformacao = apagarInformacao;
window.fecharInfoModal = fecharInfoModal;
window.verInformacaoSelecionada = verInformacaoSelecionada;
window.editarInformacaoSelecionada = editarInformacaoSelecionada;
window.apagarInformacaoSelecionada = apagarInformacaoSelecionada;
window.guardarInformacoes = guardarInformacoes;

function updateEnterpriseDashboard() {
  const totalEquipamentosEl = el("dashTotalEquipamentos");
  if (!totalEquipamentosEl) return;

  const impressorasTotal = Array.isArray(impressorasData) ? impressorasData.length : 0;
  const pcsTotal = Array.isArray(pcsGlobal) ? pcsGlobal.length : 0;
  const pistolasTotal = Array.isArray(window.pistolasData) ? window.pistolasData.length : 0;
  const portasTotal = Array.isArray(window.portasData) ? window.portasData.length : 0;
  const stockTotal = Array.isArray(stockGlobal) ? stockGlobal.length : 0;
  const ticketsAbertos = Array.isArray(manutencoesGlobal)
    ? manutencoesGlobal.filter(item => item.estado === "Pendente" || item.estado === "Em reparação").length
    : 0;
  const impressorasOk = Array.isArray(impressorasData)
    ? impressorasData.filter(item => obterEstadoImpressora(item.ip) === "OK").length
    : 0;
  const totalEquipamentos = impressorasTotal + pcsTotal + pistolasTotal + portasTotal;

  setText("dashTotalEquipamentos", totalEquipamentos);
  setText("dashStockTotal", stockTotal);
  setText("dashTicketsAbertos", ticketsAbertos);
  setText("dashImpressorasOk", impressorasOk);
  setText("dashDonutTotal", totalEquipamentos);
}

/* =========================
   INIT
========================= */
window.addEventListener("DOMContentLoaded", () => {
  if (el("historicoImpressoraPanel") && impressorasData && impressorasData.length) { abrirHistoricoImpressora(impressorasData[0]); }
  initGlobalTheme();

  carregarChecklist();
  carregarEdicaoToner();
  ensureLoteFieldOnEdit();
  tryRenderAppBraga(renderStockMinimoConfig);
  tryRenderAppBraga(renderStockMinimoPainel);
  tryRenderAppBraga(renderAlertasInteligentes);
  tryRenderAppBraga(() => enhanceScannerStatus("Leitura pronta."));
  preencherLocaisManutencao();
  preencherFormularioManutencao();

  carregarImpressorasLocal();
  renderImpressoras();
  renderManutencoes(manutencoesGlobal);
  carregarPistolasLocal();
  carregarPortasLocal();
  renderPistolas();
  renderPortas();
  carregarUsersLocal();
  renderUsers();
  carregarPermissoesApp();

  if (el("manutencaoSerie")) {
    el("manutencaoSerie").addEventListener("change", sincronizarCamposImpressora);
  }

  if (el("manutencaoIP")) {
    el("manutencaoIP").addEventListener("change", sincronizarCamposImpressora);
  }

  const estaNaPaginaImpressoras = !!el("impressorasTableBody");
  const estaNoDashboard = !!el("listaDashboardStock") || !!el("searchDashboard");
  const podeLerTonerElectron = !!(window.electronAPI && window.electronAPI.getTonerSNMP);

  // v1.58.26: no Electron/GitHub a leitura SNMP tem de correr como serviço global,
  // independentemente da página aberta. A escrita na Firebase continua protegida por
  // syncPrinterInfoToFirebase(), que só grava quando o valor mudou mesmo.
  if (estaNaPaginaImpressoras || estaNoDashboard || podeLerTonerElectron) {
    setTimeout(() => {
      testarTodasAsImpressoras();
    }, 900);

    setInterval(() => {
      testarTodasAsImpressoras();
    }, 60000);
  }

});

/* =========================
   TABLET / FIREBASE COMPLETO
========================= */
const printerFirebaseState = {};
const printerFirebaseSyncState = {};

function normalizePrinterIp(ip) {
  return String(ip || "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function hasUsablePrinterInfo(info) {
  if (!info) return false;
  if (Array.isArray(info.colors) && info.colors.length) return true;
  if (info.residue && typeof info.residue.percent === "number") return true;
  return typeof info.percent === "number";
}

function buildPrinterFirebasePayload(ip, info) {
  const payload = {
    ip: normalizePrinterIp(ip),
    syncSource: "desktop-snmp",
    updatedAtMs: Date.now(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (Array.isArray(info.colors) && info.colors.length) {
    payload.toner = {};
    info.colors.forEach((color) => {
      if (!color || typeof color.percent !== "number") return;
      const key = String(color.key || "").toLowerCase();
      if (["black", "cyan", "magenta", "yellow"].includes(key)) {
        payload.toner[key] = Math.max(0, Math.min(100, Math.round(color.percent)));
      }
    });
  }

  if (info.residue && typeof info.residue.percent === "number") {
    payload.waste = Math.max(0, Math.min(100, Math.round(info.residue.percent)));
  }

  if (typeof info.percent === "number") {
    payload.percent = Math.max(0, Math.min(100, Math.round(info.percent)));
  } else if (payload.toner && typeof payload.toner.black === "number") {
    payload.percent = payload.toner.black;
  }

  return payload;
}

function appBragaPrinterCompareKeyFromData(data = {}) {
  const mapped = mapFirebasePrinterInfo(data) || {};
  const toner = {};
  if (Array.isArray(mapped.colors)) {
    mapped.colors.forEach((item) => {
      if (!item || typeof item.percent !== "number") return;
      const key = String(item.key || item.label || "toner").toLowerCase();
      toner[key] = Math.max(0, Math.min(100, Math.round(item.percent)));
    });
  }
  return JSON.stringify({
    toner: Object.keys(toner).sort().reduce((acc, key) => { acc[key] = toner[key]; return acc; }, {}),
    waste: mapped.residue && typeof mapped.residue.percent === "number" ? Math.max(0, Math.min(100, Math.round(mapped.residue.percent))) : null,
    percent: typeof mapped.percent === "number" ? Math.max(0, Math.min(100, Math.round(mapped.percent))) : null
  });
}

function appBragaPrinterCompareKeyFromPayload(payload = {}) {
  return appBragaPrinterCompareKeyFromData(payload);
}

async function syncPrinterInfoToFirebase(ip, info) {
  const cleanIp = normalizePrinterIp(ip);
  if (!cleanIp || !db || !db.collection || !hasUsablePrinterInfo(info)) return false;

  const payload = buildPrinterFirebasePayload(cleanIp, info);
  const compareKey = appBragaPrinterCompareKeyFromPayload(payload);

  // v1.58.26: o Dashboard/Electron estava a escrever novamente os mesmos valores
  // em cada leitura. Mesmo sem mudança real, isso podia acordar as Functions e repetir
  // notificações nos outros dispositivos. Agora só escreve na Firebase quando toner/
  // resíduo/percentagem mudam mesmo.
  if (printerFirebaseSyncState[cleanIp] === compareKey) return true;

  try {
    const existingSnap = await db.collection("printers").doc(cleanIp).get();
    if (existingSnap.exists) {
      const existingData = { firebaseId: existingSnap.id, ...existingSnap.data(), ip: cleanIp };
      const existingKey = appBragaPrinterCompareKeyFromData(existingData);
      printerFirebaseState[cleanIp] = Object.assign({}, existingData);
      tonerInfoState[cleanIp] = mapFirebasePrinterInfo(existingData);
      printerFirebaseSyncState[cleanIp] = existingKey;
      if (existingKey === compareKey) return true;
    }
  } catch (error) {
    console.warn("Nao foi possivel comparar impressora antes de sincronizar:", cleanIp, error);
  }

  await db.collection("printers").doc(cleanIp).set(payload, { merge: true });
  printerFirebaseSyncState[cleanIp] = compareKey;
  printerFirebaseState[cleanIp] = Object.assign({}, printerFirebaseState[cleanIp] || {}, payload);
  tonerInfoState[cleanIp] = mapFirebasePrinterInfo(printerFirebaseState[cleanIp]);
  return true;
}

function normalizePrinterColorsFromFirebase(printerDoc) {
  const toner = printerDoc && printerDoc.toner ? printerDoc.toner : {};
  const colors = [];

  const colorMap = [
    ["black", "Preto", "black"],
    ["cyan", "Ciano", "cyan"],
    ["magenta", "Magenta", "magenta"],
    ["yellow", "Amarelo", "yellow"]
  ];

  const normalizePercentValue = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
    if (typeof value === "string") {
      const match = value.replace(",", ".").match(/\d{1,3}(?:\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }
    return null;
  };

  if (Array.isArray(printerDoc && printerDoc.colors)) {
    printerDoc.colors.forEach((item) => {
      if (!item) return;
      const key = String(item.key || item.color || item.cor || "").toLowerCase();
      const percent = normalizePercentValue(item.percent ?? item.value ?? item.valor ?? item.nivel);
      if (percent === null) return;
      const known = colorMap.find(([field,, mappedKey]) => key === field || key === mappedKey);
      colors.push({
        key: known ? known[2] : (key || "black"),
        label: item.label || item.cor || (known ? known[1] : "Toner"),
        percent
      });
    });
  }

  colorMap.forEach(([field, label, key]) => {
    const value =
      toner[field] ??
      toner[label] ??
      printerDoc?.[field] ??
      printerDoc?.[`${field}Percent`] ??
      printerDoc?.[`${field}_percent`];

    const percent = normalizePercentValue(value);
    if (percent !== null && !colors.some(c => c.key === key)) {
      colors.push({ key, label, percent });
    }
  });

  return colors;
}

function normalizePrinterResidueFromFirebase(printerDoc) {
  const wasteValue = printerDoc && typeof printerDoc.waste === "number"
    ? printerDoc.waste
    : (printerDoc && typeof printerDoc.residue === "number" ? printerDoc.residue : null);

  if (typeof wasteValue !== "number") return null;

  return {
    key: "waste",
    label: "Resíduo",
    percent: Math.max(0, Math.min(100, Math.round(wasteValue)))
  };
}

function mapFirebasePrinterInfo(printerDoc) {
  const colors = normalizePrinterColorsFromFirebase(printerDoc);
  const residue = normalizePrinterResidueFromFirebase(printerDoc);
  const normalizePercentValue = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
    if (typeof value === "string") {
      const match = value.replace(",", ".").match(/\d{1,3}(?:\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }
    return null;
  };
  let percent = normalizePercentValue(
    printerDoc?.percent ??
    printerDoc?.tonerPercent ??
    printerDoc?.toner_percent ??
    printerDoc?.nivelToner ??
    printerDoc?.nivel ??
    printerDoc?.percentage
  );

  if (percent === null && colors.length === 1 && colors[0].key === "black") {
    percent = colors[0].percent;
  }

  return { colors, residue, percent };
}

function bindPrintersFirebaseRealtime() {
  if (!db || !db.collection) return;
  // v1.58.26: a leitura Firebase das impressoras tem de estar ativa em todas as páginas.
  // Antes só corria no Dashboard/Impressoras; por isso iPhone/tablet só viam toners atualizados
  // quando alguém abria a página Impressoras. Este listener apenas lê e atualiza UI/estado local.
  appBragaBindFirestoreListener("printers-realtime", true, () => db.collection("printers").onSnapshot((snap) => {
    notificarAlteracaoRealtimeApp("printers", snap);
    snap.forEach((doc) => {
      const data = ({ firebaseId: doc.id, ...doc.data() }) || {};
      const ip = normalizePrinterIp(data.ip || doc.id);
      if (!ip) return;

      const mapped = mapFirebasePrinterInfo(data);
      const previousMapped = tonerInfoState[ip] || (printerFirebaseState[ip] ? mapFirebasePrinterInfo(printerFirebaseState[ip]) : null);
      printerFirebaseState[ip] = Object.assign({}, data, { ip });
      tonerInfoState[ip] = mapped;
      maybeNotifyTonerReplacement(ip, previousMapped, mapped);
      maybeNotifyCriticalSupply(ip, mapped, previousMapped);
    });

    renderDashboardCards();
    renderImpressoras();
    renderTonerDiagnostics();

    const dashboardHasSearch = !!el("searchDashboard");
    if (dashboardHasSearch && normalizarTexto(el("searchDashboard")?.value || "")) {
      renderDashboardCards();
    }
  }, (error) => {
    console.error("Erro ao ler coleção printers:", error);
  }));
}

const __originalObterTonerInfo = obterTonerInfo;
obterTonerInfo = async function(ip) {
  const cleanIp = normalizePrinterIp(ip);
  const desktopMode = !!(window.electronAPI && window.electronAPI.getTonerSNMP);

  if (desktopMode) {
    const freshInfo = await __originalObterTonerInfo(cleanIp);
    if (hasUsablePrinterInfo(freshInfo)) {
      try {
        await syncPrinterInfoToFirebase(cleanIp, freshInfo);
      } catch (error) {
        console.error("Erro ao sincronizar impressora para Firebase:", cleanIp, error);
      }
      return freshInfo;
    }

    if (printerFirebaseState[cleanIp]) {
      return mapFirebasePrinterInfo(printerFirebaseState[cleanIp]);
    }

    return freshInfo;
  }

  if (printerFirebaseState[cleanIp]) {
    return mapFirebasePrinterInfo(printerFirebaseState[cleanIp]);
  }
  return await __originalObterTonerInfo(cleanIp);
};

const __originalTestarTodasAsImpressoras = testarTodasAsImpressoras;
testarTodasAsImpressoras = async function() {
  const webMode = !(window.electronAPI && window.electronAPI.getTonerSNMP);
  if (webMode) {
    impressorasData.forEach((item) => {
      const info = printerFirebaseState[item.ip] ? mapFirebasePrinterInfo(printerFirebaseState[item.ip]) : null;
      tonerInfoState[item.ip] = info;
      const alvoId = `toner-${item.ip.replace(/\./g, "-")}`;
      if (el(alvoId)) {
        el(alvoId).innerHTML = gerarHTMLToners(info);
      }
      if (info) maybeNotifyCriticalSupply(item.ip, info);
    });
    renderDashboardCards();
    return;
  }
  return await __originalTestarTodasAsImpressoras();
};

const __originalAbrirIP = abrirIP;
abrirIP = function(ip) {
  // No tablet/web o IP fica s? de leitura
  const webMode = !(window.electronAPI && window.electronAPI.getTonerSNMP);
  if (webMode) return;
  return __originalAbrirIP(ip);
};

const __originalRenderImpressoras = renderImpressoras;
renderImpressoras = function(lista = impressorasData) {
  const tbody = el("impressorasTableBody");
  if (!tbody) return __originalRenderImpressoras(lista);

  const total = impressorasData.length;
  const ok = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "OK").length;
  const problema = impressorasData.filter(i => {
    const e = obterEstadoImpressora(i.ip);
    return e === "Pendente" || e === "Em reparação";
  }).length;
  const resolvidas = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "Resolvido").length;

  setText("countImpressoras", total);
  setText("countImpressorasOk", ok);
  setText("countImpressorasProblema", problema);
  setText("countImpressorasResolvidas", resolvidas);

  const webMode = !(window.electronAPI && window.electronAPI.getTonerSNMP);

  tbody.innerHTML = lista.map((item, index) => {
    const estado = obterEstadoImpressora(item.ip);
    const tonerId = `toner-${item.ip.replace(/\./g, "-")}`;
    const info = printerFirebaseState[item.ip] ? mapFirebasePrinterInfo(printerFirebaseState[item.ip]) : (tonerInfoState[item.ip] || null);
    const ipHtml = webMode ? item.ip : `<a href="http://${item.ip}" target="_blank" rel="noopener noreferrer">${item.ip}</a>`;

    return `
      <tr>
        <td>${item.modelo}</td>
        <td>${item.serie}</td>
        <td>${item.armazem}</td>
        <td>${item.localizacao}</td>
        <td>${ipHtml}</td>
        <td>${badgeEstado(estado)}</td>
        <td>
          <div id="${tonerId}">${gerarHTMLToners(info)}</div>
          <div class="table-actions" style="margin-top:8px;">
            ${equipmentFichaLinkAppBraga("impressora", item, index, "local-impressora", "Ver ficha", "action-btn")}
            ${webMode ? "" : `<button class="action-btn ip" onclick="abrirIP('${item.ip}')">Abrir IP</button>`}
            <button class="action-btn manut" onclick='abrirManutencaoDireta(${JSON.stringify(item)})'>Manutenção</button>
            ${webMode ? "" : `<button class="action-btn" onclick="window.testarTonerImpressora('${item.ip}', '${tonerId}')">Testar toner</button>`}
          </div>
        </td>
      </tr>
    `;
  }).join("");
};

window.addEventListener("DOMContentLoaded", () => {
  if (el("historicoImpressoraPanel") && impressorasData && impressorasData.length) { abrirHistoricoImpressora(impressorasData[0]); }
  bindPrintersFirebaseRealtime();
});





/* =========================
   DIAGNÓSTICO DO TONER
========================= */
const tonerDiagnosticsState = {
  running: false,
  lastRunAt: null,
  source: "-",
  successCount: 0,
  totalCount: 0,
  status: "idle",
  log: []
};

function formatDiagTime(date) {
  if (!date) return "-";
  try {
    return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" }).format(date);
  } catch (e) {
    return date.toLocaleString();
  }
}

function resolveDiagSource() {
  return (window.electronAPI && window.electronAPI.getTonerSNMP) ? "Leitura real SNMP" : "Firebase";
}


const tonerDiagUiState = { logsVisible: false };

function renderTonerDiagLogVisibility() {
  const wrapEl = el("tonerDiagLogWrap");
  const btnEl = el("toggleTonerDiagLogBtn");
  if (!wrapEl || !btnEl) return;
  wrapEl.classList.toggle("is-collapsed", !tonerDiagUiState.logsVisible);
  btnEl.textContent = tonerDiagUiState.logsVisible ? "Esconder logs" : "Ver logs";
}

function toggleTonerDiagLog(force) {
  tonerDiagUiState.logsVisible = typeof force === "boolean" ? force : !tonerDiagUiState.logsVisible;
  renderTonerDiagLogVisibility();
}
window.toggleTonerDiagLog = toggleTonerDiagLog;

function renderTonerDiagnostics() {
  const statusEl = el("tonerDiagStatus");
  const dotEl = el("tonerDiagDot");
  const lastRunEl = el("tonerDiagLastRun");
  const sourceEl = el("tonerDiagSource");
  const summaryEl = el("tonerDiagSummary");
  const logEl = el("tonerDiagLog");
  if (!statusEl || !dotEl || !lastRunEl || !sourceEl || !summaryEl || !logEl) return;
  renderTonerDiagLogVisibility();

  const map = {
    idle: ["Sem teste", "is-idle"],
    running: ["A testar", "is-running"],
    ok: ["A funcionar", "is-ok"],
    warn: ["Parcial", "is-warn"],
    error: ["Com falhas", "is-error"]
  };

  const current = map[tonerDiagnosticsState.status] || map.idle;
  statusEl.textContent = current[0];
  dotEl.className = `diag-dot ${current[1]}`;
  lastRunEl.textContent = formatDiagTime(tonerDiagnosticsState.lastRunAt);
  sourceEl.textContent = tonerDiagnosticsState.source || "-";

  if (tonerDiagnosticsState.running) {
    summaryEl.textContent = `A testar ${tonerDiagnosticsState.totalCount || impressorasData.length || 0} impressoras`;
  } else if (!tonerDiagnosticsState.lastRunAt) {
    summaryEl.textContent = "À espera de teste";
  } else {
    summaryEl.textContent = `${tonerDiagnosticsState.successCount}/${tonerDiagnosticsState.totalCount || 0} impressoras com leitura`;
  }

  if (!tonerDiagnosticsState.log.length) {
    logEl.innerHTML = '<div class="diagnostics-log-item is-muted">Ainda sem leituras.</div>';
    return;
  }

  logEl.innerHTML = tonerDiagnosticsState.log.map(item => `
    <div class="diagnostics-log-item">
      <span class="diag-time">${item.time}</span>
      <strong>${item.ip}</strong> ? ${item.message}
    </div>
  `).join("");
}

function pushTonerDiagnosticLog(ip, message) {
  tonerDiagnosticsState.log.unshift({
    ip: ip || "Sistema",
    message,
    time: formatDiagTime(new Date())
  });
  tonerDiagnosticsState.log = tonerDiagnosticsState.log.slice(0, 10);
  renderTonerDiagnostics();
}

function updateTonerDiagnosticStatus(status, partial = {}) {
  tonerDiagnosticsState.status = status;
  Object.assign(tonerDiagnosticsState, partial);
  renderTonerDiagnostics();
}

function summarizeTonerInfo(info) {
  if (!info) return "sem leitura";
  if (Array.isArray(info.colors) && info.colors.length) {
    return info.colors.map(c => `${c.label || c.key}: ${typeof c.percent === "number" ? Math.round(c.percent) : "N/D"}%`).join(" ? ");
  }
  if (typeof info.percent === "number") return `Preto: ${Math.round(info.percent)}%`;
  return "sem percentagem";
}

async function testarSistemaToner() {
  updateTonerDiagnosticStatus("running", {
    running: true,
    source: resolveDiagSource(),
    totalCount: impressorasData.length || 0,
    successCount: 0
  });
  pushTonerDiagnosticLog("Sistema", `Teste iniciado por ${resolveDiagSource()}`);

  let success = 0;
  for (const item of impressorasData) {
    const info = await obterTonerInfo(item.ip);
    tonerInfoState[item.ip] = info || null;
    const alvoId = `toner-${item.ip.replace(/\./g, "-")}`;
    if (el(alvoId)) el(alvoId).innerHTML = gerarHTMLToners(info);
    if (info) {
      success += 1;
      pushTonerDiagnosticLog(item.ip, summarizeTonerInfo(info));
      maybeNotifyCriticalSupply(item.ip, info);
    } else {
      pushTonerDiagnosticLog(item.ip, "sem resposta");
    }
  }

  updateTonerDiagnosticStatus(success === impressorasData.length ? "ok" : (success > 0 ? "warn" : "error"), {
    running: false,
    lastRunAt: new Date(),
    successCount: success,
    totalCount: impressorasData.length || 0,
    source: resolveDiagSource()
  });

  renderDashboardCards();
  renderImpressoras();
}

window.testarSistemaToner = testarSistemaToner;

/* =========================
   VERSÃO / ONLINE-OFFLINE
========================= */
const APP_BRAGA_VERSION = `v${APP_VERSION} Premium`;

function atualizarEstadoLigacaoAppBraga() {
  const online = navigator.onLine;
  document.querySelectorAll(".status-pill").forEach(node => {
    node.textContent = online ? "Sistema Online" : "Sistema Offline";
    node.classList.toggle("offline", !online);
  });
  document.querySelectorAll(".version-pill").forEach(node => {
    node.textContent = APP_BRAGA_VERSION;
  });
}

window.addEventListener("online", atualizarEstadoLigacaoAppBraga);
window.addEventListener("offline", atualizarEstadoLigacaoAppBraga);
document.addEventListener("DOMContentLoaded", atualizarEstadoLigacaoAppBraga);

/* =========================
   ADD TONER - ESTÁVEL
========================= */
const tonerMapStable = {
  "TK-3190": { equipamento: "P3155DN", cor: "Preto" },
  "TK-8365Y": { equipamento: "TASKalfa_255ci", cor: "Amarelo" },
  "TK-8365C": { equipamento: "TASKalfa_255ci", cor: "Azul" },
  "TK-8365M": { equipamento: "TASKalfa_255ci", cor: "Vermelho" },
  "TK-8365K": { equipamento: "TASKalfa_255ci", cor: "Preto" },
  "TK-3430": { equipamento: "PA5500x", cor: "Preto" }
};

let scannerInstanceStable = null;
let scannerAtivoStable = false;

function mostrarOCRStatusStable(texto) {
  const box = el("ocrStatus");
  if (!box) return;
  box.style.display = "block";
  box.innerText = texto;
}

function normalizarTextoOCRStable(texto) {
  return String(texto || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/-/g, "-")
    .replace(/_/g, "-")
    .trim()
    .toUpperCase();
}

function preencherDataAtualSeVaziaStable() {
  const dataEl = el("data");
  if (!dataEl) return;
  if (!dataEl.value) {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");
    dataEl.value = `${yyyy}-${mm}-${dd}`;
  }
}

function montarTextoLocalizacaoStable(item) {
  if (!item) return "Sem Localização";
  const serie = String(item.serie || "").trim();
  const armazem = String(item.armazem || "Braga").trim();
  const local = String(item.localizacao || item.local || "Sem Localização").trim();
  return [serie, armazem, local].filter(Boolean).join(" - ");
}

function procurarImpressoraPorUltimos3DigitosStable(final3) {
  const alvo = String(final3 || "").trim().toUpperCase();
  if (alvo.length !== 3) return null;
  return impressorasData.find(item => String(item.serie || "").toUpperCase().slice(-3) === alvo) || null;
}

function abrirSerie3DigitosStable() {
  const box = el("serial3Box");
  if (box) box.style.display = "block";
  const input = el("serial3Input");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 120);
  }
}

function fecharSerie3DigitosStable() {
  const box = el("serial3Box");
  if (box) box.style.display = "none";
  const input = el("serial3Input");
  if (input) input.value = "";
}

function aplicarDadosTonerStable(toner) {
  if (el("equipamento")) el("equipamento").value = toner.equipamento || "";
  if (el("cor")) el("cor").value = toner.cor || "";
  preencherDataAtualSeVaziaStable();
}

function extrairDadosEtiquetaOCRStable(texto) {
  const t = normalizarTextoOCRStable(texto);

  let tonerCode = "";
  const tkMatch = t.match(/TK[\s-]?(\d{4}[A-Z]?)/);
  if (tkMatch) tonerCode = `TK-${tkMatch[1]}`;

  let dataFolha = "";
  const dataISO = t.match(/\d{4}-\d{2}-\d{2}/);
  const dataPTSlash = t.match(/\d{2}\/\d{2}\/\d{4}/);
  const dataPTHyphen = t.match(/\d{2}-\d{2}-\d{4}/);

  if (dataISO) {
    dataFolha = dataISO[0];
  } else if (dataPTSlash) {
    const [dd, mm, yyyy] = dataPTSlash[0].split("/");
    dataFolha = `${yyyy}-${mm}-${dd}`;
  } else if (dataPTHyphen) {
    const [dd, mm, yyyy] = dataPTHyphen[0].split("-");
    dataFolha = `${yyyy}-${mm}-${dd}`;
  }

  let serieEncontrada = "";
  for (const item of impressorasData) {
    const s = String(item.serie || "").toUpperCase();
    if (s && t.includes(s)) {
      serieEncontrada = item.serie;
      break;
    }
  }

  let equipamento = "";
  let cor = "";

  if (tonerCode && tonerMapStable[tonerCode]) {
    equipamento = tonerMapStable[tonerCode].equipamento || "";
    cor = tonerMapStable[tonerCode].cor || "";
  }

  if (!equipamento) {
    if (t.includes("P3155DN")) equipamento = "P3155DN";
    else if (t.includes("PA5500X")) equipamento = "PA5500x";
    else if (t.includes("2554CI")) equipamento = "TASKalfa_255ci";
  }

  if (!cor && tonerCode) {
    if (tonerCode.endsWith("Y")) cor = "Amarelo";
    else if (tonerCode.endsWith("C")) cor = "Azul";
    else if (tonerCode.endsWith("M")) cor = "Vermelho";
    else cor = "Preto";
  }

  const lote = extractLoteFromText(t);
  const sdsRef = extractSdsRefFromText(texto);

  return {
    lote,
    sdsRef,
    tonerCode,
    equipamento,
    cor,
    dataFolha,
    serie: serieEncontrada
  };
}

function setSelectValueAppBraga(selectEl, value) {
  if (!selectEl) return;
  const clean = String(value || "").trim();
  if (!clean) {
    selectEl.value = "";
    return;
  }
  const exists = Array.from(selectEl.options || []).some(opt => opt.value === clean);
  if (!exists) {
    const opt = document.createElement("option");
    opt.value = clean;
    opt.textContent = clean;
    selectEl.appendChild(opt);
  }
  selectEl.value = clean;
}

function carregarLocalizacoesImpressorasNoFormularioAppBraga() {
  const select = el("localizacao");
  if (!select || !Array.isArray(impressorasData)) return;
  impressorasData.forEach((printer) => {
    const value = montarTextoLocalizacaoStable(printer);
    if (value && !Array.from(select.options || []).some(opt => opt.value === value)) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    }
  });
}

function aplicarDadosOCRNoFormularioStable(dados) {
  if (!dados) return false;

  if (dados.equipamento && el("equipamento")) el("equipamento").value = dados.equipamento;
  if (dados.cor && el("cor")) el("cor").value = dados.cor;

  if (el("dataFolha")) {
    el("dataFolha").value = dados.dataFolha || "";
  }
  if (el("lote")) {
    el("lote").value = dados.lote || "";
  }
  if (el("sdsRef")) {
    const sdsValido = String(dados.sdsRef || "").trim().toUpperCase();
    el("sdsRef").value = /^S\d{7,12}$/.test(sdsValido) ? sdsValido : "";
  }

  preencherDataAtualSeVaziaStable();

  if (dados.serie && el("localizacao")) {
    const printer = impressorasData.find(p => p.serie === dados.serie);
    if (printer) {
      setSelectValueAppBraga(el("localizacao"), montarTextoLocalizacaoStable(printer));
    }
  } else if (dados.equipamento || dados.cor) {
    abrirSerie3DigitosStable();
  }

  return !!(dados.tonerCode || dados.equipamento || dados.cor || dados.dataFolha || dados.serie || dados.sdsRef);
}

async function processarTextoLidoStable(textoLido) {
  const bruto = String(textoLido || "");
  const codigoEtiqueta = extrairCodigoEtiquetaTonerAppBraga(bruto);
  if (codigoEtiqueta) {
    await usarPorCodigoEtiquetaToner(codigoEtiqueta);
    return true;
  }

  const normal = normalizarTextoOCRStable(bruto);

  const tkMatch = normal.match(/TK[\s-]?(\d{4}[A-Z]?)/);
  if (tkMatch) {
    const tk = `TK-${tkMatch[1]}`;
    const toner = tonerMapStable[tk] || null;
    if (toner) {
      aplicarDadosTonerStable(toner);
      mostrarMensagem(`Toner identificado: ${tk}`);
      abrirSerie3DigitosStable();
      return true;
    }
  }

  mostrarMensagem("Código não reconhecido para preenchimento automático.", "erro");
  return false;
}

async function startScannerStable() {
  const reader = el("reader");

  if (!reader) {
    mostrarMensagem("Zona do scanner não encontrada.", "erro");
    return;
  }
  if (scannerAtivoStable) {
    mostrarMensagem("A cãmara já está aberta.", "erro");
    return;
  }

  reader.innerHTML = "";
  garantirPreviewStockQrVisivel();

  try {
    await garantirHtml5QrcodeStock();
    scannerInstanceStable = new Html5Qrcode("reader");
    await scannerInstanceStable.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 280, height: 180 } },
      async (decodedText) => {
        enhanceScannerStatus("Código lido. A processar automaticamente...");

        // 1? tenta usar o QR como etiqueta de toner existente em Stock.
        // Se encontrar, passa automaticamente de Stock para Histórico.
        const passouStockHistorico = await usarPorCodigoEtiquetaToner(decodedText);
        if (!passouStockHistorico) {
          // Se não for QR de stock, mantém o comportamento antigo do scanner.
          await processarTextoLidoStable(decodedText);
        }

        stopScannerStable();
      },
      () => {}
    );
    scannerAtivoStable = true;
    enhanceScannerStatus("Cãmara iniciada. À espera de leitura inteligente.");
    mostrarMensagem("Cãmara iniciada.");
  } catch (e) {
    console.error("Erro ao iniciar scanner:", e);
    mostrarMensagem("Não foi possível abrir a cãmara.", "erro");
  }
}

async function stopScannerStable() {
  const reader = el("reader");
  if (!scannerInstanceStable || !scannerAtivoStable) {
    if (reader) reader.innerHTML = "";
    scannerAtivoStable = false;
    return;
  }

  try {
    await scannerInstanceStable.stop();
    await scannerInstanceStable.clear();
  } catch (e) {
    console.error("Erro ao fechar scanner:", e);
  } finally {
    scannerInstanceStable = null;
    scannerAtivoStable = false;
    if (reader) reader.innerHTML = "";
  }
}

function abrirOCRStable() {
  const input = el("ocrInput");
  if (!input) {
    mostrarMensagem("Input OCR não encontrado.", "erro");
    return;
  }
  input.value = "";
  input.click();
}

async function processarOCRInputStable(event) {
  const file = event && event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;
  try {
    await garantirTesseractStable();
    mostrarOCRStatusStable("A ler a folha... pode demorar alguns segundos.");
    mostrarMensagem("A ler a folha...");

    const result = await Tesseract.recognize(file, "eng", { logger: () => {} });
    const texto = result && result.data ? result.data.text : "";
    const dados = extrairDadosEtiquetaOCRStable(texto);
    const ok = aplicarDadosOCRNoFormularioStable(dados);

    const resumo = [
      dados.tonerCode ? `Toner: ${dados.tonerCode}` : "",
      dados.lote ? `Lote: ${dados.lote}` : "",
      dados.sdsRef ? `SDS Ref: ${dados.sdsRef}` : "",
      dados.equipamento ? `Equipamento: ${dados.equipamento}` : "",
      dados.cor ? `Cor: ${dados.cor}` : "",
      dados.dataFolha ? `Data folha: ${dados.dataFolha}` : "",
      el("data") && el("data").value ? `Data scan: ${el("data").value}` : "",
      dados.serie ? `Série: ${dados.serie}` : ""
    ].filter(Boolean).join(" | ");

    mostrarOCRStatusStable(resumo || "A folha foi lida, mas não encontrei dados suficientes.");
    mostrarMensagem(ok ? "Folha lida com sucesso." : "Não encontrei dados suficientes na folha.", ok ? "sucesso" : "erro");
  } catch (e) {
    console.error("Erro OCR:", e);
    mostrarOCRStatusStable("Erro ao ler a folha.");
    mostrarMensagem("Erro ao ler a folha.", "erro");
  }
}

function garantirTesseractStable() {
  if (typeof Tesseract !== "undefined") return Promise.resolve();
  if (window.__appBragaTesseractPromise) return window.__appBragaTesseractPromise;
  mostrarOCRStatusStable("A preparar leitura OCR...");
  window.__appBragaTesseractPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Biblioteca OCR não carregada."));
    document.head.appendChild(script);
  });
  return window.__appBragaTesseractPromise;
}
function confirmarSerie3DigitosStable() {
  const valor = ((el("serial3Input") && el("serial3Input").value) || "").trim().toUpperCase();

  if (valor.length !== 3) {
    mostrarMensagem("Introduza exatamente 3 dígitos.", "erro");
    return;
  }

  const printer = procurarImpressoraPorUltimos3DigitosStable(valor);
  if (!printer) {
    mostrarMensagem("Nenhuma impressora encontrada com esses 3 dígitos.", "erro");
    return;
  }

  if (el("localizacao")) {
    setSelectValueAppBraga(el("localizacao"), montarTextoLocalizacaoStable(printer));
  }

  fecharSerie3DigitosStable();
  mostrarMensagem("Localização selecionada com sucesso.");
}

window.startScanner = startScannerStable;
window.stopScanner = stopScannerStable;
window.abrirOCR = abrirOCRStable;
window.processarOCRInput = processarOCRInputStable;
window.confirmarSerie3Digitos = confirmarSerie3DigitosStable;
window.fecharSerie3Digitos = fecharSerie3DigitosStable;
document.addEventListener("DOMContentLoaded", () => {
  if (el("localizacao") && el("equipamento") && el("cor")) {
    prepararCodigoEtiquetaTonerAppBraga(false);
    carregarLocalizacoesImpressorasNoFormularioAppBraga();
    preencherDataAtualSeVaziaStable();
  }
});


/* =========================
   ETIQUETA WORD AUTOMÁTICA
========================= */
function formatDatePTAppBraga(valor) {
  const raw = String(valor || "").trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }

  return raw;
}

function extrairDadosEtiquetaWord() {
  const loc = (el("localizacao") && el("localizacao").value) || "";
  const dataFolha = (el("dataFolha") && el("dataFolha").value) || "";
  const dataScan = (el("data") && el("data").value) || "";
  const rawSdsRef = (el("sdsRef") && el("sdsRef").value) || "";
  const sdsRef = /^S\d{7,12}$/i.test(String(rawSdsRef).trim()) ? String(rawSdsRef).trim().toUpperCase() : "";
  const codigoEtiqueta = getCodigoEtiquetaAtualAppBraga();

  let serie = "";
  let localCurto = "";
  let armazem = "";

  const parts = loc.split(" - ").map(v => v.trim()).filter(Boolean);
  if (parts.length >= 3) {
    serie = parts[0] || "";
    armazem = parts[1] || "";
    localCurto = parts.slice(2).join(" - ");
  } else {
    localCurto = loc || "Sem Localização";
  }

  const dataEtiqueta = formatDatePTAppBraga(dataFolha || dataScan);

  return {
    serie: serie || "SEM SÉRIE",
    localCurto: localCurto || "Sem Localização",
    armazem: armazem || "",
    dataEtiqueta: dataEtiqueta || formatDatePTAppBraga(dataScan) || "Sem Data",
    sdsRef: sdsRef.trim(),
    codigoEtiqueta,
    codigoScan: buildPayloadQrTonerAppBraga(codigoEtiqueta)
  };
}

async function gerarWordEtiquetaFromForm(auto = false) {
  try {
    if (typeof docx === "undefined") {
      if (!auto) mostrarMensagem("Biblioteca Word não carregada.", "erro");
      return false;
    }

    const dados = extrairDadosEtiquetaWord();

    if (!dados.localCurto || !dados.serie) {
      if (!auto) mostrarMensagem("Faltam dados para gerar a etiqueta Word.", "erro");
      return false;
    }

    const {
      Document,
      Packer,
      Paragraph,
      AlignmentType,
      TextRun,
      ImageRun,
      HeadingLevel
    } = docx;
    const qrDataUrl = await gerarQrDataUrlAppBraga(dados.codigoScan, 220);
    const qrRun = qrDataUrl && ImageRun ? new ImageRun({
      data: dataUrlToUint8ArrayAppBraga(qrDataUrl),
      transformation: { width: 120, height: 120 }
    }) : null;

    const doc = new Document({
      creator: "App Braga",
      title: "Etiqueta Toner",
      description: "Etiqueta gerada automaticamente pelo scan OCR",
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 3200, after: 500 },
              children: [
                new TextRun({
                  text: dados.localCurto,
                  bold: true,
                  size: 42
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 2800 },
              children: [
                new TextRun({
                  text: dados.serie,
                  bold: true,
                  size: 64
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 200 },
              children: [
                new TextRun({
                  text: dados.dataEtiqueta,
                  bold: true,
                  size: 56
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 160, after: 160 },
              children: qrRun ? [qrRun] : [
                new TextRun({
                  text: dados.codigoEtiqueta,
                  bold: true,
                  size: 24
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [
                new TextRun({
                  text: dados.codigoEtiqueta,
                  bold: true,
                  size: 22
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 0 },
              children: [
                new TextRun({
                  text: dados.sdsRef ? `SDS Ref: ${dados.sdsRef}` : "",
                  bold: true,
                  size: 18
                })
              ]
            })
          ]
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `Etiqueta_${dados.localCurto.replace(/\s+/g, "_")}_${dados.serie}.docx`;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1200);

    await guardarEtiquetaPartilhada({ origem: auto ? "scan" : "manual", codigoEtiqueta: dados.codigoEtiqueta, codigoScan: dados.codigoScan, sdsRef: dados.sdsRef });

    if (!auto) {
      mostrarMensagem("Etiqueta Word gerada com sucesso.");
    }
    return true;
  } catch (error) {
    console.error("Erro ao gerar Word:", error);
    if (!auto) mostrarMensagem("Erro ao gerar a etiqueta Word.", "erro");
    return false;
  }
}

window.gerarWordEtiquetaFromForm = gerarWordEtiquetaFromForm;



/* =========================
   PORTAS FIREBASE FALLBACK + MIGRAÇÃO
========================= */
async function migrarPortasParaFirebase() {
  if (!window.db) {
    mostrarMensagem("Firebase não está disponível.", "erro");
    return;
  }

  try {
    const snap = await db.collection("portas").get();
    if (!snap.empty) {
      mostrarMensagem("A coleção portas já tem dados. Migração não necessária.");
      return;
    }

    for (const p of window.portasData) {
      const payload = {
        porta: p.porta || "",
        local: p.local || "",
        user: p.user || "",
        equipamento: p.equipamento || "",
        ip: p.ip || "",
        created: new Date()
      };
      await db.collection("portas").add(payload);
    }

    mostrarMensagem("Migração das portas concluída com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao migrar portas para Firebase.", "erro");
  }
}

async function carregarPortasComFallback() {
  if (!window.db) {
    carregarPortasLocal();
    renderPortas(window.portasData);
    return;
  }
  if (!appBragaIsPage("portas.html")) return;
  if (typeof window.iniciarPortas === "function") return;

  try {
    appBragaBindFirestoreListener("portas-realtime", true, () => db.collection("portas").onSnapshot(snap => {
      if (snap.empty) {
        carregarPortasLocal();
        renderPortas(window.portasData);
        const countEl = document.getElementById("countPortas");
        if (countEl) countEl.innerText = String(window.portasData.length);
        return;
      }

      window.portasData = snap.docs.map(doc => ({ idDoc: doc.id, ...({ firebaseId: doc.id, ...doc.data() }) }));

      window.portasData.sort((a,b)=>{

        const aTxt =
          String(a.porta || a.nome || "")
            .toLowerCase()
            .trim();

        const bTxt =
          String(b.porta || b.nome || "")
            .toLowerCase()
            .trim();

        return aTxt.localeCompare(
          bTxt,
          'pt',
          {
            numeric:true,
            sensitivity:'base'
          }
        );

      });

      prepararRefsPortas();
      guardarPortasLocal();
      renderPortas(window.portasData);
    }, error => {
      console.error(error);
      renderPortas(window.portasData);
    }));
  } catch (e) {
    console.error(e);
    renderPortas(window.portasData);
  }
}

window.migrarPortasParaFirebase = migrarPortasParaFirebase;

window.addEventListener("DOMContentLoaded", () => {
  const host = document.getElementById("listaPortas");
  if (host) {
    setTimeout(() => {
      try { carregarPortasComFallback(); } catch (e) { console.error(e); }
    }, 400);
  }
});


/* ===== AUTO UPDATE PRO FINAL ===== */
const APP_REMOTE_BASE = "https://picafern-commits.github.io/App-Tablet/";
function appVersionUrlAppBraga() {
  return APP_REMOTE_BASE + "version.json?t=" + Date.now();
}

async function registarServiceWorkerAppBraga() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const swUrl = location.pathname.includes("/html/") ? "../sw.js" : "sw.js";
    const registration = await navigator.serviceWorker.register(swUrl);
    await registration.update?.();
    return registration;
  } catch (e) {
    console.error("Erro a registar service worker", e);
  }
}

async function verificarAtualizacao() {
  try {
    atualizarVersaoUI(APP_VERSION);
    finalizarAtualizacaoSeAplicadaAppBraga();
    const isGithubPages = location.hostname === "picafern-commits.github.io";
    if (!isGithubPages) return;

    const res = await fetch(appVersionUrlAppBraga(), {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
      }
    });

    const data = await res.json();

    if (data && data.version && data.version !== APP_VERSION) {
      mostrarAvisoAtualizacaoDisponivel(data.version);
    } else {
      document.getElementById("updateBoxAppBraga")?.remove();
      document.getElementById("updateOverlayAppBraga")?.remove();
    }
  } catch (e) {
    console.error("Erro a verificar updates", e);
    atualizarVersaoUI(APP_VERSION);
  }
}

function atualizarVersaoUI(versionValue = APP_VERSION) {
  const nodes = document.querySelectorAll("#appVersion, .version-pill");
  nodes.forEach((node) => {
    if (!node) return;
    node.innerText = "v" + versionValue + " Premium";
    node.title = "Versao atual da app";
  });
  atualizarVersaoFixaAppBraga(versionValue);
}

function atualizarVersaoFixaAppBraga(versionValue = APP_VERSION) {
  if (!document.body) return;
  let node = document.getElementById("appBragaVersionFixed");
  if (!node) {
    node = document.createElement("div");
    node.id = "appBragaVersionFixed";
    node.className = "app-braga-version-fixed";
    document.body.appendChild(node);
  }
  node.innerHTML = `<span>Versao</span><strong>v${versionValue}</strong>`;
  node.title = `App Braga v${versionValue}`;
}

function getUpdateTargetVersionAppBraga() {
  try {
    return sessionStorage.getItem("appUpdateTargetVersion") || getCookieAppBraga("appUpdateTargetVersion") || "";
  } catch (error) {
    return getCookieAppBraga("appUpdateTargetVersion") || "";
  }
}

function setUpdateTargetVersionAppBraga(version) {
  try { sessionStorage.setItem("appUpdateTargetVersion", version); } catch (error) {}
  setCookieAppBraga("appUpdateTargetVersion", version, 600);
}

function clearUpdateTargetVersionAppBraga() {
  try { sessionStorage.removeItem("appUpdateTargetVersion"); } catch (error) {}
  deleteCookieAppBraga("appUpdateTargetVersion");
}

function finalizarAtualizacaoSeAplicadaAppBraga() {
  const target = getUpdateTargetVersionAppBraga();
  if (!target || target !== APP_VERSION) return;
  clearUpdateTargetVersionAppBraga();
  deleteCookieAppBraga("appUpdateDismissedVersion");
  document.getElementById("updateBoxAppBraga")?.remove();
  document.getElementById("updateOverlayAppBraga")?.remove();
  const url = new URL(window.location.href);
  if (url.searchParams.has("update") || url.searchParams.has("v")) {
    url.searchParams.delete("update");
    url.searchParams.delete("v");
    window.history.replaceState({}, "", url.toString());
  }
  if (typeof mostrarMensagem === "function") {
    setTimeout(() => mostrarMensagem(`App atualizada para v${APP_VERSION}.`, "sucesso"), 500);
  }
}

function mostrarAvisoAtualizacaoDisponivel(novaVersao) {
  if (getCookieAppBraga("appUpdateDismissedVersion") === String(novaVersao)) return;
  let box = document.getElementById("updateBoxAppBraga");

  if (!box) {
    box = document.createElement("div");
    box.id = "updateBoxAppBraga";
    box.className = "update-box-appbraga";
    document.body.appendChild(box);
  }
  box.dataset.version = novaVersao;

  box.innerHTML = `
    <div class="update-title">Atualizacao disponivel</div>
    <div class="update-subtitle">
      Existe uma versao nova. Podes atualizar agora ou continuar a trabalhar.<br><br>
      Atual: v${APP_VERSION} Premium<br>
      Nova: v${novaVersao} Premium
    </div>
    <div class="update-progress-appbraga" aria-hidden="true">
      <span><i style="width:0%"></i></span>
      <small>Pronta para atualizar</small>
    </div>
    <div class="update-actions">
      <button class="ghost-btn" onclick="fecharAvisoAtualizacao()">Continuar</button>
      <button class="primary-btn" onclick="atualizarAppObrigatorio('${String(novaVersao).replace(/'/g, "\\'")}')">Atualizar agora</button>
    </div>
  `;
}

function atualizarProgressoUpdateAppBraga(percent, text) {
  const box = document.getElementById("updateBoxAppBraga");
  if (!box) return;
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const bar = box.querySelector(".update-progress-appbraga i");
  const label = box.querySelector(".update-progress-appbraga small");
  if (bar) bar.style.width = `${safePercent}%`;
  if (label) label.textContent = text || `${safePercent}%`;
}

function waitAppBraga(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function esperarServiceWorkerControlarAppBraga(timeoutMs = 1600) {
  if (!("serviceWorker" in navigator)) return;
  await Promise.race([
    new Promise((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
    }),
    waitAppBraga(timeoutMs)
  ]);
}

function fecharAvisoAtualizacao() {
  const overlay = document.getElementById("updateOverlayAppBraga");
  const box = document.getElementById("updateBoxAppBraga");
  if (box?.dataset.version) setCookieAppBraga("appUpdateDismissedVersion", box.dataset.version, 86400);
  if (overlay) overlay.remove();
  if (box) box.remove();
  document.body.style.overflow = "";
}

async function ativarServiceWorkerNovoAppBraga() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map(async (reg) => {
    try {
      await reg.update?.();
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    } catch (error) {
      console.error("Erro a ativar service worker novo:", error);
    }
  }));
}

async function limparCacheAtualizacaoAppBraga() {
  try {
    await ativarServiceWorkerNovoAppBraga();
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => {
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        return Promise.resolve();
      }));
    }
  } catch (error) {
    console.error("Erro a limpar service worker:", error);
  }

  try {
    if (window.caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.error("Erro a limpar cache:", error);
  }

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister().catch(() => false)));
    }
  } catch (error) {
    console.error("Erro a remover service worker antigo:", error);
  }
}

async function atualizarAppObrigatorio(novaVersao = "") {
  const box = document.getElementById("updateBoxAppBraga");
  const versaoDestino = String(novaVersao || box?.dataset.version || APP_VERSION || Date.now()).trim();
  if (box?.dataset.updating === "1") return;
  if (box) {
    box.dataset.updating = "1";
    box.classList.add("is-updating");
    box.innerHTML = `
      <div class="update-title">A atualizar...</div>
      <div class="update-subtitle">A preparar a versao ${versaoDestino}. Mantem esta pagina aberta.</div>
      <div class="update-progress-appbraga" role="progressbar" aria-label="Progresso da atualizacao">
        <span><i style="width:4%"></i></span>
        <small>A iniciar...</small>
      </div>
      <div class="update-actions">
        <button class="primary-btn" type="button" disabled>A atualizar</button>
      </div>
    `;
  }

  deleteCookieAppBraga("appUpdateDismissedVersion");
  setUpdateTargetVersionAppBraga(versaoDestino);
  const targetUrl = new URL(window.location.href);
  targetUrl.searchParams.set("v", versaoDestino);
  targetUrl.searchParams.set("app", versaoDestino);
  targetUrl.searchParams.set("update", String(Date.now()));
  const target = targetUrl.toString();
  const currentBefore = window.location.href;

  try {
    atualizarProgressoUpdateAppBraga(12, "A procurar a nova versao...");
    await registarServiceWorkerAppBraga();
    await waitAppBraga(250);
    atualizarProgressoUpdateAppBraga(32, "A limpar ficheiros antigos...");
    await limparCacheAtualizacaoAppBraga();
    atualizarProgressoUpdateAppBraga(58, "A ativar a nova app...");
    await esperarServiceWorkerControlarAppBraga();
    atualizarProgressoUpdateAppBraga(78, "A confirmar ficheiros novos...");
    await fetch(appVersionUrlAppBraga(), { cache: "no-store" }).catch(() => null);
    await fetch(APP_REMOTE_BASE + "js/app.js?v=" + encodeURIComponent(versaoDestino) + "&t=" + Date.now(), { cache: "no-store" }).catch(() => null);
    atualizarProgressoUpdateAppBraga(100, "Atualizacao pronta. A abrir...");
    await waitAppBraga(450);
  } finally {
    try {
      window.location.replace(target);
    } catch (e) {
      console.error("replace falhou", e);
    }

    setTimeout(() => {
      if (window.location.href === currentBefore) {
        try {
          window.location.href = target;
        } catch (e) {
          console.error("href falhou", e);
        }
      }
    }, 1200);

    setTimeout(() => {
      if (window.location.href === currentBefore) {
        try {
          const a = document.createElement("a");
          a.href = target;
          a.target = "_self";
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (e) {
          console.error("link fallback falhou", e);
        }
      }
    }, 2200);
  }
}

window.addEventListener("load", () => {
  atualizarVersaoUI(APP_VERSION);
  verificarAtualizacao();
});

/* ===== App Braga Firebase Notifications Rebuild v1.40.0 ===== */
(function initFirebaseNotificationsRebuild() {
  "use strict";

  const PUBLIC_VAPID = "BE2xnhqmSPq85_kA6comGATxEseSoh8zY_EK_4NZsbiI1HJByjc1PgQqhTsUwPlr1ujuUSpSzp29AQeS1hnlHOQ";
  const DEVICE_COLLECTION = "notificationDevices";
  const INBOX_COLLECTION = "notificationInbox";
  const HISTORY_COLLECTION = "notificationHistory";
  const DEVICE_ID_KEY = "appBraga.firebaseNotificationDeviceId";
  const DEVICE_PROFILE_KEY = "appBraga.firebaseNotificationProfile";
  const PROCESSED_INBOX_KEY = "appBraga.firebaseNotificationInboxSeen";
  const CLOUD_URL = "https://europe-west1-toner-manager-756c4.cloudfunctions.net/sendNotificationBroadcast";
  const HEALTH_URL = "https://europe-west1-toner-manager-756c4.cloudfunctions.net/notificationHealth";
  const startedAt = Date.now();
  let inboxUnsubscribe = null;

  function isNotificationsPage() {
    return /notificacoes\.html$/i.test(location.pathname || "");
  }

  function dbReady() {
    return window.db && typeof window.db.collection === "function";
  }

  function deviceId() {
    let id = "";
    try { id = localStorage.getItem(DEVICE_ID_KEY) || ""; } catch {}
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`);
      try { localStorage.setItem(DEVICE_ID_KEY, id); } catch {}
    }
    return id;
  }

  function profile() {
    try {
      const stored = JSON.parse(localStorage.getItem(DEVICE_PROFILE_KEY) || "{}");
      if (stored && typeof stored === "object") return stored;
    } catch {}
    return {};
  }

  function saveProfile(next) {
    const merged = { ...profile(), ...next };
    try { localStorage.setItem(DEVICE_PROFILE_KEY, JSON.stringify(merged)); } catch {}
    return merged;
  }

  function platformInfo() {
    const ua = navigator.userAgent || "";
    const electron = !!window.electronAPI;
    const ios = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
    const role = profile().role || (electron ? "pc-casa" : (ios ? "iphone" : (android ? "android" : "pc-empresa")));
    return {
      electron,
      ios,
      android,
      standalone,
      role,
      browser: navigator.userAgentData?.brands?.map((b) => b.brand).join(", ") || ua.slice(0, 120)
    };
  }

  function defaultDeviceName() {
    const info = platformInfo();
    if (info.role === "pc-casa") return "PC de Casa";
    if (info.role === "pc-empresa") return "PC de Empresa";
    if (info.role === "iphone") return "iPhone";
    if (info.role === "android") return "Android";
    return info.electron ? "PC Electron" : "Dispositivo";
  }

  function setText(id, text, state = "") {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = text;
    node.dataset.state = state;
  }

  function b64ToUint8(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
  }

  async function ensureServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;
    const swUrl = new URL("../sw.js", location.href);
    await navigator.serviceWorker.register(swUrl.href, { scope: "../" }).catch(() => null);
    return navigator.serviceWorker.ready.catch(() => null);
  }

  async function loadMessagingCompat() {
    if (window.firebase?.messaging) return true;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-firebase-messaging]");
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js";
      script.dataset.firebaseMessaging = "1";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return !!window.firebase?.messaging;
  }

  async function requestPermission() {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return Notification.requestPermission();
  }

  async function registerWebPush(registration) {
    if (!window.isSecureContext || !registration || !("PushManager" in window)) return null;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToUint8(PUBLIC_VAPID)
      });
    }
    return subscription.toJSON();
  }

  async function registerFcm(registration) {
    try {
      await loadMessagingCompat();
      if (!window.firebase?.messaging || !registration) return "";
      const supported = typeof window.firebase.messaging.isSupported === "function"
        ? await Promise.resolve(window.firebase.messaging.isSupported()).catch(() => false)
        : true;
      if (!supported) return "";
      return await window.firebase.messaging().getToken({
        vapidKey: PUBLIC_VAPID,
        serviceWorkerRegistration: registration
      });
    } catch (error) {
      console.warn("FCM indisponivel neste dispositivo:", error);
      return "";
    }
  }

  async function registerCurrentDevice(options = {}) {
    if (!dbReady()) throw new Error("Firebase/Firestore ainda nao esta pronto.");
    const info = platformInfo();
    const permission = await requestPermission();
    if (permission !== "granted" && !info.electron) throw new Error("Permissao de notificacoes nao concedida.");
    if (info.ios && !info.standalone) {
      throw new Error("No iPhone, abre pelo icone instalado no ecra principal para receber push.");
    }

    const registration = await ensureServiceWorker();
    const webPush = await registerWebPush(registration).catch((error) => {
      console.warn("Web Push standard indisponivel:", error);
      return null;
    });
    const fcmToken = await registerFcm(registration);
    const currentProfile = saveProfile({
      name: options.name || document.getElementById("firebaseNotifyDeviceName")?.value || profile().name || defaultDeviceName(),
      role: options.role || document.getElementById("firebaseNotifyDeviceRole")?.value || profile().role || info.role
    });
    const id = deviceId();
    const payload = {
      deviceId: id,
      enabled: true,
      deviceName: currentProfile.name,
      deviceRole: currentProfile.role,
      platform: info.electron ? "electron" : (info.ios ? "ios-safari" : (info.android ? "android-chrome" : "web")),
      electron: info.electron,
      desktopInbox: info.electron || (!webPush && !fcmToken),
      ios: info.ios,
      android: info.android,
      standalone: info.standalone,
      permission,
      webPush: webPush || null,
      fcmToken: fcmToken || "",
      publicVapidKey: PUBLIC_VAPID,
      userAgent: navigator.userAgent || "",
      browser: info.browser,
      appVersion: APP_VERSION,
      updatedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    await window.db.collection(DEVICE_COLLECTION).doc(id).set(payload, { merge: true });
    startInboxListener();
    renderNotificationsPage();
    return payload;
  }

  function processedIds() {
    try { return new Set(JSON.parse(localStorage.getItem(PROCESSED_INBOX_KEY) || "[]")); } catch { return new Set(); }
  }

  function rememberProcessed(id) {
    const set = processedIds();
    set.add(id);
    const last = [...set].slice(-80);
    try { localStorage.setItem(PROCESSED_INBOX_KEY, JSON.stringify(last)); } catch {}
  }

  async function showLocalNotification(item = {}) {
    const title = item.title || "App Braga";
    const body = item.body || "";
    if (window.electronAPI?.showNotification) {
      await window.electronAPI.showNotification({ title, body, tag: item.tag || item.requestId || "" });
      return true;
    }
    const registration = await ensureServiceWorker();
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        tag: item.tag || item.requestId || "app-braga",
        icon: "../icon-192.png",
        badge: "../icon-192.png",
        data: { url: item.url || "html/index.html" }
      });
      return true;
    }
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, tag: item.tag || item.requestId || "app-braga" });
      return true;
    }
    return false;
  }

  function startInboxListener() {
    if (!dbReady() || inboxUnsubscribe) return;
    const id = deviceId();
    inboxUnsubscribe = window.db.collection(INBOX_COLLECTION)
      .where("deviceId", "==", id)
      .where("read", "==", false)
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "removed") return;
          const seen = processedIds();
          if (seen.has(change.doc.id)) return;
          const data = change.doc.data() || {};
          const created = Number(data.createdAt?.toMillis?.() || data.createdAt || 0);
          if (created && created < startedAt - 60000) return;
          rememberProcessed(change.doc.id);
          await showLocalNotification(data).catch(console.warn);
          await change.doc.ref.set({ read: true, readAt: Date.now() }, { merge: true }).catch(() => null);
        });
      }, (error) => console.warn("Inbox notificacoes indisponivel:", error));
  }

  function roleLabel(value) {
    return {
      "pc-casa": "PC de Casa",
      "pc-empresa": "PC de Empresa",
      iphone: "iPhone",
      android: "Android"
    }[String(value || "")] || String(value || "Dispositivo");
  }

  function formatDeviceTime(value) {
    const ms = Number(value?.toMillis?.() || value || 0);
    if (!ms) return "Sem contacto";
    return new Date(ms).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function deviceReadiness(item = {}) {
    const hasWebPush = !!(item.webPush?.endpoint && item.webPush?.keys?.p256dh && item.webPush?.keys?.auth);
    const hasFcm = !!item.fcmToken;
    const hasInbox = item.desktopInbox === true || item.electron === true;
    const permission = String(item.permission || "").toLowerCase();
    if (item.enabled === false) return { label: "Desligado", state: "bad", channel: "Sem envio" };
    if (permission === "denied") return { label: "Bloqueado", state: "bad", channel: "Permissao negada" };
    if (hasWebPush) return { label: "Pronto", state: "ok", channel: "Web Push" };
    if (hasFcm) return { label: "Pronto", state: "ok", channel: "FCM" };
    if (hasInbox) return { label: "Inbox desktop", state: "warn", channel: "App aberta" };
    return { label: "Reparar", state: "warn", channel: "Sem push" };
  }


  function notificationAlertTitleFromMessageAppBraga(message = "") {
    const text = String(message || "").trim();
    if (text.startsWith("📞")) return "📞 Preciso de ajuda - App Braga";
    if (text.startsWith("📦")) return "📦 Armazém - App Braga";
    if (text.startsWith("🖨️") || text.startsWith("🖨")) return "🖨️ Impressoras - App Braga";
    if (text.startsWith("🚚")) return "🚚 Logística - App Braga";
    return "🚨 Alerta geral - App Braga";
  }

  async function sendBroadcast(kind = "test", targetDevice = null) {
    const message = document.getElementById("firebaseNotifyMessage")?.value || "";
    const id = deviceId();
    const targetId = targetDevice?.deviceId || targetDevice?.id || "";
    const payload = {
      requestId: `app-${kind}-${Date.now()}`,
      senderDeviceId: targetId ? "" : id,
      targetDeviceId: targetId,
      title: kind === "alert" ? notificationAlertTitleFromMessageAppBraga(message) : (targetId ? `Teste ${targetDevice?.deviceName || "dispositivo"}` : "Teste App Braga"),
      body: message || (kind === "alert" ? "Alerta enviado pela App Braga." : "Teste de notificacoes Firebase."),
      url: "https://picafern-commits.github.io/App-Tablet/html/index.html",
      tag: targetId ? `app-braga-${kind}-${targetId}` : `app-braga-${kind}`
    };
    setText("firebaseNotifyLastResult", targetId ? `A testar ${targetDevice?.deviceName || targetId}...` : "A enviar pela Firebase...", "warn");
    let response;
    try {
      response = await fetch(CLOUD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new Error(`Nao consegui ligar a Cloud Function. Verifica deploy, acesso publico/CORS e quota Firebase. Detalhe: ${error.message || error}`);
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || result.errors?.[0]?.error || `Function respondeu ${response.status}`);
    }
    setText("firebaseNotifyLastResult", `Enviadas: ${result.sent || 0} | Inbox: ${result.inboxWritten || 0} | Falhas: ${result.failed || 0} | Ignorados: ${result.ignored || 0}`, Number(result.failed || 0) ? "warn" : "ok");
    await refreshLists();
    return result;
  }

  async function healthCheck() {
    setText("firebaseNotifyCloudStatus", "A verificar...", "warn");
    let response;
    try {
      response = await fetch(HEALTH_URL, { method: "POST" });
    } catch (error) {
      throw new Error(`Nao consegui ligar a Cloud Function. Verifica deploy, acesso publico/CORS e quota Firebase. Detalhe: ${error.message || error}`);
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) throw new Error(result.error || "Cloud Functions nao responderam.");
    setText("firebaseNotifyCloudStatus", `Cloud OK - ${result.activeDevices || 0} dispositivo(s)`, "ok");
    return result;
  }

  async function refreshLists() {
    if (!isNotificationsPage() || !dbReady()) return;
    const devicesHost = document.getElementById("firebaseNotifyDevices");
    const historyHost = document.getElementById("firebaseNotifyHistory");
    const devices = await window.db.collection(DEVICE_COLLECTION).get();
    const rows = [];
    devices.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));
    rows.sort((a, b) => String(a.deviceRole || "").localeCompare(String(b.deviceRole || "")) || String(a.deviceName || "").localeCompare(String(b.deviceName || "")));
    if (devicesHost) {
      devicesHost.innerHTML = rows.length ? rows.map((item) => {
        const readiness = deviceReadiness(item);
        const isThis = item.deviceId === deviceId();
        const lastSeen = formatDeviceTime(item.lastSeenAt || item.updatedAt || item.createdAt);
        return `
          <article class="notification-device-card ${isThis ? "is-current" : ""}" data-device-id="${escapeHtmlAppBraga(item.deviceId || item.id)}">
            <div>
              <strong>${escapeHtmlAppBraga(item.deviceName || item.deviceId || item.id)}</strong>
              <small>${escapeHtmlAppBraga(roleLabel(item.deviceRole))} - ${escapeHtmlAppBraga(item.platform || "")}</small>
              <small>Ultimo contacto: ${escapeHtmlAppBraga(lastSeen)}</small>
              <small data-technical-detail>Device ID: ${escapeHtmlAppBraga(item.deviceId || item.id)}</small>
            </div>
            <span class="notification-chip ${readiness.state}">${escapeHtmlAppBraga(readiness.label)}</span>
            <span class="notification-chip">${escapeHtmlAppBraga(readiness.channel)}</span>
            ${isThis ? `<span class="notification-chip ok">Este dispositivo</span>` : ""}
            <button class="secondary-btn small-btn" type="button" data-firebase-test-device="${escapeHtmlAppBraga(item.deviceId || item.id)}">Testar</button>
          </article>
        `;
      }).join("") : `<div class="empty-state mini">Sem dispositivos registados.</div>`;
      devicesHost.querySelectorAll("[data-firebase-test-device]").forEach((button) => {
        button.addEventListener("click", async () => {
          const target = rows.find((item) => String(item.deviceId || item.id) === button.getAttribute("data-firebase-test-device"));
          try {
            button.disabled = true;
            button.textContent = "A testar...";
            await sendBroadcast("device-test", target);
          } catch (error) {
            setText("firebaseNotifyLastResult", error.message || "Erro ao testar dispositivo.", "bad");
          } finally {
            button.disabled = false;
            button.textContent = "Testar";
          }
        });
      });
    }
    if (historyHost) {
      const history = await window.db.collection(HISTORY_COLLECTION).get().catch(() => null);
      const items = [];
      history?.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      items.sort((a, b) => Number(b.createdAt?.toMillis?.() || b.createdAt || 0) - Number(a.createdAt?.toMillis?.() || a.createdAt || 0));
      historyHost.innerHTML = items.slice(0, 10).map((item) => `
        <article class="notification-history-item">
          <strong>${escapeHtmlAppBraga(item.title || "Envio")}</strong>
          <div class="notification-history-stats">
            <span class="notification-chip ok">Enviadas: ${Number(item.sent || 0)}</span>
            <span class="notification-chip">Inbox: ${Number(item.inboxWritten || 0)}</span>
            <span class="notification-chip ${Number(item.failed || 0) ? "bad" : "ok"}">Falhas: ${Number(item.failed || 0)}</span>
          </div>
        </article>
      `).join("") || `<div class="empty-state mini">Sem historico ainda.</div>`;
    }
  }

  function renderNotificationsPage() {
    if (!isNotificationsPage()) return;
    const p = profile();
    const info = platformInfo();
    const nameInput = document.getElementById("firebaseNotifyDeviceName");
    const roleInput = document.getElementById("firebaseNotifyDeviceRole");
    if (nameInput && !nameInput.value) nameInput.value = p.name || defaultDeviceName();
    if (roleInput) roleInput.value = p.role || info.role;
    setText("firebaseNotifyDeviceId", deviceId(), "ok");
    setText("firebaseNotifyEnvironment", info.electron ? "Electron desktop" : (info.ios ? "iPhone Safari/PWA" : (info.android ? "Android Chrome/PWA" : "Web/PWA")), "ok");
    const permission = "Notification" in window ? Notification.permission : "sem Notification";
    setText("firebaseNotifyPermission", permission, permission === "granted" ? "ok" : "warn");
  }

  function bindPage() {
    if (!isNotificationsPage()) return;
    renderNotificationsPage();
    document.querySelector("[data-firebase-notify-register]")?.addEventListener("click", async () => {
      try {
        setText("firebaseNotifyLastResult", "A registar dispositivo...", "warn");
        const item = await registerCurrentDevice({ force: true });
        setText("firebaseNotifyLastResult", `Dispositivo registado: ${item.deviceName}`, "ok");
      } catch (error) {
        setText("firebaseNotifyLastResult", error.message || "Erro ao registar.", "bad");
      }
    });
    document.querySelector("[data-firebase-notify-test]")?.addEventListener("click", async () => {
      try { await sendBroadcast("test"); } catch (error) { setText("firebaseNotifyLastResult", error.message || "Erro no teste.", "bad"); }
    });
    document.querySelector("[data-firebase-notify-alert]")?.addEventListener("click", async () => {
      try { await sendBroadcast("alert"); } catch (error) { setText("firebaseNotifyLastResult", error.message || "Erro no alerta.", "bad"); }
    });
    document.querySelector("[data-firebase-notify-health]")?.addEventListener("click", async () => {
      try { await healthCheck(); } catch (error) { setText("firebaseNotifyCloudStatus", error.message || "Cloud indisponivel.", "bad"); }
    });
    document.querySelector("[data-firebase-notify-refresh]")?.addEventListener("click", refreshLists);
    setTimeout(refreshLists, 800);
  }

  function boot() {
    bindPage();
    if (dbReady()) {
      startInboxListener();
      if (window.electronAPI) {
        registerCurrentDevice({ name: profile().name || defaultDeviceName(), role: profile().role || platformInfo().role }).catch(() => null);
      }
    }
  }

  window.AppBragaFirebaseNotifications = {
    registerCurrentDevice,
    sendBroadcast,
    healthCheck,
    refreshLists,
    deviceId
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 600));
  else setTimeout(boot, 600);
})();
window.fecharAvisoAtualizacao = fecharAvisoAtualizacao;
window.atualizarAppObrigatorio = atualizarAppObrigatorio;



/* ===== CRUD EXTRA: Portas, Users, Pistolas ===== */
function itemPorRef(lista, ref) {
 if (typeof ref === "string") {
   return lista.find(i =>
     i.idDoc === ref ||
     i._ref === ref ||
     i.firebaseId === ref
   ) || null;
 }
 const idx = Number(ref);
 return Number.isNaN(idx)
   ? null
   : (lista[idx] || null);
}

function idxPorRef(lista, ref) {
  if (typeof ref === "string") {
    return lista.findIndex(i => i.idDoc === ref || i._ref === ref || i.firebaseId === ref);
  }
  const idx = Number(ref);
  return Number.isNaN(idx) ? -1 : idx;
}

/* Portas */
let portaEditRef = null;

function abrirAdicionarPorta() {
  portaEditRef = "__new__";
  [["editPorta",""],["editLocal",""],["editUser",""],["editEquipamento",""],["editIP",""]].forEach(([id,v]) => { const node = el(id); if (node) node.value = v; });
  const h3 = document.querySelector('#modalEditarPorta h3'); if (h3) h3.textContent = 'Adicionar Porta';
  const sub = document.querySelector('#modalEditarPorta .section-subtitle'); if (sub) sub.textContent = 'Criar uma nova porta de rede';
  if (el("modalEditarPorta")) el("modalEditarPorta").style.display = "flex";
}

function editarPorta(ref) {
  const item = itemPorRef(window.portasData, ref);
  if (!item) return mostrarMensagem("Porta não encontrada.", "erro");
  portaEditRef = ref;
  if (el("editPorta")) el("editPorta").value = item.porta || "";
  if (el("editLocal")) el("editLocal").value = item.local || "";
  if (el("editUser")) el("editUser").value = item.user || "";
  if (el("editEquipamento")) el("editEquipamento").value = item.equipamento || "";
  if (el("editIP")) el("editIP").value = item.ip || "";
  if (el("modalEditarPorta")) el("modalEditarPorta").style.display = "flex";
}

function fecharEditarPorta() {
  portaEditRef = null;
  const h3 = document.querySelector('#modalEditarPorta h3'); if (h3) h3.textContent = 'Editar Porta';
  const sub = document.querySelector('#modalEditarPorta .section-subtitle'); if (sub) sub.textContent = 'Editar a porta selecionada';
  if (el("modalEditarPorta")) el("modalEditarPorta").style.display = "none";
}

async function guardarEdicaoPorta() {
  if (portaEditRef === null || typeof portaEditRef === "undefined") return mostrarMensagem("Nenhuma porta selecionada.", "erro");
  const isNovaPorta = portaEditRef === "__new__";
  const payload = {
    porta: el("editPorta") ? el("editPorta").value : "",
    local: el("editLocal") ? el("editLocal").value : "",
    user: el("editUser") ? el("editUser").value : "",
    equipamento: el("editEquipamento") ? el("editEquipamento").value : "",
    ip: el("editIP") ? el("editIP").value : ""
  };

  try {
    if (isNovaPorta) {
      if (window.db) {
        const docRef = await db.collection("portas").add(payload);
        window.portasData.unshift({ idDoc: docRef.id, ...payload });
      } else {
        window.portasData.unshift({ _ref: `local-porta-${Date.now()}`, ...payload });
      }
    } else if (typeof portaEditRef === "string" && window.db) {
      await db.collection("portas").doc(portaEditRef).update(payload);
      const idx = idxPorRef(window.portasData, portaEditRef);
      if (idx >= 0) window.portasData[idx] = { ...window.portasData[idx], ...payload };
    } else {
      const idx = idxPorRef(window.portasData, portaEditRef);
      if (idx >= 0) window.portasData[idx] = { ...window.portasData[idx], ...payload };
    }
    guardarPortasLocal();
    fecharEditarPorta();
    filtrarPortasComEstado();
    mostrarMensagem(isNovaPorta ? "Porta adicionada com sucesso." : "Porta atualizada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar a porta.", "erro");
  }
}

async function apagarPorta(ref) {
  if (!confirm("Queres apagar esta porta?")) return;
  try {
    if (typeof ref === "string" && window.db) {
      await db.collection("portas").doc(ref).delete();
    }
    const idx = idxPorRef(window.portasData, ref);
    if (idx >= 0) window.portasData.splice(idx, 1);
    guardarPortasLocal();
    filtrarPortasComEstado();
    mostrarMensagem("Porta apagada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar a porta.", "erro");
  }
}

/* Users */
let userEditRef = null;

function abrirAdicionarUser() {
  userEditRef = "__new__";
  const fields = ["nome","zona","user_pc_eye","pass_remote","pass_eye_peak","op_pistola","pass_pistola","nome_pc","teamviewer","user_mo365","pw_mo365","email_bragalis","pass_bragalis"];
  fields.forEach(f => { const node = el("editUser_" + f); if (node) node.value = ""; });
  const h3 = document.querySelector('#modalEditarUser h3'); if (h3) h3.textContent = 'Adicionar User';
  const sub = document.querySelector('#modalEditarUser .section-subtitle'); if (sub) sub.textContent = 'Criar um novo utilizador';
  if (el("modalEditarUser")) el("modalEditarUser").style.display = "flex";
}

function editarUser(ref) {
  const item = itemPorRef(window.usersData, ref);
  if (!item) return mostrarMensagem("User não encontrado.", "erro");
  userEditRef = ref;
  const fields = ["nome","zona","user_pc_eye","pass_remote","pass_eye_peak","op_pistola","pass_pistola","nome_pc","teamviewer","user_mo365","pw_mo365","email_bragalis","pass_bragalis"];
  fields.forEach(f => { const node = el("editUser_" + f); if (node) node.value = item[f] || ""; });
  if (el("modalEditarUser")) el("modalEditarUser").style.display = "flex";
}

function fecharEditarUser() {
  userEditRef = null;
  const h3 = document.querySelector('#modalEditarUser h3'); if (h3) h3.textContent = 'Editar User';
  const sub = document.querySelector('#modalEditarUser .section-subtitle'); if (sub) sub.textContent = 'Editar o utilizador selecionado';
  if (el("modalEditarUser")) el("modalEditarUser").style.display = "none";
}


async function guardarEdicaoUser() {

  if (userEditRef === null || typeof userEditRef === "undefined") {
    return mostrarMensagem("Nenhum user selecionado.", "erro");
  }

  const isNovoUser = userEditRef === "__new__";

  const payload = {};

  [
    "nome",
    "zona",
    "user_pc_eye",
    "pass_remote",
    "pass_eye_peak",
    "op_pistola",
    "pass_pistola",
    "nome_pc",
    "teamviewer",
    "user_mo365",
    "pw_mo365",
    "email_bragalis",
    "pass_bragalis"
  ].forEach(f => {

    payload[f] =
      el("editUser_" + f)
        ? el("editUser_" + f).value
        : "";

  });

  try {

    const userAtual =
      itemPorRef(window.usersData, userEditRef);

    const temFirebaseId =
      userAtual &&
      userAtual.idDoc &&
      !String(userAtual.idDoc).startsWith("local-user-");

    if (isNovoUser) {

      if (window.db) {

        const docRef =
          await db.collection("users").add(payload);

        window.usersData.unshift({
          idDoc: docRef.id,
          ...payload
        });

      } else {

        window.usersData.unshift({
          _ref: `local-user-${Date.now()}`,
          ...payload
        });

      }

    } else if (temFirebaseId && window.db) {

      await db
        .collection("users")
        .doc(userAtual.idDoc)
        .update(payload);

      const idx =
        idxPorRef(window.usersData, userEditRef);

      if (idx >= 0) {

        window.usersData[idx] = {
          ...window.usersData[idx],
          ...payload
        };

      }

    } else {

      if (window.db) {

        const docRef =
          await db.collection("users").add(payload);

        const idx =
          idxPorRef(window.usersData, userEditRef);

        if (idx >= 0) {

          window.usersData[idx] = {
            idDoc: docRef.id,
            ...payload
          };

        }

      } else {

        const idx =
          idxPorRef(window.usersData, userEditRef);

        if (idx >= 0) {

          window.usersData[idx] = {
            ...window.usersData[idx],
            ...payload
          };

        }

      }

    }

    guardarUsersLocal();

    fecharEditarUser();

    filtrarUsersComFiltros();

    mostrarMensagem(
      isNovoUser
        ? "User adicionado com sucesso."
        : "User atualizado com sucesso."
    );

  } catch (e) {

    console.error(e);

    mostrarMensagem(
      "Erro ao atualizar o user.",
      "erro"
    );

  }

}


async function apagarUser(ref) {
  if (!confirm("Queres apagar este user")) return;
  try {
    if (typeof ref === "string" && window.db) {
      await db.collection("users").doc(ref).delete();
    }
    const idx = idxPorRef(window.usersData, ref);
    if (idx >= 0) window.usersData.splice(idx, 1);
    guardarUsersLocal();
    filtrarUsersComFiltros();
    mostrarMensagem("User apagado com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar o user.", "erro");
  }
}


function formatUserFieldLabel(chave) {
  const labels = {
    nome: "Nome",
    zona: "Zona",
    user_pc_eye: "User PC/EYE",
    pass_remote: "Pass Remote",
    pass_eye_peak: "Pass Eye Peak",
    op_pistola: "Op. Pistola",
    pass_pistola: "Pass Pistola",
    nome_pc: "Nome PC",
    teamviewer: "TeamViewer",
    user_mo365: "User MO365",
    pw_mo365: "Pw MO365",
    email_bragalis: "Email Bragalis",
    pass_bragalis: "Pass Bragalis"
  };
  return labels[chave] || chave;
}

function escapeHtmlAppBraga(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getEquipmentFichaIdAppBraga(item = {}, index = 0, localPrefix = "local") {
  return item.idDoc || item.firebaseId || item.id || item.docId || item._ref || `${localPrefix}-${index}`;
}

function getEquipmentFichaHrefAppBraga(tipo, item = {}, index = 0, localPrefix = "local") {
  return "#";
}

function equipmentFichaLinkAppBraga(tipo, item = {}, index = 0, localPrefix = "local", label = "Ver ficha", className = "secondary-btn") {
  return "";
}

function imprimirUser(user) {

  // =========================
  // VALIDAR
  // =========================

  if (!user) {

    return mostrarMensagem(
      "User não encontrado.",
      "erro"
    );

  }

  // =========================
  // CAMPOS
  // =========================

  const campos = [

    "nome",
    "zona",
    "user_pc_eye",
    "pass_remote",
    "pass_eye_peak",
    "op_pistola",
    "pass_pistola",
    "nome_pc",
    "teamviewer",
    "user_mo365",
    "pw_mo365",
    "email_bragalis",
    "pass_bragalis"

  ];

  // =========================
  // LINHAS
  // =========================

  const linhas = campos

    .filter((campo) => {

      return (
        (user[campo] || "").trim() !== ""
      );

    })

    .map((campo) => `

      <div class="print-row">

        <div class="print-label">

          ${campo
            .replaceAll("_", " ")
            .toUpperCase()}

        </div>

        <div class="print-value">

          ${user[campo] || "-"}

        </div>

      </div>

    `)

    .join("");

  // =========================
  // TÍTULO
  // =========================

  const titulo =
    user.nome || "User";

  // =========================
  // HTML
  // =========================

  const htmlImpressao = `

<!DOCTYPE html>

<html lang="pt">

<head>

<meta charset="UTF-8">

<title>
  Imprimir Dados - ${titulo}
</title>

<style>

@page {

  size: 100mm 150mm;
  margin: 4mm;

}

html,
body {

  width: 100mm;
  height: 150mm;

  margin: 0;
  padding: 0;

  background: #ffffff;
  color: #000827;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

}

body {

  box-sizing: border-box;

}

.label-sheet {

  width: 100mm;
  min-height: 150mm;

  box-sizing: border-box;

  padding: 6mm;

  display: flex;
  flex-direction: column;

  gap: 3mm;

}

.title {

  font-size: 20px;
  font-weight: 700;

  margin: 0 0 2mm 0;

  border-bottom:
    1px solid #d1d5db;

  padding-bottom: 2mm;

}

.subtitle {

  font-size: 11px;
  color: #4b5563;

  margin: 0 0 1mm 0;

}

.content {

  display: flex;
  flex-direction: column;

  gap: 2.2mm;

  margin-top: 2mm;

}

.print-row {

  border:
    1px solid #e5e7eb;

  border-radius: 2mm;

  padding:
    2.2mm 2.5mm;

}

.print-label {

  font-size: 10px;
  font-weight: 700;

  color: #374151;

  margin-bottom: 1mm;

}

.print-value {

  font-size: 12px;

  line-height: 1.3;

  word-break: break-word;

  white-space: pre-wrap;

}

</style>

</head>

<body>

<div class="label-sheet">

<div class="subtitle">
  Etiqueta User - App Braga
</div>

<h1 class="title">
  ${titulo}
</h1>

<div class="content">

  ${linhas || `

    <div class="print-row">

      <div class="print-label">
        Sem dados
      </div>

      <div class="print-value">
        Este user não tem campos preenchidos.
      </div>

    </div>

  `}

</div>

</div>

</body>

</html>

`;

  // =========================
  // IFRAME
  // =========================

  const iframe =
    document.createElement(
      "iframe"
    );

  iframe.style.position =
    "fixed";

  iframe.style.right = "0";

  iframe.style.bottom = "0";

  iframe.style.width = "0";

  iframe.style.height = "0";

  iframe.style.border = "0";

  document.body.appendChild(
    iframe
  );

  const frameWindow =
    iframe.contentWindow;

  if (!frameWindow) {

    iframe.remove();

    return mostrarMensagem(
      "Erro ao abrir impressão",
      "erro"
    );

  }

  iframe.onload = () => {

    setTimeout(() => {

      try {

        frameWindow.focus();

        frameWindow.print();

      } catch (err) {

        console.error(err);

      }

      setTimeout(() => {

        iframe.remove();

      }, 1500);

    }, 300);

  };

  frameWindow.document.open();

  frameWindow.document.write(
    htmlImpressao
  );

  frameWindow.document.close();

}

/* Pistolas */
let pistolaEditRef = null;

function abrirAdicionarPistola() {
  pistolaEditRef = "__new__";
  ["num","nome","password","cn","sn","mac","operador","armazem","prontas"].forEach(f => { const node = el("editP_" + f); if (node) node.value = ""; });
  const h3 = document.querySelector('#modalEditarPistola h3'); if (h3) h3.textContent = 'Adicionar Pistola CK65';
  const sub = document.querySelector('#modalEditarPistola .section-subtitle'); if (sub) sub.textContent = 'Criar uma nova pistola';
  if (el("modalEditarPistola")) el("modalEditarPistola").style.display = "flex";
}

function editarPistola(ref) {
  const item = itemPorRef(window.pistolasData, ref);
  if (!item) return mostrarMensagem("Pistola não encontrada.", "erro");
  pistolaEditRef = ref;
  ["num","nome","password","cn","sn","mac","operador","armazem","prontas"].forEach(f => {
    const node = el("editP_" + f);
    if (node) node.value = item[f] || "";
  });
  if (el("modalEditarPistola")) el("modalEditarPistola").style.display = "flex";
}

function fecharEditarPistola() {
  pistolaEditRef = null;
  const h3 = document.querySelector('#modalEditarPistola h3'); if (h3) h3.textContent = 'Editar Pistola CK65';
  const sub = document.querySelector('#modalEditarPistola .section-subtitle'); if (sub) sub.textContent = 'Editar a pistola selecionada';
  if (el("modalEditarPistola")) el("modalEditarPistola").style.display = "none";
}

async function guardarEdicaoPistola() {
  if (pistolaEditRef === null || typeof pistolaEditRef === "undefined") return mostrarMensagem("Nenhuma pistola selecionada.", "erro");
  const isNovaPistola = pistolaEditRef === "__new__";
  const payload = {};
  ["num","nome","password","cn","sn","mac","operador","armazem","prontas"].forEach(f => {
    payload[f] = el("editP_" + f) ? el("editP_" + f).value : "";
  });

  try {
    if (isNovaPistola) {
      if (window.db) {
        const docRef = await db.collection("pistolas").add(payload);
        window.pistolasData.unshift({ idDoc: docRef.id, ...payload });
      } else {
        window.pistolasData.unshift({ _ref: `local-pistola-${Date.now()}`, ...payload });
      }
    } else if (typeof pistolaEditRef === "string" && window.db) {
      await db.collection("pistolas").doc(pistolaEditRef).update(payload);
      const idx = idxPorRef(window.pistolasData, pistolaEditRef);
      if (idx >= 0) window.pistolasData[idx] = { ...window.pistolasData[idx], ...payload };
    } else {
      const idx = idxPorRef(window.pistolasData, pistolaEditRef);
      if (idx >= 0) window.pistolasData[idx] = { ...window.pistolasData[idx], ...payload };
    }
    guardarPistolasLocal();
    fecharEditarPistola();
    filtrarPistolasComFiltros();
    mostrarMensagem(isNovaPistola ? "Pistola adicionada com sucesso." : "Pistola atualizada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar a pistola.", "erro");
  }
}

async function apagarPistola(ref) {
  if (!confirm("Queres apagar esta pistola?")) return;
  try {
    if (typeof ref === "string" && window.db) {
      await db.collection("pistolas").doc(ref).delete();
    }
    const idx = idxPorRef(window.pistolasData, ref);
    if (idx >= 0) window.pistolasData.splice(idx, 1);
    guardarPistolasLocal();
    filtrarPistolasComFiltros();
    mostrarMensagem("Pistola apagada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar a pistola.", "erro");
  }
}


function abrirAdicionarImpressora() {
  [["addImp_modelo",""],["addImp_serie",""],["addImp_armazem",""],["addImp_localizacao",""],["addImp_ip",""]].forEach(([id,v]) => { const node = el(id); if (node) node.value = v; });
  if (el("modalAdicionarImpressora")) el("modalAdicionarImpressora").style.display = "flex";
}

function fecharAdicionarImpressora() {
  if (el("modalAdicionarImpressora")) el("modalAdicionarImpressora").style.display = "none";
}

async function guardarNovaImpressora() {
  const payload = {
    modelo: el("addImp_modelo")?.value || "",
    serie: el("addImp_serie")?.value || "",
    armazem: el("addImp_armazem")?.value || "",
    localizacao: el("addImp_localizacao")?.value || "",
    ip: el("addImp_ip")?.value || ""
  };
  if (!normalizarTexto(payload.modelo) || !normalizarTexto(payload.serie) || !normalizarTexto(payload.ip)) {
    return mostrarMensagem("Preenche pelo menos Modelo, Série e IP.", "erro");
  }
  impressorasData.unshift({ _ref: `local-impressora-${Date.now()}`, ...payload });
  guardarImpressorasLocal();
  fecharAdicionarImpressora();
  filtrarImpressoras();
  mostrarMensagem("Impressora adicionada com sucesso.");
}

window.editarPorta = editarPorta;
window.fecharEditarPorta = fecharEditarPorta;
window.guardarEdicaoPorta = guardarEdicaoPorta;
window.apagarPorta = apagarPorta;
window.abrirAdicionarPorta = abrirAdicionarPorta;
window.abrirAdicionarImpressora = abrirAdicionarImpressora;
window.fecharAdicionarImpressora = fecharAdicionarImpressora;
window.guardarNovaImpressora = guardarNovaImpressora;

window.editarUser = editarUser;
window.fecharEditarUser = fecharEditarUser;
window.guardarEdicaoUser = guardarEdicaoUser;
window.apagarUser = apagarUser;

window.editarPistola = editarPistola;
window.fecharEditarPistola = fecharEditarPistola;
window.guardarEdicaoPistola = guardarEdicaoPistola;
window.apagarPistola = apagarPistola;
window.abrirAdicionarPistola = abrirAdicionarPistola;


/* ===== MODO VISUAL ===== */
function modoVisualInit() {
  if (window.matchMedia?.("(pointer: coarse)")?.matches || document.body.classList.contains("device-tablet") || document.body.classList.contains("device-phone")) return;
  document.body.classList.add("modo-visual-on");
  document.querySelectorAll(".panel, .pc-card, .dashboard-card, .stock-card, .history-card").forEach((node, index) => {
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
    setTimeout(() => {
      node.style.transition = "opacity 0.24s ease, transform 0.24s ease";
      node.style.opacity = "1";
      node.style.transform = "translateY(0)";
    }, 25 * Math.min(index, 10));
  });
}

window.addEventListener("load", modoVisualInit);


/* ===== MODO GESTOR EXTREMO ===== */
function getTopConsumoEquipamentos(limit = 4) {
  const map = new Map();
  historicoGlobal.forEach(item => {
    const key = `${item.equipamento || "-"} ? ${item.localizacao || "-"}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a,b) => b[1]-a[1]).slice(0, limit);
}

function getTopProblemasDoDia(limit = 3) {
  const buckets = getCriticalityBucketsAppBraga();
  const topLocs = getTopLocalizacoesHistorico(2);
  const ultimos = getUltimosMovimentos(1);
  const problems = [];

  if (buckets.critical > 0) {
    problems.push(`Existem ${buckets.critical} impressoras em estado crítico.`);
  }
  if (buckets.warning > 0) {
    problems.push(`Existem ${buckets.warning} impressoras em zona de atenção.`);
  }
  if (topLocs.length) {
    problems.push(`Maior pressão recente em ${topLocs[0][0]} com ${topLocs[0][1]} movimentos.`);
  }
  if (ultimos.length) {
    const u = ultimos[0];
    problems.push(`?ltimo movimento: ${u.equipamento || "-"} · ${u.cor || "-"} · ${u.localizacao || "-"}.`);
  }

  return problems.slice(0, limit);
}

function getPrioridadeMaximaGestor(limit = 4) {
  const rows = [];
  impressorasData.forEach(item => {
    const info = tonerInfoState[item.ip] || null;
    const colors = Array.isArray(info?.colors) ? info.colors : [];
    const crit = colors.filter(c => isTonerEmpty(c.percent));
    if (crit.length) {
      rows.push({
        label: `${item.modelo} ? ${item.localizacao}`,
        detail: crit.map(c => `${c.label}: ${c.percent}%`).join(" | ")
      });
    }
  });
  return rows.slice(0, limit);
}

function renderModoGestorExtremo() {
  const board = el("gestorExtremeBoard");
  const prioridade = el("gestorPrioridadeMaxima");
  const consumo = el("gestorTopConsumo");
  const problemas = el("gestorTopProblemas");
  if (!board && !prioridade && !consumo && !problemas) return;

  const buckets = getCriticalityBucketsAppBraga();
  const topLocs = getTopLocalizacoesHistorico(4);
  const topEquip = getTopConsumoEquipamentos(4);
  const topProb = getTopProblemasDoDia(3);
  const maxRows = getPrioridadeMaximaGestor(4);

  if (board) {
    board.innerHTML = `
      <div class="gestor-grid-hero">
        <div class="gestor-hero-card">
          <div class="gestor-hero-title">Estado executivo</div>
          <div class="gestor-hero-value">${buckets.critical > 0 ? "Pressão" : "Estável"}</div>
          <div class="gestor-hero-note">Visão imediata da operação para decidir onde agir primeiro.</div>
          <div class="gestor-chip-row">
            <span class="gestor-chip red">Críticos: ${buckets.critical}</span>
            <span class="gestor-chip yellow">Atenção: ${buckets.warning}</span>
            <span class="gestor-chip green">Stock: ${stockGlobal.length}</span>
          </div>
        </div>
        <div class="gestor-card">
          <h4>Movimento recente</h4>
          <div class="gestor-mini-value">${historicoGlobal.length}</div>
          <div class="meta-line">Total de registos usados no histórico.</div>
        </div>
        <div class="gestor-card">
          <h4>Capacidade atual</h4>
          <div class="gestor-mini-value">${stockGlobal.length}</div>
          <div class="meta-line">Itens disponíveis agora em stock.</div>
        </div>
        <div class="gestor-card">
          <h4>Base instalada</h4>
          <div class="gestor-mini-value">${pcsGlobal.length}</div>
          <div class="meta-line">PCs registados no sistema.</div>
        </div>
      </div>
    `;
  }

  if (prioridade) {
    prioridade.innerHTML = maxRows.length
      ? maxRows.map(item => `<div class="gestor-priority-card"><h4>${item.label}</h4><div class="meta-line">${item.detail}</div></div>`).join("")
      : `<div class="gestor-priority-card"><h4>Sem prioridade máxima</h4><div class="meta-line">Não existem impressoras com toner a 0% neste momento.</div></div>`;
  }

  if (consumo) {
    consumo.innerHTML = `
      <div class="gestor-card">
        <h4>Top Localizações</h4>
        <ul class="gestor-list">
          ${topLocs.length ? topLocs.map(([k,v]) => `<li>${k} - ${v} movimentos</li>`).join("") : "<li>Sem dados suficientes</li>"}
        </ul>
      </div>
      <div class="gestor-card">
        <h4>Top Equipamentos</h4>
        <ul class="gestor-list">
          ${topEquip.length ? topEquip.map(([k,v]) => `<li>${k} - ${v}</li>`).join("") : "<li>Sem dados suficientes</li>"}
        </ul>
      </div>
    `;
  }

  if (problemas) {
    problemas.innerHTML = topProb.length
      ? topProb.map(txt => `<div class="gestor-alert-card"><h4>Ponto de gestáo</h4><div class="meta-line">${txt}</div></div>`).join("")
      : `<div class="gestor-alert-card"><h4>Sem alertas do dia</h4><div class="meta-line">Ainda não há dados suficientes para destacar problemas.</div></div>`;
  }
}



/* ===== MELHORIAS 1 2 3 4 5 7 8 10 ===== */
const STOCK_MIN_DEFAULTS = {
  "Braga - Ilha 01": 1,
  "Braga - Ilha 02": 1,
  "Braga - Ilha 03": 1,
  "Braga - Ilha 04": 1,
  "Braga - Ilha 05": 1,
  "Braga - Balcão 01": 2,
  "Braga - Balcão 02": 2,
  "Braga - Dep. Logistica": 2,
  "Braga - G/Encomendas": 1,
  "Braga - Devoluções": 1,
  "Braga - Escritorio": 1,
  "Vila Real - Ilha 01": 1,
  "Vila Real - Ilha 02": 1,
  "Vila Real - Ilha 03": 1,
  "Sem Localização": 1
};

let stockEditModalId = null;
let historicoEditModalId = null;

function debounceAppBraga(fn, wait = 180) {
  let t = null;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function tryRenderAppBraga(fn) {
  try { fn(); } catch (e) { console.error(e); }
}

function loadStockMinConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("stockMinConfig") || "{}");
    return { ...STOCK_MIN_DEFAULTS, ...saved };
  } catch (e) {
    console.error(e);
    return { ...STOCK_MIN_DEFAULTS };
  }
}

function saveStockMinConfig(cfg) {
  localStorage.setItem("stockMinConfig", JSON.stringify(cfg || {}));
}

function normalizeLocMin(loc) {
  const raw = String(loc || "Sem Localização");
  if (raw.includes(" - ")) {
    const parts = raw.split(" - ");
    if (parts.length >= 3) return `${parts[1]} - ${parts[2]}`;
  }
  return raw;
}

function getStockByLocationCounts() {
  const map = {};
  stockGlobal.forEach(item => {
    const key = normalizeLocMin(item.localizacao);
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function renderStockMinimoPainel() {
  const host = el("stockMinimoPainel");
  if (!host) return;
  const config = loadStockMinConfig();
  const counts = getStockByLocationCounts();
  host.innerHTML = Object.keys(config).map(loc => {
    const atual = counts[loc] || 0;
    const minimo = Number(config[loc] || 0);
    const cls = atual < minimo ? "item-danger" : atual === minimo ? "item-warning" : "item-ok";
    const estado = atual < minimo ? "Abaixo do mínimo" : atual === minimo ? "No mínimo" : "Acima do mínimo";
    return `<div class="stock-min-card"><strong>${loc}</strong><div class="meta-line">Atual: <span class="meta-value ${cls}">${atual}</span></div><div class="meta-line">Mínimo: <span class="meta-value">${minimo}</span></div><div class="meta-line">${estado}</div></div>`;
  }).join("");
}

function renderStockMinimoConfig() {
  const host = el("stockMinimoConfigList");
  if (!host) return;
  const cfg = loadStockMinConfig();
  host.innerHTML = `<div class="minimo-grid">${
    Object.keys(cfg).map(loc => `
      <div class="minimo-item">
        <label>${loc}</label>
        <input type="number" min="0" value="${cfg[loc]}" data-stock-min-loc="${loc}">
      </div>
    `).join("")
  }</div>`;
}

function guardarStockMinimoConfig() {
  const inputs = document.querySelectorAll("[data-stock-min-loc]");
  const cfg = {};
  inputs.forEach(inp => { cfg[inp.getAttribute("data-stock-min-loc")] = Math.max(0, parseInt(inp.value || "0", 10) || 0); });
  saveStockMinConfig(cfg);
  mostrarMensagem("Stock mínimo guardado com sucesso.");
  tryRenderAppBraga(renderStockMinimoPainel);
  tryRenderAppBraga(renderAlertasInteligentes);
}

function resetStockMinimoConfig() {
  saveStockMinConfig(STOCK_MIN_DEFAULTS);
  renderStockMinimoConfig();
  renderStockMinimoPainel();
  renderAlertasInteligentes();
  mostrarMensagem("Stock mínimo reposto.");
}

function ensureLoteFieldOnEdit() {
  const item = localStorage.getItem("editarToner");
  prepararCodigoEtiquetaTonerAppBraga(false);
  if (!item || !el("lote")) return;
  try {
    const toner = JSON.parse(item);
    el("lote").value = toner.lote || "";
    if (el("sdsRef")) el("sdsRef").value = toner.sdsRef || "";
    if (el("dataFolha")) el("dataFolha").value = toner.dataFolha || "";
    if (el("codigoEtiqueta")) el("codigoEtiqueta").value = toner.codigoEtiqueta || toner.codigoToner || getCodigoEtiquetaAtualAppBraga();
  } catch (e) { console.error(e); }
}

function extractLoteFromText(text) {
  const t = String(text || "").toUpperCase();
  const m = t.match(/(?:LOTE|LOT|BATCH)\s*[:#-]?\s*([A-Z0-9-]{4})/);
  return m ? m[1] : "";
}

function extractSdsRefFromText(text) {
  const original = String(text || "");

  function cleanSdsCandidate(value, allowOcrFive = false) {
    let v = String(value || "")
      .replace(/\s+/g, "")
      .replace(/[;,.)]+$/g, "")
      .toUpperCase();

    if (allowOcrFive && /^5\d{7,12}$/.test(v)) v = `S${v.slice(1)}`;
    if (/^S[-:]?\d{7,12}$/.test(v)) return `S${v.replace(/^S[-:]?/i, "")}`;
    return "";
  }

  const lines = original
    .split(/\r?\n/)
    .map(line => line.replace(/[|]/g, "I").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    if (!/\bSDS\b/i.test(lines[i])) continue;

    const joined = [lines[i], lines[i + 1] || "", lines[i + 2] || ""].join(" ");
    const afterLabel = joined.replace(/^.*?\bSDS\b\s*(?:REF|REFERENCE|REFERENCIA|REFER.NCIA)?\.?\s*[:#\-]?\s*/i, "");
    const candidates = [
      afterLabel.match(/\b([S5]\s*[-:]?\s*\d(?:[\s.-]*\d){7,12})\b/i),
      joined.match(/\b([S5]\s*[-:]?\s*\d(?:[\s.-]*\d){7,12})\b/i),
      afterLabel.match(/\b(\d{8,12})\b/)
    ];

    for (const candidate of candidates) {
      if (!candidate || !candidate[1]) continue;
      const raw = String(candidate[1]);
      const fixed = cleanSdsCandidate(/^[s5]/i.test(raw) ? raw : `S${raw}`, true);
      if (fixed) return fixed;
    }
  }

  const normalized = original
    .replace(/[\r\n]+/g, " ")
    .replace(/[|]/g, "I")
    .replace(/\s+/g, " ")
    .trim();

  const kyocera = normalized.match(/\bSDS\s*REF\.?\s*[:#\-]?\s*([S5]\s*[-:]?\s*\d(?:[\s.-]*\d){7,12})\b/i);
  if (kyocera && kyocera[1]) {
    const fixed = cleanSdsCandidate(kyocera[1], true);
    if (fixed) return fixed;
  }

  const nearSds = normalized.match(/\bSDS\b.{0,80}?\b([S5]\s*[-:]?\s*\d(?:[\s.-]*\d){7,12})\b/i);
  if (nearSds && nearSds[1]) {
    const fixed = cleanSdsCandidate(nearSds[1], true);
    if (fixed) return fixed;
  }

  const fallback = normalized.match(/\b(S\d{7,12})\b/i);
  if (fallback && fallback[1]) {
    const fixed = cleanSdsCandidate(fallback[1]);
    if (fixed) return fixed;
  }

  return "";
}
function enhanceScannerStatus(extra = "") {
  const box = el("scannerSmartStatus");
  if (!box) return;
  box.innerText = extra || "Leitura pronta.";
}

function exportCsvFile(filename, headers, rows) {
  const content = [headers.join(";"), ...rows.map(r => headers.map(h => String(r[h] ?? "").replace(/\n/g, " ")).join(";"))].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportarExcelStock() {
  if (!stockGlobal.length) return mostrarMensagem("Não há stock para exportar.", "erro");
  exportCsvFile("stock_app_braga.csv", ["idInterno","codigoEtiqueta","sdsRef","equipamento","localizacao","cor","lote","data","dataFolha"], stockGlobal);
}

function exportarExcelHistorico() {
  if (!historicoGlobal.length) return mostrarMensagem("Não há histórico para exportar.", "erro");
  exportCsvFile("historico_app_braga.csv", ["idInterno","codigoEtiqueta","sdsRef","equipamento","localizacao","cor","lote","data","dataFolha"], historicoGlobal);
}

function exportarExcelTudo() {
  const rows = [...stockGlobal.map(x => ({...x, origem:"stock"})), ...historicoGlobal.map(x => ({...x, origem:"historico"}))];
  if (!rows.length) return mostrarMensagem("Não há dados para exportar.", "erro");
  exportCsvFile("dados_completos_app_braga.csv", ["origem","idInterno","codigoEtiqueta","sdsRef","equipamento","localizacao","cor","lote","data","dataFolha"], rows);
}

function downloadJsonAppBraga(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

async function exportBackupCompletoApp() {
  const payload = {
    app: "App Braga",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      stock: stockGlobal,
      historico: historicoGlobal,
      pcs: pcsGlobal,
      manutencoes: manutencoesGlobal,
      users: window.usersData || [],
      pistolas: window.pistolasData || [],
      portas: window.portasData || [],
      activityLog: activityLogGlobal
    }
  };
  const date = new Date().toISOString().slice(0, 10);
  downloadJsonAppBraga(`app_braga_backup_completo_${date}.json`, payload);
  setText("backupCompletoStatus", `Exportado em ${new Date().toLocaleTimeString("pt-PT")}`);
  await logActivityApp("backup-export", "Backup completo exportado", `${Object.keys(payload.data).length} grupos de dados`);
}

async function importBackupCompletoApp(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const data = parsed.data || parsed;
    const collections = {
      stock: data.stock,
      historico: data.historico,
      pcs: data.pcs,
      manutencoes: data.manutencoes,
      users: data.users,
      pistolas: data.pistolas,
      portas: data.portas
    };
    const selected = Object.entries(collections).filter(([, rows]) => Array.isArray(rows) && rows.length);
    if (!selected.length) return mostrarMensagem("Backup sem dados importáveis.", "erro");
    if (!confirm(`Importar backup completo? Isto vai adicionar ${selected.reduce((sum, [, rows]) => sum + rows.length, 0)} registos às coleções.`)) return;

    for (const [collection, rows] of selected) {
      for (const row of rows) {
        const clean = { ...row };
        delete clean.idDoc;
        delete clean.firebaseId;
        delete clean._ref;
        clean.importedAt = new Date();
        clean.importedFromBackup = true;
        await db.collection(collection).add(clean);
      }
    }
    setText("backupCompletoStatus", `Importado em ${new Date().toLocaleTimeString("pt-PT")}`);
    await logActivityApp("backup-import", "Backup completo importado", selected.map(([name, rows]) => `${name}: ${rows.length}`).join(" | "));
    mostrarMensagem("Backup importado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao importar backup.", "erro");
  } finally {
    if (event?.target) event.target.value = "";
  }
}

function filtrarHistoricoAvancado() {
  const texto = normalizarTexto(el("searchHistorico")?.value || "");
  const dFrom = el("filterHistoricoFrom")?.value || "";
  const dTo = el("filterHistoricoTo")?.value || "";
  const fLoc = normalizarTexto(el("filterHistoricoLocal")?.value || "");
  const fEq = normalizarTexto(el("filterHistoricoEquipamento")?.value || "");
  const fCor = normalizarTexto(el("filterHistoricoCor")?.value || "");

  const items = historicoGlobal.filter(t => {
    const data = String(t.data || "");
    const okText = !texto || [t.idInterno,t.codigoEtiqueta,t.sdsRef,t.equipamento,t.localizacao,t.cor,t.lote].some(v => normalizarTexto(v).includes(texto));
    const okFrom = !dFrom || data >= dFrom;
    const okTo = !dTo || data <= dTo;
    const okLoc = !fLoc || normalizarTexto(t.localizacao).includes(fLoc);
    const okEq = !fEq || normalizarTexto(t.equipamento).includes(fEq);
    const okCor = !fCor || normalizarTexto(t.cor).includes(fCor);
    return okText && okFrom && okTo && okLoc && okEq && okCor;
  });
  renderHistoricoCards(items);
}

function abrirEditarStockModal(id) {
  const item = stockGlobal.find(x => x.idDoc === id);
  if (!item) return mostrarMensagem("Item de stock não encontrado.", "erro");
  stockEditModalId = id;
  if (el("editStockEquipamento")) el("editStockEquipamento").value = item.equipamento || "";
  if (el("editStockCor")) el("editStockCor").value = item.cor || "";
  if (el("editStockLocalizacao")) el("editStockLocalizacao").value = item.localizacao || "";
  if (el("editStockLote")) el("editStockLote").value = item.lote || "";
  if (el("editStockSdsRef")) el("editStockSdsRef").value = item.sdsRef || "";
  if (el("editStockCodigoEtiqueta")) el("editStockCodigoEtiqueta").value = item.codigoEtiqueta || "";
  if (el("editStockData")) el("editStockData").value = item.data || "";
  if (el("editStockDataFolha")) el("editStockDataFolha").value = item.dataFolha || "";
  if (el("modalEditarStock")) el("modalEditarStock").style.display = "flex";
}

function fecharEdicaoStockModal() {
  stockEditModalId = null;
  if (el("modalEditarStock")) el("modalEditarStock").style.display = "none";
}

async function guardarEdicaoStockModal() {
  if (!stockEditModalId) return;
  const payload = {
    equipamento: el("editStockEquipamento")?.value || "",
    cor: el("editStockCor")?.value || "",
    localizacao: el("editStockLocalizacao")?.value || "",
    lote: el("editStockLote")?.value || "",
    sdsRef: el("editStockSdsRef")?.value || "",
    codigoEtiqueta: el("editStockCodigoEtiqueta")?.value || "",
    data: el("editStockData")?.value || "",
    dataFolha: el("editStockDataFolha")?.value || ""
  };
  try {
    await db.collection("stock").doc(stockEditModalId).update(payload);
    fecharEdicaoStockModal();
    mostrarMensagem("Stock atualizado.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar stock.", "erro");
  }
}

async function apagarStockItem(id) {
  if (!confirm("Queres apagar este item do stock?")) return;
  try {
    await db.collection("stock").doc(id).delete();
    mostrarMensagem("Item de stock apagado.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar stock.", "erro");
  }
}

function abrirEditarHistoricoModal(id) {
  const item = historicoGlobal.find(x => x.idDoc === id);
  if (!item) return mostrarMensagem("Histórico não encontrado.", "erro");
  historicoEditModalId = id;
  if (el("editHistoricoEquipamento")) el("editHistoricoEquipamento").value = item.equipamento || "";
  if (el("editHistoricoCor")) el("editHistoricoCor").value = item.cor || "";
  if (el("editHistoricoLocalizacao")) el("editHistoricoLocalizacao").value = item.localizacao || "";
  if (el("editHistoricoLote")) el("editHistoricoLote").value = item.lote || "";
  if (el("editHistoricoSdsRef")) el("editHistoricoSdsRef").value = item.sdsRef || "";
  if (el("editHistoricoData")) el("editHistoricoData").value = item.data || "";
  if (el("editHistoricoDataFolha")) el("editHistoricoDataFolha").value = item.dataFolha || "";
  if (el("modalEditarHistorico")) el("modalEditarHistorico").style.display = "flex";
}

function fecharEdicaoHistoricoModal() {
  historicoEditModalId = null;
  if (el("modalEditarHistorico")) el("modalEditarHistorico").style.display = "none";
}

async function guardarEdicaoHistoricoModal() {
  if (!historicoEditModalId) return;
  const payload = {
    equipamento: el("editHistoricoEquipamento")?.value || "",
    cor: el("editHistoricoCor")?.value || "",
    localizacao: el("editHistoricoLocalizacao")?.value || "",
    lote: el("editHistoricoLote")?.value || "",
    sdsRef: el("editHistoricoSdsRef")?.value || "",
    data: el("editHistoricoData")?.value || "",
    dataFolha: el("editHistoricoDataFolha")?.value || ""
  };
  try {
    await db.collection("historico").doc(historicoEditModalId).update(payload);
    fecharEdicaoHistoricoModal();
    mostrarMensagem("Histórico atualizado.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar histórico.", "erro");
  }
}

function buildAlertasInteligentes() {
  const cfg = loadStockMinConfig();
  const counts = getStockByLocationCounts();
  const rows = [];
  Object.keys(cfg).forEach(loc => {
    const atual = counts[loc] || 0;
    const minimo = Number(cfg[loc] || 0);
    if (atual < minimo) rows.push({ tipo: "stock", titulo: loc, detalhe: `Stock abaixo do mínimo: ${atual}/${minimo}` });
  });

  if (typeof impressorasData !== "undefined" && typeof tonerInfoState !== "undefined") {
    impressorasData.forEach(item => {
      const info = tonerInfoState[item.ip] || null;
      const colors = Array.isArray(info?.colors) ? info.colors : [];
      const crit = colors.filter(c => isTonerEmpty(c.percent));
      if (crit.length) rows.push({ tipo: "printer", titulo: `${item.modelo} ? ${item.localizacao}`, detalhe: crit.map(c => `${c.label}: ${c.percent}%`).join(" | ") });
    });
  }
  return rows.slice(0, 8);
}

function renderAlertasInteligentes() {
  const rows = buildAlertasInteligentes();
  ["alertasInteligentesDashboard","alertasInteligentesImpressoras"].forEach(id => {
    const host = el(id);
    if (!host) return;
    host.innerHTML = rows.length ? rows.map(r => `<div class="alert-inteligente-card"><strong>${r.titulo}</strong><div class="meta-line">${r.detalhe}</div></div>`).join("") : `<div class="alert-inteligente-card"><strong>Sem alertas</strong><div class="meta-line">Não existem alertas inteligentes ativos.</div></div>`;
  });
}

const filtrarStockDebounced = debounceAppBraga(function() {
  const input = el("search");
  if (!input) return;
  const txt = input.value.toLowerCase();
  const filtrados = stockGlobal.filter(t =>
    normalizarTexto(t.idInterno).includes(txt) ||
    normalizarTexto(t.equipamento).includes(txt) ||
    normalizarTexto(t.cor).includes(txt) ||
    normalizarTexto(t.localizacao).includes(txt) ||
    normalizarTexto(t.lote).includes(txt) ||
    normalizarTexto(t.sdsRef).includes(txt) ||
    normalizarTexto(t.codigoEtiqueta).includes(txt)
  );
  renderStockCards(filtrados);
}, 120);

const filtrarDashDebounced = debounceAppBraga(function() {
  renderDashboardCards();
}, 120);

window.exportarExcelStock = exportarExcelStock;
window.exportarExcelHistorico = exportarExcelHistorico;
window.exportarExcelTudo = exportarExcelTudo;
window.exportBackupCompletoApp = exportBackupCompletoApp;
window.importBackupCompletoApp = importBackupCompletoApp;
window.guardarStockMinimoConfig = guardarStockMinimoConfig;
window.resetStockMinimoConfig = resetStockMinimoConfig;
window.filtrarHistoricoAvancado = filtrarHistoricoAvancado;
window.abrirEditarStockModal = abrirEditarStockModal;
window.fecharEdicaoStockModal = fecharEdicaoStockModal;
window.guardarEdicaoStockModal = guardarEdicaoStockModal;
window.apagarStockItem = apagarStockItem;
window.abrirEditarHistoricoModal = abrirEditarHistoricoModal;
window.fecharEdicaoHistoricoModal = fecharEdicaoHistoricoModal;
window.guardarEdicaoHistoricoModal = guardarEdicaoHistoricoModal;




/* =========================
   ETIQUETAS WORD PARTILHADAS
========================= */
try { BACKUP_KEYS_APP_BRAGA.etiquetas = "appBraga_backup_etiquetas"; } catch (e) {}
let etiquetasWordGlobal = [];

function formatDatePTShared(valor) {
  const raw = String(valor || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  return raw;
}

function parseLocalizacaoEtiquetaShared(loc) {
  const raw = String(loc || "").trim();
  let serie = "";
  let localCurto = raw || "Sem Localização";
  let armazem = "";
  const parts = raw.split(" - ").map(v => v.trim()).filter(Boolean);
  if (parts.length >= 3) {
    serie = parts[0] || "";
    armazem = parts[1] || "";
    localCurto = parts.slice(2).join(" - ") || localCurto;
  } else {
    const printer = (typeof impressorasData !== "undefined" && Array.isArray(impressorasData)) ? impressorasData.find(p => normalizarTexto(raw).includes(normalizarTexto(p.localizacao)) || normalizarTexto(raw).includes(normalizarTexto(p.serie))) : null;
    if (printer) {
      serie = printer.serie || "";
      armazem = printer.armazem || "";
      localCurto = printer.localizacao || localCurto;
    }
  }
  return { serie, localCurto, armazem, localizacaoRaw: raw };
}

function montarPayloadEtiquetaPartilhada(extra = {}) {
  const loc = extra.localizacao || ((el("localizacao") && el("localizacao").value) || "");
  const info = parseLocalizacaoEtiquetaShared(loc);
  const dataFolha = extra.dataFolha || ((el("dataFolha") && el("dataFolha").value) || "");
  const dataScan = extra.data || ((el("data") && el("data").value) || "");
  const equipamento = extra.equipamento || ((el("equipamento") && el("equipamento").value) || "");
  const cor = extra.cor || ((el("cor") && el("cor").value) || "");
  const lote = extra.lote || ((el("lote") && el("lote").value) || "");
  const sdsRef = extra.sdsRef || ((el("sdsRef") && el("sdsRef").value) || "");
  const origem = extra.origem || "scan";
  const codigoEtiqueta = extra.codigoEtiqueta || getCodigoEtiquetaAtualAppBraga();
  return {
    serie: info.serie || extra.serie || "SEM SÉRIE",
    localCurto: info.localCurto || "Sem Localização",
    armazem: info.armazem || extra.armazem || "",
    localizacao: info.localizacaoRaw || loc || "Sem Localização",
    dataEtiqueta: formatDatePTShared(dataScan || dataFolha) || "Sem Data",
    dataScan: dataScan || "",
    data: dataScan || "",
    dataFolha: dataFolha || "",
    equipamento: equipamento || "",
    cor: cor || "",
    lote: lote || "",
    sdsRef: sdsRef || "",
    codigoEtiqueta,
    codigoScan: extra.codigoScan || buildPayloadQrTonerAppBraga(codigoEtiqueta),
    origem,
    created: Date.now()
  };
}

async function guardarEtiquetaPartilhada(extra = {}) {
  const database = getDbAppBraga();
  if (!database || !database.collection) return null;
  try {
    const payload = sanitizeFirestorePayloadAppBraga(montarPayloadEtiquetaPartilhada(extra));
    const codigo = String(payload.codigoEtiqueta || extra.codigoEtiqueta || "").trim().toUpperCase();

    // v1.58.26: evitar duplicados. Ao adicionar toner, a etiqueta é guardada
    // logo na coleção etiquetasWord; se o Word também for gerado a seguir,
    // atualiza a mesma etiqueta em vez de criar outra.
    if (codigo) {
      const existing = await database.collection("etiquetasWord").where("codigoEtiqueta", "==", codigo).limit(1).get();
      if (!existing.empty) {
        const doc = existing.docs[0];
        await database.collection("etiquetasWord").doc(doc.id).set({
          ...payload,
          codigoEtiqueta: codigo,
          updatedAt: Date.now()
        }, { merge: true });
        return { idDoc: doc.id, ...payload, codigoEtiqueta: codigo };
      }
    }

    const ref = await database.collection("etiquetasWord").add({
      ...payload,
      codigoEtiqueta: codigo || payload.codigoEtiqueta || "",
      created: payload.created || Date.now()
    });
    return { idDoc: ref.id, ...payload, codigoEtiqueta: codigo || payload.codigoEtiqueta || "" };
  } catch (e) {
    console.error("Erro ao guardar etiqueta partilhada:", e);
    return null;
  }
}

async function gerarWordEtiquetaPartilhada(dados, opts = {}) {
  try {
    if (typeof docx === "undefined") {
      mostrarMensagem("Biblioteca Word não carregada.", "erro");
      return false;
    }
    const payload = montarPayloadEtiquetaPartilhada(dados || {});
    const { Document, Packer, Paragraph, AlignmentType, TextRun } = docx;
    const doc = new Document({
      creator: "App Braga",
      title: "Etiqueta Toner",
      sections: [{ children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 3200, after: 500 }, children: [ new TextRun({ text: payload.localCurto, bold: true, size: 42 }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 2800 }, children: [ new TextRun({ text: payload.serie, bold: true, size: 64 }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, children: [ new TextRun({ text: payload.dataEtiqueta, bold: true, size: 56 }) ] })
      ] }]
    });
    const blob = await Packer.toBlob(doc);
    const fileName = `Etiqueta_${String(payload.localCurto || "Etiqueta").replace(/\s+/g, "_")}_${payload.serie || "SEM_SERIE"}.docx`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 1200);
    if (opts.saveRecord !== false) await guardarEtiquetaPartilhada(payload);
    if (!opts.silent) mostrarMensagem("Etiqueta guardada e pronta para download.");
    return true;
  } catch (e) {
    console.error("Erro ao gerar etiqueta partilhada:", e);
    mostrarMensagem("Erro ao gerar a etiqueta Word.", "erro");
    return false;
  }
}

window.gerarWordEtiquetaPartilhada = gerarWordEtiquetaPartilhada;

const etiquetasWordSelecionadas = new Set();

function atualizarContadorEtiquetasSelecionadas() {
  setText("etiquetasSelecionadasCount", etiquetasWordSelecionadas.size);
}

function toggleEtiquetaWordSelecionada(id, checked) {
  if (!id) return;
  if (checked) etiquetasWordSelecionadas.add(id);
  else etiquetasWordSelecionadas.delete(id);
  atualizarContadorEtiquetasSelecionadas();
}

function selecionarEtiquetasWordVisiveis() {
  document.querySelectorAll("[data-etiqueta-word-id]").forEach((input) => {
    const id = input.getAttribute("data-etiqueta-word-id");
    if (!id) return;
    etiquetasWordSelecionadas.add(id);
    input.checked = true;
  });
  atualizarContadorEtiquetasSelecionadas();
}

function limparSelecaoEtiquetasWord() {
  etiquetasWordSelecionadas.clear();
  document.querySelectorAll("[data-etiqueta-word-id]").forEach((input) => {
    input.checked = false;
  });
  atualizarContadorEtiquetasSelecionadas();
}

function getEtiquetaDateValue(item = {}) {
  const candidates = [item.data, item.dataScan, item.dataFolha, item.dataEtiqueta, item.createdAt, item.created];
  for (const value of candidates) {
    if (!value) continue;
    if (typeof value === "number") return value;
    if (value.seconds) return value.seconds * 1000;
    const text = String(value);
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`).getTime();
    const pt = text.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})/);
    if (pt) return new Date(`${pt[3]}-${pt[2]}-${pt[1]}T12:00:00`).getTime();
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function renderEtiquetasWordCards() {
  const host = el("listaEtiquetasWord");
  if (!host) return;
  const texto = normalizarTexto(el("searchEtiquetasWord")?.value || "");
  const origem = normalizarTexto(el("filterEtiquetasOrigem")?.value || "");
  let items = Array.isArray(etiquetasWordGlobal) ? [...etiquetasWordGlobal] : [];
  if (origem) items = items.filter(x => normalizarTexto(x.origem).includes(origem));
  if (texto) {
    items = items.filter(x => [x.serie,x.localCurto,x.localizacao,x.equipamento,x.cor,x.lote,x.sdsRef,x.codigoEtiqueta,x.dataEtiqueta].some(v => normalizarTexto(v).includes(texto)));
  }
  items.sort((a, b) => getEtiquetaDateValue(b) - getEtiquetaDateValue(a));
  setText("countEtiquetasTotal", items.length);
  const hoje = new Date();
  const ymd = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  setText("countEtiquetasStock", items.filter(x => String(x.data || x.dataFolha || "").startsWith(ymd) || String(x.dataEtiqueta || "").includes(`${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`)).length);
  setText("countEtiquetasHistorico", new Set(items.map(x => x.serie || x.localCurto || x.localizacao)).size);
  if (!items.length) {
    host.innerHTML = `<div class="panel empty-state"><h3>Sem etiquetas</h3><p>Faz scan no iPhone e a etiqueta aparece aqui para download no PC.</p></div>`;
    return;
  }
  host.innerHTML = items.map(t => `
    <div class="stock-card etiqueta-word-card">
      <label class="etiqueta-select-row">
        <input type="checkbox" data-etiqueta-word-id="${safeRefHtml(t.idDoc)}" ${etiquetasWordSelecionadas.has(t.idDoc) ? "checked" : ""} onchange="toggleEtiquetaWordSelecionada('${safeRefHtml(t.idDoc)}', this.checked)">
        <span>Selecionar para impressão</span>
      </label>
      <div class="stock-id">${t.localCurto || t.localizacao || 'Etiqueta'}</div>
      <div class="meta-line">Série: <span class="meta-value">${t.serie || '-'}</span></div>
      <div class="meta-line">Armazém: <span class="meta-value">${t.armazem || '-'}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${t.localizacao || '-'}</span></div>
      <div class="meta-line">Equipamento: <span class="meta-value">${t.equipamento || '-'}</span></div>
      <div class="meta-line">Cor: <span class="meta-value">${t.cor || '-'}</span></div>
      <div class="meta-line">Lote: <span class="meta-value">${t.lote || '-'}</span></div>
      <div class="meta-line">SDS Ref: <span class="meta-value">${t.sdsRef || '-'}</span></div>
      <div class="meta-line">Código: <span class="meta-value">${t.codigoEtiqueta || '-'}</span></div>
      <div class="meta-line">Data: <span class="meta-value">${t.dataEtiqueta || '-'}</span></div>
      <div class="meta-line">Origem: <span class="meta-value">${t.origem || 'scan'}</span></div>
      <div class="card-actions">
        <button class="small-btn btn-use" onclick="regerarEtiquetaWordPartilhada('${t.idDoc}')">Imprimir</button>
        <button class="small-btn btn-delete" onclick="apagarEtiquetaWordPartilhada('${t.idDoc}')">Apagar</button>
      </div>
    </div>`).join("");
  atualizarContadorEtiquetasSelecionadas();
  aplicarPerfilApp(appRoleAtual);
}


function montarHtmlEtiquetaImpressao(item) {
  const linhas = [
    ["Local", item.localCurto || item.localizacao],
    ["Série", item.serie],
    ["Armazém", item.armazem],
    ["Equipamento", item.equipamento],
    ["Cor", item.cor],
    ["Lote", item.lote],
    ["SDS Ref", item.sdsRef],
    ["Data", item.dataScan || item.dataEtiqueta || item.data || item.dataFolha],
    ["Origem", item.origem]
  ].filter(([,v]) => String(v || '').trim());

  const codigoScan = item.codigoScan || (item.codigoEtiqueta ? buildPayloadQrTonerAppBraga(item.codigoEtiqueta) : "");
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c] || c));
  const rows = linhas.map(([k,v]) => `<div class="etq-row"><div class="etq-key">${escapeHtml(k)}</div><div class="etq-val">${escapeHtml(v)}</div></div>`).join('');
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Etiqueta</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  html, body { margin:0; padding:0; width:100mm; height:150mm; overflow:hidden; font-family: Arial, sans-serif; background:#fff; }
  body { box-sizing:border-box; padding:2mm; color:#000; }
  .etq-wrap { position:relative; box-sizing:border-box; width:96mm; height:146mm; overflow:hidden; padding:6mm; display:flex; flex-direction:column; justify-content:flex-start; background:#fff; }
  .etq-title { font-size:21px; font-weight:1000; margin:0 28mm 5mm 0; line-height:1.05; }
  .etq-row { display:flex; flex-direction:column; margin:0 0 3mm; }
  .etq-key { font-size:10px; font-weight:1000; text-transform:uppercase; letter-spacing:.3px; }
  .etq-val { font-size:15px; line-height:1.18; word-break:break-word; }
  .etq-qr { position:absolute; top:6mm; right:6mm; width:20mm; height:20mm; }
  .etq-qr img, .etq-qr canvas { width:20mm !important; height:20mm !important; }
  .etq-code { font-size:9px; font-weight:900; margin-top:2mm; word-break:break-all; }
</style>
</head>
<body>
  <div class="etq-wrap">
    <div class="etq-title">${escapeHtml(item.localCurto || item.localizacao || 'Etiqueta')}</div>
    ${rows}
    ${codigoScan ? `<div class="etq-qr" data-etq-qr="${escapeHtml(codigoScan)}"></div>` : ""}
  </div>
</body>
</html>`;
}

async function regerarEtiquetaWordPartilhada(id) {
  const item = etiquetasWordGlobal.find(x => x.idDoc === id);
  if (!item) return mostrarMensagem("Etiqueta não encontrada.", "erro");
  try {
    const existente = document.getElementById('printAreaEtiquetaAppBraga');
    if (existente) existente.remove();
    const overlay = document.createElement('div');
    overlay.id = 'printAreaEtiquetaAppBraga';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = '#fff';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = montarHtmlEtiquetaOverlay(item);
    document.body.appendChild(overlay);
    renderQrCodesAppBraga(overlay);

    const oldTitle = document.title;
    document.title = `Etiqueta-${(item.localCurto || item.localizacao || 'Etiqueta')}`;

    setTimeout(() => {
      try {
        try{ if(window.reforcarEtiquetaTonerPrint) window.reforcarEtiquetaTonerPrint(); }catch(e){} window.print();
        mostrarMensagem('Etiqueta pronta a imprimir.');
      } catch (e) {
        console.error(e);
        mostrarMensagem('Erro ao abrir a impressão.', 'erro');
      } finally {
        setTimeout(() => {
          try { overlay.remove(); } catch (e) {}
          document.title = oldTitle;
        }, 600);
      }
    }, 150);
  } catch (e) {
    console.error(e);
    mostrarMensagem('Erro ao preparar impressão.', 'erro');
  }
}

function montarHtmlEtiquetaOverlay(item) {
  const linhas = [
    ["Local", item.localCurto || item.localizacao],
    ["Série", item.serie],
    ["Armazém", item.armazem],
    ["Equipamento", item.equipamento],
    ["Cor", item.cor],
    ["Lote", item.lote],
    ["SDS Ref", item.sdsRef],
    ["Data", item.dataScan || item.dataEtiqueta || item.data || item.dataFolha],
    ["Origem", item.origem]
  ].filter(([,v]) => String(v || '').trim());

  const codigoScan = item.codigoScan || (item.codigoEtiqueta ? buildPayloadQrTonerAppBraga(item.codigoEtiqueta) : "");
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c));
  const rows = linhas.map(([k,v]) => `<div class="etq-row"><div class="etq-key">${escapeHtml(k)}</div><div class="etq-val">${escapeHtml(v)}</div></div>`).join('');
  return `
    <style>
      @media print {
        @page { size: 100mm 150mm; margin: 0; }
        html, body { width: 100mm !important; height: 150mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #fff !important; }
        body * { visibility: hidden !important; }
        #printAreaEtiquetaAppBraga, #printAreaEtiquetaAppBraga * { visibility: visible !important; }
        #printAreaEtiquetaAppBraga { position: fixed !important; inset: 0 !important; width: 100mm !important; height: 150mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #fff !important; }
      }
      #printAreaEtiquetaAppBraga .etq-sheet { position:relative; width:96mm; height:146mm; max-width:96mm; max-height:146mm; overflow:hidden; box-sizing:border-box; margin:2mm; padding:6mm; color:#000; font-family:'Arial Black', Arial, Helvetica, sans-serif; font-weight:950; background:#fff; display:flex; flex-direction:column; justify-content:flex-start; break-inside: avoid; page-break-inside: avoid; break-after: avoid-page; page-break-after: avoid; }
      #printAreaEtiquetaAppBraga .etq-title { font-size:21px; font-weight:1000; margin:0 28mm 5mm 0; line-height:1.05; }
      #printAreaEtiquetaAppBraga .etq-row { display:flex; flex-direction:column; margin:0 0 3mm; }
      #printAreaEtiquetaAppBraga .etq-key { font-size:10px; font-weight:1000; text-transform:uppercase; letter-spacing:.3px; }
      #printAreaEtiquetaAppBraga .etq-val { font-size:15px; line-height:1.18; word-break:break-word; }
      #printAreaEtiquetaAppBraga .etq-qr { position:absolute; top:6mm; right:6mm; width:20mm; height:20mm; }
      #printAreaEtiquetaAppBraga .etq-qr img,
      #printAreaEtiquetaAppBraga .etq-qr canvas { width:20mm !important; height:20mm !important; }
      #printAreaEtiquetaAppBraga .etq-code { font-size:9px; font-weight:900; margin-top:2mm; word-break:break-all; }
    </style>
    <div class="etq-sheet">
      <div class="etq-title">${escapeHtml(item.localCurto || item.localizacao || 'Etiqueta')}</div>
      ${rows}
      ${codigoScan ? `<div class="etq-qr" data-etq-qr="${escapeHtml(codigoScan)}"></div>` : ""}
    </div>`;
}

function montarHtmlEtiquetasOverlay(items) {
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c));
  const sheets = items.map((item) => {
    const linhas = [
      ["Local", item.localCurto || item.localizacao],
      ["Série", item.serie],
      ["Armazém", item.armazem],
      ["Equipamento", item.equipamento],
      ["Cor", item.cor],
      ["Lote", item.lote],
      ["SDS Ref", item.sdsRef],
      ["Data", item.dataScan || item.dataEtiqueta || item.data || item.dataFolha],
      ["Origem", item.origem]
    ].filter(([,v]) => String(v || '').trim());
    const rows = linhas.map(([k,v]) => `<div class="etq-row"><div class="etq-key">${escapeHtml(k)}</div><div class="etq-val">${escapeHtml(v)}</div></div>`).join('');
    const codigoScan = item.codigoScan || (item.codigoEtiqueta ? buildPayloadQrTonerAppBraga(item.codigoEtiqueta) : "");
    return `
      <section class="etq-sheet">
        <div class="etq-title">${escapeHtml(item.localCurto || item.localizacao || 'Etiqueta')}</div>
        ${rows}
        ${codigoScan ? `<div class="etq-qr" data-etq-qr="${escapeHtml(codigoScan)}"></div>` : ""}
      </section>`;
  }).join("");

  return `
    <style>
      @media print {
        @page { size: 100mm 150mm; margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; overflow: visible !important; }
        body * { visibility: hidden !important; }
        #printAreaEtiquetaAppBraga, #printAreaEtiquetaAppBraga * { visibility: visible !important; }
        #printAreaEtiquetaAppBraga { position: static !important; width: auto !important; height: auto !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: #fff !important; display: block !important; }
      }
      #printAreaEtiquetaAppBraga { background:#fff; color:#000; display:block; }
      #printAreaEtiquetaAppBraga .etq-sheet { position:relative; width:96mm; height:146mm; max-width:96mm; max-height:146mm; overflow:hidden; box-sizing:border-box; margin:2mm; padding:6mm; color:#000; font-family:'Arial Black', Arial, Helvetica, sans-serif; font-weight:950; background:#fff; display:flex; flex-direction:column; justify-content:flex-start; break-inside: page; page-break-inside: avoid; page-break-after: always; }
      #printAreaEtiquetaAppBraga .etq-sheet:last-child { page-break-after: auto; break-after: auto; }
      #printAreaEtiquetaAppBraga .etq-title { font-size:21px; font-weight:1000; margin:0 28mm 5mm 0; line-height:1.05; color:#000; }
      #printAreaEtiquetaAppBraga .etq-row { display:flex; flex-direction:column; margin:0 0 3mm; color:#000; }
      #printAreaEtiquetaAppBraga .etq-key { font-size:10px; font-weight:1000; text-transform:uppercase; letter-spacing:.3px; color:#000; }
      #printAreaEtiquetaAppBraga .etq-val { font-size:15px; line-height:1.18; word-break:break-word; color:#000; }
      #printAreaEtiquetaAppBraga .etq-qr { position:absolute; top:6mm; right:6mm; width:20mm; height:20mm; }
      #printAreaEtiquetaAppBraga .etq-qr img,
      #printAreaEtiquetaAppBraga .etq-qr canvas { width:20mm !important; height:20mm !important; }
    </style>
    ${sheets}`;
}

async function imprimirEtiquetasWordSelecionadas() {
  const ids = Array.from(etiquetasWordSelecionadas);
  if (!ids.length) return mostrarMensagem("Seleciona pelo menos uma etiqueta.", "erro");
  const items = ids.map((id) => etiquetasWordGlobal.find((item) => item.idDoc === id)).filter(Boolean);
  if (!items.length) return mostrarMensagem("As etiquetas selecionadas já não existem.", "erro");

  try {
    const existente = document.getElementById('printAreaEtiquetaAppBraga');
    if (existente) existente.remove();
    const overlay = document.createElement('div');
    overlay.id = 'printAreaEtiquetaAppBraga';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = '#fff';
    overlay.style.zIndex = '999999';
    overlay.style.overflow = 'auto';
    overlay.innerHTML = montarHtmlEtiquetasOverlay(items);
    document.body.appendChild(overlay);
    renderQrCodesAppBraga(overlay);

    const oldTitle = document.title;
    document.title = `Etiquetas-${items.length}`;
    setTimeout(() => {
      try {
        try { if (window.reforcarEtiquetaTonerPrint) window.reforcarEtiquetaTonerPrint(); } catch (e) {}
        window.print();
        mostrarMensagem(`${items.length} etiquetas prontas para imprimir.`);
      } catch (e) {
        console.error(e);
        mostrarMensagem("Erro ao abrir a impressão.", "erro");
      } finally {
        setTimeout(() => {
          try { overlay.remove(); } catch (e) {}
          document.title = oldTitle;
        }, 700);
      }
    }, 180);
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao preparar etiquetas.", "erro");
  }
}


async function apagarEtiquetaWordPartilhada(id) {
  if (!confirm("Queres apagar esta etiqueta?")) return;
  try {
    await db.collection("etiquetasWord").doc(id).delete();
    mostrarMensagem("Etiqueta apagada.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar etiqueta.", "erro");
  }
}
window.regerarEtiquetaWordPartilhada = regerarEtiquetaWordPartilhada;
window.apagarEtiquetaWordPartilhada = apagarEtiquetaWordPartilhada;
window.toggleEtiquetaWordSelecionada = toggleEtiquetaWordSelecionada;
window.selecionarEtiquetasWordVisiveis = selecionarEtiquetasWordVisiveis;
window.limparSelecaoEtiquetasWord = limparSelecaoEtiquetasWord;
window.imprimirEtiquetasWordSelecionadas = imprimirEtiquetasWordSelecionadas;

function bindEtiquetasWordRealtime() {
  if (!db || !db.collection) return;
  if (!appBragaIsPage("etiquetas-word.html")) return;
  appBragaBindFirestoreListener("etiquetas-word-realtime", true, () => db.collection("etiquetasWord").onSnapshot((snap) => {
    etiquetasWordGlobal = [];
    snap.forEach((doc) => {
      const t = ({ firebaseId: doc.id, ...doc.data() }) || {};
      t.idDoc = doc.id;
      etiquetasWordGlobal.push(t);
    });
    sortFirestoreCreatedDesc(etiquetasWordGlobal);
    try { saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.etiquetas, etiquetasWordGlobal); } catch (e) {}
    renderEtiquetasWordCards();
  }, (error) => {
    console.error(error);
    try { etiquetasWordGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.etiquetas); } catch (e) { etiquetasWordGlobal = []; }
    renderEtiquetasWordCards();
  }));
}

window.addEventListener("DOMContentLoaded", () => {
  if (el("searchEtiquetasWord")) el("searchEtiquetasWord").addEventListener("input", renderEtiquetasWordCards);
  if (el("filterEtiquetasOrigem")) el("filterEtiquetasOrigem").addEventListener("change", renderEtiquetasWordCards);
  if (el("listaEtiquetasWord")) renderEtiquetasWordCards();
  bindEtiquetasWordRealtime();
});



/* =========================
   IMPORT EXCEL FIREBASE
========================= */

async function importarExcelFirebase(){

  const input =
    document.getElementById(
      "excelImportFirebase"
    );

  if(!input){

    alert(
      "Input Excel não encontrado."
    );

    return;
  }

  input.click();

}

window.importarExcelFirebase =
  importarExcelFirebase;

window.addEventListener(
  "DOMContentLoaded",
  () => {

    const excelInput =
      document.getElementById(
        "excelImportFirebase"
      );

    if(!excelInput){
      console.log(
        "Input Excel não encontrado"
      );
      return;
    }

    excelInput.addEventListener(
      "change",
      async (event) => {

        try{

          const file =
            event.target.files?.[0];

          if(!file) return;

          const data =
            await file.arrayBuffer();

          const workbook =
            XLSX.read(data);

          const usersSheet =
            workbook.Sheets["Users"];

          const pistolasSheet =
            workbook.Sheets["Pistolas"];

          const portasSheet =
            workbook.Sheets["Portas"];

          if(usersSheet){

            const users =
              XLSX.utils.sheet_to_json(
                usersSheet
              );

            for(const user of users){

              await window.db
                .collection("users")
                .add(user);

            }

          }

          if(pistolasSheet){

            const pistolas =
              XLSX.utils.sheet_to_json(
                pistolasSheet
              );

            for(const item of pistolas){

              await window.db
                .collection("pistolas")
                .add(item);

            }

          }

          if(portasSheet){

            const portas =
              XLSX.utils.sheet_to_json(
                portasSheet
              );

            for(const item of portas){

              await window.db
                .collection("portas")
                .add(item);

            }

          }

          alert(
            "Excel importado para Firebase."
          );

        }catch(error){

          console.error(error);

          alert(
            "Erro: " + error.message
          );

        }

      }
    );

  }
);



/* =========================
   EXPORT JSON SYSTEM
========================= */

function descarregarJSON(nome, dados){

  try{

    const blob = new Blob(
      [
        JSON.stringify(
          dados || [],
          null,
          2
        )
      ],
      {
        type:"application/json"
      }
    );

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =
      nome + "_" +
      Date.now() +
      ".json";

    document.body.appendChild(a);

    a.click();

    setTimeout(()=>{

      URL.revokeObjectURL(a.href);

      a.remove();

    },1000);

  }catch(error){

    console.error(error);

    alert(
      "Erro ao exportar JSON."
    );

  }

}

/* USERS */

function exportUsersJSON(){

  descarregarJSON(
    "users_backup",
    typeof window.usersData !== "undefined"
      ? window.usersData
      : []
  );

}

/* PISTOLAS */

function exportPistolasJSON(){

  descarregarJSON(
    "pistolas_backup",
    typeof window.pistolasData !== "undefined"
      ? window.pistolasData
      : []
  );

}

/* PORTAS */

function exportPortasJSON(){

  descarregarJSON(
    "portas_backup",
    typeof window.portasData !== "undefined"
      ? window.portasData
      : []
  );

}

window.exportUsersJSON =
  exportUsersJSON;

window.exportPistolasJSON =
  exportPistolasJSON;

window.exportPortasJSON =
  exportPortasJSON;




/* =========================
   IMPORT JSON FIREBASE
========================= */

async function importarUsersJSONFirebase(){

  try{

    if(!window.db){

      alert(
        "Firebase não iniciada."
      );

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const users =
          JSON.parse(text);

        if(!Array.isArray(users)){

          alert(
            "JSON inválido."
          );

          return;

        }

        let total = 0;

        for(const user of users){

          await window.db
            .collection("users")
            .add(user);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " users."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro ao importar JSON."
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

window.importarUsersJSONFirebase =
  importarUsersJSONFirebase;




/* =========================
   EXPORT + IMPORT JSON
========================= */

function descarregarJSON(nome, dados){

  try{

    const blob = new Blob(
      [
        JSON.stringify(
          dados || [],
          null,
          2
        )
      ],
      {
        type:"application/json"
      }
    );

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =
      nome + "_" +
      Date.now() +
      ".json";

    document.body.appendChild(a);

    a.click();

    setTimeout(()=>{

      URL.revokeObjectURL(a.href);

      a.remove();

    },1000);

  }catch(error){

    console.error(error);

    alert("Erro export JSON");

  }

}

/* EXPORTS */

function exportUsersJSON(){

  descarregarJSON(
    "users_backup",
    typeof window.usersData !== "undefined"
      ? window.usersData
      : []
  );

}

function exportPistolasJSON(){

  descarregarJSON(
    "pistolas_backup",
    typeof window.pistolasData !== "undefined"
      ? window.pistolasData
      : []
  );

}

function exportPortasJSON(){

  descarregarJSON(
    "portas_backup",
    typeof window.portasData !== "undefined"
      ? window.portasData
      : []
  );

}

/* IMPORT USERS */

async function importarUsersJSONFirebase(){

  try{

    if(!window.db){

      alert("Firebase não iniciada.");

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const users =
          JSON.parse(text);

        if(!Array.isArray(users)){

          alert("JSON inválido");

          return;

        }

        let total = 0;

        for(const user of users){

          await window.db
            .collection("users")
            .add(user);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " users."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro import users: "
          + error.message
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

/* IMPORT PISTOLAS */

async function importarPistolasJSONFirebase(){

  try{

    if(!window.db){

      alert("Firebase não iniciada.");

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const dados =
          JSON.parse(text);

        let total = 0;

        for(const item of dados){

          await window.db
            .collection("pistolas")
            .add(item);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " pistolas."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro import pistolas: "
          + error.message
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

/* IMPORT PORTAS */

async function importarPortasJSONFirebase(){

  try{

    if(!window.db){

      alert("Firebase não iniciada.");

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const dados =
          JSON.parse(text);

        let total = 0;

        for(const item of dados){

          await window.db
            .collection("portas")
            .add(item);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " portas."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro import portas: "
          + error.message
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

window.exportUsersJSON = exportUsersJSON;
window.exportPistolasJSON = exportPistolasJSON;
window.exportPortasJSON = exportPortasJSON;

window.importarUsersJSONFirebase =
  importarUsersJSONFirebase;

window.importarPistolasJSONFirebase =
  importarPistolasJSONFirebase;

window.importarPortasJSONFirebase =
  importarPortasJSONFirebase;



window.db = firebase.firestore();






// removed old helper
/*
 const el = document.getElementById("InputUser");
 if(el && user){
   el.value = user. || "";
 }
};

*/
/* removed old helper */
function _unused(){
 const el = document.getElementById("InputUser");
 return el ? el.value.trim() : "";
};




/* ORDENAÇÃO ALFANUMÉRICA USERS */
setInterval(() => {
  try{
    if(Array.isArray(window.usersData)){
      window.usersData.sort((a,b)=>{
        const na = String(a?.nome || '').toLowerCase();
        const nb = String(b?.nome || '').toLowerCase();
        return na.localeCompare(nb,'pt',{numeric:true});
      });
    }
  }catch(e){
    console.error(e);
  }
},1000);



/* ===== ORGANIZAÇÃO ALFANUMÉRICA ===== */

function ordenarColecaoAlfaNumerica(lista,campo="nome"){

  try{

    if(!Array.isArray(lista)) return lista;

    return lista.sort((a,b)=>{

      const aTxt =
        String(a?.[campo] || "")
        .toLowerCase();

      const bTxt =
        String(b?.[campo] || "")
        .toLowerCase();

      return aTxt.localeCompare(
        bTxt,
        'pt',
        {
          numeric:true,
          sensitivity:'base'
        }
      );

    });

  }catch(e){

    console.error(e);

    return lista;

  }

}

setInterval(()=>{

  try{

    if(window.usersData){
      ordenarColecaoAlfaNumerica(
        window.usersData,
        "nome"
      );
    }

    if(window.pistolasData){
      ordenarColecaoAlfaNumerica(
        window.pistolasData,
        "nome"
      );
    }

    if(window.portasData){
      ordenarColecaoAlfaNumerica(
        window.portasData,
        "nome"
      );
    }

  }catch(e){

    console.error(e);

  }

},1500);



/* ===== ORDENAÇÃO ALFANUMÉRICA SEGURA ===== */

window.safeOrdenacaoAlfa = function(lista,campo="nome"){

  try{

    if(!Array.isArray(lista)) return lista;

    return lista.sort((a,b)=>{

      const aTxt =
        String(a?.[campo] || "")
          .toLowerCase();

      const bTxt =
        String(b?.[campo] || "")
          .toLowerCase();

      return aTxt.localeCompare(
        bTxt,
        'pt',
        {
          numeric:true,
          sensitivity:'base'
        }
      );

    });

  }catch(e){

    console.error(e);

    return lista;

  }

};



window.addEventListener('error',function(e){
  console.error('GLOBAL APP ERROR:',e.error||e.message);
});





/* ===== PISTOLAS STABLE REALTIME PATCH ===== */

window.getListaPistolas = function(){

  if(Array.isArray(window.pistolas)){
    return window.pistolas;
  }

  if(Array.isArray(window.listaPistolas)){
    return window.listaPistolas;
  }

  if(Array.isArray(window.pistolasData)){
    return window.pistolasData;
  }

  return [];

};

window.renderPistolas = function(lista){

  const container =
    document.querySelector("#listaPistolas");

  if(!container) return;

  lista = Array.isArray(lista)
    ? lista
    : getListaPistolas();

  const total = lista.length;

  const braga = lista.filter(
    p => String(p.armazem || "")
      .toLowerCase()
      .includes("braga")
  ).length;

  const reserva = lista.filter(
    p => String(p.operador || "")
      .toLowerCase()
      .includes("reserva")
  ).length;

  const totalEl =
    document.querySelector("#countPistolas");

  const bragaEl =
    document.querySelector("#countPistolasBraga");

  const reservaEl =
    document.querySelector("#countPistolasReserva");

  if(totalEl) totalEl.textContent = total;
  if(bragaEl) bragaEl.textContent = braga;
  if(reservaEl) reservaEl.textContent = reserva;

  container.innerHTML = lista.map((p,index)=>{

    const id =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return `

      <div class="pc-card">

        <div class="pc-name">
          ${p.nome || "-"}
        </div>

        <div class="meta-line">
          N?: ${p.num || "-"}
        </div>

        <div class="meta-line">
          Operador:
          ${p.operador || "-"}
        </div>

        <button
          class="secondary-btn"
          onclick="editarPistola('${id}')">

          Editar

        </button>

      </div>

    `;

  }).join("");

};

window.editarPistola = function(id){

  const lista = getListaPistolas();

  const pistola = lista.find((p,index)=>{

    const pid =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return String(pid) === String(id);

  });

  if(!pistola){
    console.error("Pistola não encontrada", id);
    return;
  }

  window.pistolaAtual = pistola;

  const map = {
    num: "#editP_num",
    nome: "#editP_nome",
    password: "#editP_password",
    cn: "#editP_cn",
    sn: "#editP_sn",
    mac: "#editP_mac",
    operador: "#editP_operador",
    armazem: "#editP_armazem",
    prontas: "#editP_prontas"
  };

  Object.entries(map).forEach(([key,selector])=>{

    const el = document.querySelector(selector);

    if(el){
      el.value = pistola[key] || "";
    }

  });

  const modal =
    document.querySelector("#modalEditarPistola");

  if(modal){
    modal.style.display = "flex";
  }

};

console.log("PISTOLAS REALTIME FIX OK");



/* ===== PISTOLAS SAVE + SORT FIX ===== */

window.sortPistolasNaturally = function(lista){

  return [...lista].sort((a,b)=>{

    const aa = String(a.nome || a.num || "");
    const bb = String(b.nome || b.num || "");

    return aa.localeCompare(
      bb,
      "pt",
      {
        numeric:true,
        sensitivity:"base"
      }
    );

  });

};

const oldRender = window.renderPistolas;

window.renderPistolas = function(lista){

  lista = Array.isArray(lista)
    ? sortPistolasNaturally(lista)
    : sortPistolasNaturally(getListaPistolas());

  return oldRender(lista);

};

window.guardarEdicaoPistola = async function(){

  try{

    const pistola = window.pistolaAtual;

    if(!pistola){

      alert("Nenhuma Pistola foi selecionada");
      return;

    }

    const id =
      pistola.idDoc ||
      pistola.id ||
      pistola.docId;

    if(!id){

      alert("ID da pistola inválido");
      return;

    }

    const dados = {

      nome:
        document.querySelector("#editP_nome")?.value || "",

      num:
        document.querySelector("#editP_num")?.value || "",

      password:
        document.querySelector("#editP_password")?.value || "",

      cn:
        document.querySelector("#editP_cn")?.value || "",

      sn:
        document.querySelector("#editP_sn")?.value || "",

      mac:
        document.querySelector("#editP_mac")?.value || "",

      operador:
        document.querySelector("#editP_operador")?.value || "",

      armazem:
        document.querySelector("#editP_armazem")?.value || "",

      prontas:
        document.querySelector("#editP_prontas")?.value || ""

    };

    await window.db
      .collection("pistolas")
      .doc(id)
      .update(dados);

    Object.assign(
      pistola,
      dados
    );

    renderPistolas();

    const modal =
      document.querySelector("#modalEditarPistola");

    if(modal){
      modal.style.display = "none";
    }

    console.log("PISTOLA GUARDADA");

  }catch(err){

    console.error(err);
    alert("Erro ao guardar pistola");

  }

};

document.addEventListener("click", e => {

  const btn = e.target.closest("button");

  if(!btn) return;

  if(
    btn.textContent
      .toLowerCase()
      .includes("guardar")
  ){

    const modal =
      document.querySelector("#modalEditarPistola");

    if(modal &&
      modal.style.display !== "none"){

      e.preventDefault();

      guardarEdicaoPistola();

    }

  }

});

console.log("PISTOLAS SAVE FIX OK");



/* ===== PISTOLAS VIEW + DELETE + SEARCH FIX ===== */

window.verMaisPistola = function(id){

  const lista = getListaPistolas();

  const pistola = lista.find((p,index)=>{

    const pid =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return String(pid) === String(id);

  });

  if(!pistola){
    alert("Pistola não encontrada");
    return;
  }

  alert(
`Nome: ${pistola.nome || "-"}

N?: ${pistola.num || "-"}

Password: ${pistola.password || "-"}

CN: ${pistola.cn || "-"}

SN: ${pistola.sn || "-"}

MAC: ${pistola.mac || "-"}

Operador: ${pistola.operador || "-"}

Armazém: ${pistola.armazem || "-"}

Prontas: ${pistola.prontas || "-"}`
  );

};

window.apagarPistola = async function(id){

  const confirmar = confirm(
    "Deseja apagar esta pistola?"
  );

  if(!confirmar) return;

  try{

    await window.db
      .collection("pistolas")
      .doc(id)
      .delete();

    console.log("PISTOLA APAGADA");

  }catch(err){

    console.error(err);
    alert("Erro ao apagar pistola");

  }

};

const oldRenderPistolas2 = window.renderPistolas;

window.renderPistolas = function(lista){

  lista = Array.isArray(lista)
    ? lista
    : getListaPistolas();

  lista = sortPistolasNaturally(lista);

  const container =
    document.querySelector("#listaPistolas");

  if(!container){
    return oldRenderPistolas2(lista);
  }

  const total = lista.length;

  const totalEl =
    document.querySelector("#countPistolas");

  if(totalEl){
    totalEl.textContent = total;
  }

  container.innerHTML = lista.map((p,index)=>{

    const id =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return `

      <div class="pc-card">

        <div class="pc-name">
          ${p.nome || "-"}
        </div>

        <div class="meta-line">
          N?:
          <span class="meta-value">
            ${p.num || "-"}
          </span>
        </div>

        <div class="meta-line">
          Operador:
          <span class="meta-value">
            ${p.operador || "-"}
          </span>
        </div>

        <div class="item-actions">

          <button
            class="secondary-btn"
            onclick="editarPistola('${id}')">
            Editar
          </button>

          <button
            class="secondary-btn"
            onclick="verMaisPistola('${id}')">
            Ver Mais
          </button>

          <button
            class="secondary-btn"
            onclick="apagarPistola('${id}')">
            Apagar
          </button>

        </div>

      </div>

    `;

  }).join("");

};

window.filtrarPistolas = function(txt=""){

  const termo =
    String(txt || "")
      .toLowerCase()
      .trim();

  const lista = getListaPistolas();

  const filtradas = lista.filter(p => {

    return [
      p.nome,
      p.num,
      p.password,
      p.cn,
      p.sn,
      p.mac,
      p.operador,
      p.armazem,
      p.prontas
    ].some(v =>

      String(v || "")
        .toLowerCase()
        .includes(termo)

    );

  });

  renderPistolas(filtradas);

};

window.filtrarPistolasComFiltros = function(){

  const input =
    document.querySelector("#searchPistolas");

  const txt = input
    ? input.value
    : "";

  filtrarPistolas(txt);

};

document.addEventListener("input", e => {

  if(
    e.target &&
    e.target.id === "searchPistolas"
  ){

    filtrarPistolas(e.target.value);

  }

});

console.log("PISTOLAS VIEW/DELETE/SEARCH FIX OK");


// ===== APP_BRAGA_THEME_SYSTEM =====

window.loadTheme = function(){

  try{
    document.documentElement.classList.add("dark", "app-dark");
    document.body.classList.add("dark", "app-dark");
    if (window.AppThemePro) {
      window.AppThemePro.apply(window.AppThemePro.getCachedTheme(), { persist: false });
    }

  }catch(e){
    console.log(e);
  }

};

window.saveTheme = function(theme){

  try{
    document.documentElement.classList.add("dark", "app-dark");
    document.body.classList.add("dark", "app-dark");
  }catch(e){
    console.log(e);
  }

};

window.toggleTheme = function(){
  window.loadTheme();

};

document.addEventListener(
  "DOMContentLoaded",
  window.loadTheme
);

window.addEventListener(
  "pageshow",
  window.loadTheme
);

/* ===== APP BRAGA FINAL PISTOLAS CRUD FIX ===== */
function getPistolaId(pistola, index = 0) {
  return pistola?.idDoc || pistola?.firebaseId || pistola?.id || pistola?.docId || pistola?._ref || `local-pistola-${index}`;
}

function pistolaPayloadFromForm() {
  return {
    num: document.querySelector("#editP_num")?.value.trim() || "",
    nome: document.querySelector("#editP_nome")?.value.trim() || "",
    password: document.querySelector("#editP_password")?.value.trim() || "",
    cn: document.querySelector("#editP_cn")?.value.trim() || "",
    sn: document.querySelector("#editP_sn")?.value.trim() || "",
    mac: document.querySelector("#editP_mac")?.value.trim() || "",
    operador: document.querySelector("#editP_operador")?.value.trim() || "",
    armazem: document.querySelector("#editP_armazem")?.value.trim() || "",
    prontas: document.querySelector("#editP_prontas")?.value.trim() || "",
    updatedAt: Date.now()
  };
}

function fillPistolaForm(pistola = {}) {
  const map = {
    editP_num: pistola.num,
    editP_nome: pistola.nome,
    editP_password: pistola.password,
    editP_cn: pistola.cn,
    editP_sn: pistola.sn,
    editP_mac: pistola.mac,
    editP_operador: pistola.operador,
    editP_armazem: pistola.armazem,
    editP_prontas: pistola.prontas
  };
  Object.entries(map).forEach(([id, value]) => {
    const field = document.getElementById(id);
    if (field) field.value = value || "";
  });
}

function openPistolaModal(title) {
  const titleEl = document.querySelector("#modalEditarPistola h3");
  if (titleEl) titleEl.textContent = title;
  const modal = document.querySelector("#modalEditarPistola");
  if (modal) modal.style.display = "flex";
}

window.abrirAdicionarPistola = function() {
  window.pistolaAtual = null;
  window.pistolaEditRef = "__new__";
  fillPistolaForm({});
  openPistolaModal("Adicionar Pistola CK65");
};

window.editarPistola = function(id) {
  const lista = getListaPistolas();
  const pistola = lista.find((item, index) => String(getPistolaId(item, index)) === String(id));
  if (!pistola) {
    mostrarMensagem("Pistola não encontrada.", "erro");
    return;
  }
  window.pistolaAtual = pistola;
  window.pistolaEditRef = getPistolaId(pistola);
  fillPistolaForm(pistola);
  openPistolaModal("Editar Pistola CK65");
};

window.guardarEdicaoPistola = async function() {
  const dados = pistolaPayloadFromForm();
  if (!dados.nome && !dados.num) {
    mostrarMensagem("Preenche pelo menos o número ou o nome da pistola.", "erro");
    return;
  }

  try {
    if (window.pistolaEditRef === "__new__") {
      const payload = { ...dados, createdAt: Date.now() };
      if (window.db?.collection) {
        const docRef = await window.db.collection("pistolas").add(payload);
        window.pistolasData.unshift({ idDoc: docRef.id, firebaseId: docRef.id, ...payload });
      } else {
        window.pistolasData.unshift({ id: Date.now().toString(), ...payload });
      }
      mostrarMensagem("Pistola criada.");
    } else {
      const id = window.pistolaEditRef;
      if (window.db?.collection && id && !String(id).startsWith("local-pistola-")) {
        await window.db.collection("pistolas").doc(String(id)).set(dados, { merge: true });
      }
      const index = window.pistolasData.findIndex((item, itemIndex) => String(getPistolaId(item, itemIndex)) === String(id));
      if (index >= 0) window.pistolasData[index] = { ...window.pistolasData[index], ...dados };
      mostrarMensagem("Pistola atualizada.");
    }
    const modal = document.querySelector("#modalEditarPistola");
    if (modal) modal.style.display = "none";
    window.pistolaAtual = null;
    window.pistolaEditRef = null;
    window.renderPistolas();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar pistola.", "erro");
  }
};

window.apagarPistola = async function(id) {
  if (!confirm("Deseja apagar esta pistola?")) return;
  try {
    if (window.db?.collection && id && !String(id).startsWith("local-pistola-")) {
      await window.db.collection("pistolas").doc(String(id)).delete();
    }
    window.pistolasData = getListaPistolas().filter((item, index) => String(getPistolaId(item, index)) !== String(id));
    window.renderPistolas();
    mostrarMensagem("Pistola apagada.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar pistola.", "erro");
  }
};

window.renderPistolas = function(lista) {
  const container = document.querySelector("#listaPistolas");
  if (!container) return;
  let items = (Array.isArray(lista) ? lista : getListaPistolas()).slice();
  if (typeof sortPistolasNaturally === "function") items = sortPistolasNaturally(items);

  const totalEl = document.querySelector("#countPistolas");
  if (totalEl) totalEl.textContent = String(items.length);

  container.innerHTML = items.length ? items.map((pistola, index) => {
    const id = getPistolaId(pistola, index);
    return `
      <div class="pc-card pistol-card">
        <div class="pc-name">${safeRefHtml(pistola.nome || "Pistola CK65")}</div>
        <div class="meta-line">N?: <span class="meta-value">${safeRefHtml(pistola.num || "-")}</span></div>
        <div class="meta-line">Operador: <span class="meta-value">${safeRefHtml(pistola.operador || "-")}</span></div>
        <div class="meta-line">Armazém: <span class="meta-value">${safeRefHtml(pistola.armazem || "-")}</span></div>
        <div class="meta-line">CN: <span class="meta-value">${safeRefHtml(pistola.cn || "-")}</span></div>
        <div class="meta-line">SN: <span class="meta-value">${safeRefHtml(pistola.sn || "-")}</span></div>
        <div class="item-actions">
          ${equipmentFichaLinkAppBraga("pistola", pistola, index, "local-pistola")}
          <button class="secondary-btn" type="button" onclick="editarPistola('${safeRefHtml(id)}')">
            Editar
          </button>
          <button class="secondary-btn" type="button" onclick="verMaisPistola('${safeRefHtml(id)}')">
            Ver Mais
          </button>
          <button class="secondary-btn" type="button" onclick="apagarPistola('${safeRefHtml(id)}')">
            Apagar
          </button>
        </div>
      </div>
    `;
  }).join("") : `<div class="reference-empty">Sem pistolas registadas.</div>`;
};


/* ===== BUTTON TEXT CONTRAST SETTINGS ===== */
function getButtonTextMode() {
  return getCookieAppBraga("appButtonTextMode") || "auto";
}

async function guardarModoTextoBotoes(mode) {
  const allowed = ["auto", "dark", "light"];
  const finalMode = allowed.includes(mode) ? mode : "auto";
  setCookieAppBraga("appButtonTextMode", finalMode, 31536000);
  aplicarModoTextoBotoes(finalMode);
  if (!window.db || !window.db.collection) return;
  try {
    await window.db.collection("config").doc("layout").set({
      buttonTextMode: finalMode,
      updatedAt: Date.now()
    }, { merge: true });
    mostrarMensagem("Cor do texto dos botões atualizada.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar a cor do texto.", "erro");
  }
}

function aplicarModoTextoBotoes(modeValue = getButtonTextMode()) {
  const allowed = ["auto", "dark", "light"];
  const mode = allowed.includes(modeValue) ? modeValue : "auto";
  const root = document.documentElement;

  root.setAttribute("data-button-text-mode", mode);

  if (mode === "dark") {
    root.style.setProperty("--app-button-text", "#000827");
    root.style.setProperty("--app-button-icon", "#000827");
  } else if (mode === "light") {
    root.style.setProperty("--app-button-text", "#ffffff");
    root.style.setProperty("--app-button-icon", "#ffffff");
  } else {
    const accent = getComputedStyle(root).getPropertyValue("--app-accent").trim() || APP_DEFAULT_ACCENT;
    const clean = accent.replace("#", "");
    let r = 37, g = 99, b = 235;

    if (/^[0-9a-fA-F]{6}$/.test(clean)) {
      r = parseInt(clean.slice(0, 2), 16);
      g = parseInt(clean.slice(2, 4), 16);
      b = parseInt(clean.slice(4, 6), 16);
    }

    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    const text = brightness > 170 ? "#000827" : "#ffffff";

    root.style.setProperty("--app-button-text", text);
    root.style.setProperty("--app-button-icon", text);
  }

  const select = document.getElementById("appButtonTextMode");
  if (select) select.value = mode;
}

document.addEventListener("DOMContentLoaded", aplicarModoTextoBotoes);
setTimeout(() => { if (typeof aplicarModoTextoBotoes === "function") aplicarModoTextoBotoes(); }, 300);
/* ===== END BUTTON TEXT CONTRAST SETTINGS ===== */


/* ===== BUTTON TEXT AFTER COLOR CHANGE PATCH ===== */
document.addEventListener("change", function(e) {
  if (e.target && e.target.id === "appAccentColor") {
    setTimeout(() => {
      if (typeof aplicarModoTextoBotoes === "function") aplicarModoTextoBotoes();
    }, 100);
  }
});
/* ===== END BUTTON TEXT AFTER COLOR CHANGE PATCH ===== */





/* ===== ANDROID TABLET SCALE JS ===== */
function aplicarEscalaTabletAndroidAppBraga() {
  const isAndroidTablet = document.body.classList.contains("is-android-tablet");
  if (!isAndroidTablet) return;

  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const height = window.innerHeight || document.documentElement.clientHeight || 0;
  const minSide = Math.min(width, height);

  let scale = 1.10;

  if (minSide >= 800) scale = 1.16;
  if (minSide >= 900) scale = 1.22;

  document.documentElement.style.setProperty("--android-tablet-scale", String(scale));
  document.body.classList.add("android-tablet-scale-ready");
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(aplicarEscalaTabletAndroidAppBraga, 100);
  setTimeout(aplicarEscalaTabletAndroidAppBraga, 600);
});

window.addEventListener("resize", () => {
  setTimeout(aplicarEscalaTabletAndroidAppBraga, 100);
}, { passive: true });

window.addEventListener("orientationchange", () => {
  setTimeout(aplicarEscalaTabletAndroidAppBraga, 300);
}, { passive: true });
/* ===== END ANDROID TABLET SCALE JS ===== */


/* ===== FULL PAGE SCROLL PROXY ===== */
(function(){
  /*
    Disabled on purpose: mobile/tablet browsers need native body scrolling.
    Proxying wheel/touch events caused sticky scrolling on Android tablets and iPhone.
  */
})();
/* ===== END FULL PAGE SCROLL PROXY ===== */




/* Sistema antigo de cores removido para evitar conflito com Theme Studio. */



/* ===== OLD APPEARANCE ACCENT DISABLED ===== */
(function(){
  const oldKeys = [
    "appAccentColor",
    "appBragaAccent",
    "appBragaPrimaryColor",
    "selectedAccentColor",
    "themeAccent",
    "corPrincipalApp",
    "appPrimaryColor"
  ];
  try { oldKeys.forEach(k => localStorage.removeItem(k)); } catch(e) {}

  window.setAppAccentColor = function(){ 
    console.warn("Cor principal da App foi removida. Usa o Centro de Cores.");
  };
  window.changeAppAccentColor = window.setAppAccentColor;
  window.aplicarCorPrincipalApp = window.setAppAccentColor;
  window.guardarCorPrincipalApp = window.setAppAccentColor;
})();
/* ===== END OLD APPEARANCE ACCENT DISABLED ===== */


/* ===== OLD COLOR SYSTEM HARD DISABLED ===== */
(function(){
  const oldKeys=["appAccentColor","appBragaAccent","appBragaPrimaryColor","selectedAccentColor","themeAccent","corPrincipalApp","appPrimaryColor","appBragaThemeStudioSimpleV3","appBragaThemePresetsEnabled","appBragaAdvancedColorsV1","appBragaAdvancedColorsEnabled"];
  try{oldKeys.forEach(k=>localStorage.removeItem(k));}catch(e){}
  window.setAppAccentColor=function(){console.warn("Sistema antigo removido. Usa Centro de Cores.");};
  window.changeAppAccentColor=window.setAppAccentColor;
  window.aplicarCorPrincipalApp=window.setAppAccentColor;
  window.guardarCorPrincipalApp=window.setAppAccentColor;
  window.themeFirebasePushNow=function(){};
  window.themeFirebaseReloadNow=function(){};
})();
/* ===== END OLD COLOR SYSTEM HARD DISABLED ===== */


/* ===== ETIQUETA TONER HARD PRINT CSS ===== */
(function(){
  window.reforcarEtiquetaTonerPrint = function(){
    const styleId = "etiqueta-toner-hard-print-css";
    let style = document.getElementById(styleId);
    if(!style){
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      @page { size: 100mm 150mm; margin: 0; }
      #printAreaEtiquetaAppBraga,
      #printAreaEtiquetaAppBraga * {
        color: #000 !important;
        opacity: 1 !important;
        text-shadow: none !important;
        filter: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        font-family: "Arial Black", Arial, Helvetica, sans-serif !important;
        font-weight: 950 !important;
        -webkit-font-smoothing: none !important;
        text-rendering: geometricPrecision !important;
      }
      #printAreaEtiquetaAppBraga .etq-sheet {
        background: #fff !important;
        color: #000 !important;
        border: 0 !important;
        outline: 0 !important;
        width: 96mm !important;
        height: 146mm !important;
        max-width: 96mm !important;
        max-height: 146mm !important;
        margin: 2mm !important;
        padding: 6mm !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
      #printAreaEtiquetaAppBraga .etq-title {
        color: #000 !important;
        font-size: 23px !important;
        font-weight: 1000 !important;
        line-height: 1.05 !important;
        letter-spacing: .01em !important;
      }
      #printAreaEtiquetaAppBraga .etq-row,
      #printAreaEtiquetaAppBraga .etq-line,
      #printAreaEtiquetaAppBraga td,
      #printAreaEtiquetaAppBraga th {
        color: #000 !important;
        border-color: #000 !important;
        border-width: 0 !important;
        font-size: 15px !important;
        font-weight: 950 !important;
      }
      #printAreaEtiquetaAppBraga small,
      #printAreaEtiquetaAppBraga .muted {
        color: #000 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
      }
    `;
  };
  document.addEventListener("DOMContentLoaded", window.reforcarEtiquetaTonerPrint);
})();

window.usarPorCodigoEtiquetaToner = usarPorCodigoEtiquetaToner;



/* ===== STOCK QR SCANNER BUTTON ===== */

function tocarBipStockQr() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);

    setTimeout(() => {
      try { ctx.close(); } catch(e) {}
    }, 260);
  } catch (e) {
    // Sem som se o browser bloquear ?udio.
  }
}

function extrairABTDoQrStock(raw) {
  const texto = String(raw || "").trim();
  const match = texto.match(/ABT-[A-Z0-9\-]+/i);
  return match ? match[0].toUpperCase() : texto.toUpperCase();
}

let stockQrScannerInstance = null;
let stockQrScannerActive = false;
let stockQrLastCode = "";
let stockQrLastAt = 0;

function setStockQrStatus(text, type = "") {
  const node = document.getElementById("stockQrStatus");
  if (!node) return;
  node.textContent = text || "";
  node.className = "stock-qr-status" + (type ? " " + type : "");
}


function garantirHtml5QrcodeStock() {
  return new Promise((resolve, reject) => {
    if (typeof Html5Qrcode !== "undefined") {
      resolve(true);
      return;
    }

    const existing = document.querySelector('script[data-stock-qr-lib="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar biblioteca QR.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode";
    script.async = true;
    script.dataset.stockQrLib = "1";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Falha ao carregar biblioteca QR."));
    document.head.appendChild(script);
  });
}

function isIphoneSafariStockQr() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "") || 
         (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}


async function escolherCameraTraseiraStockQr() {
  try {
    await garantirHtml5QrcodeStock();

    if (!Html5Qrcode.getCameras) {
      return { facingMode: { ideal: "environment" } };
    }

    const cameras = await Html5Qrcode.getCameras();
    if (!Array.isArray(cameras) || !cameras.length) {
      throw new Error("Nenhuma cãmara encontrada pelo navegador.");
    }

    const rear = cameras.find((cam) => {
      const label = String(cam.label || "").toLowerCase();
      return (
        label.includes("back") ||
        label.includes("rear") ||
        label.includes("traseira") ||
        label.includes("environment") ||
        label.includes("wide")
      );
    });

    const chosen = rear || cameras[cameras.length - 1] || cameras[0];
    return chosen && chosen.id ? chosen.id : { facingMode: { ideal: "environment" } };
  } catch (error) {
    console.error("Erro ao escolher cãmara:", error);
    throw error;
  }
}

function mensagemErroCameraStockQr(error) {
  const name = String(error && (error.name || error.code) || "");
  const message = String(error && error.message || error || "");

  if (/NotAllowed|Permission|denied/i.test(name + " " + message)) {
    return "Cãmara bloqueada. Vai às definições do Safari e permite a cãmara para este site.";
  }

  if (/NotFound|DevicesNotFound/i.test(name + " " + message)) {
    return "Não encontrei cãmara disponível no iPhone.";
  }

  if (/NotReadable|TrackStart/i.test(name + " " + message)) {
    return "A cãmara está ocupada por outra app. Fecha a cãmara/WhatsApp e tenta outra vez.";
  }

  if (/Overconstrained|Constraint/i.test(name + " " + message)) {
    return "O iPhone recusou a cãmara traseira. Vou tentar outra cãmara.";
  }

  return "Erro ao abrir cãmara: " + (message || name || "erro desconhecido");
}


function garantirPreviewStockQrVisivel() {
  let panel = document.getElementById("stockQrScannerPanel");
  let status = document.getElementById("stockQrStatus");
  let frame = document.getElementById("stockQrPreviewFrame");
  let reader = document.getElementById("stockQrReader");

  if (!frame) {
    frame = document.createElement("div");
    frame.id = "stockQrPreviewFrame";
    frame.className = "stock-qr-preview-frame";
    frame.innerHTML = '<div id="stockQrReader" class="stock-qr-reader"></div><div class="stock-qr-aim"><span></span><span></span><span></span><span></span></div>';

    if (status && status.parentNode) status.parentNode.insertBefore(frame, status);
    else if (panel) panel.appendChild(frame);
    else document.body.appendChild(frame);

    reader = document.getElementById("stockQrReader");
  }

  if (!reader) {
    reader = document.createElement("div");
    reader.id = "stockQrReader";
    reader.className = "stock-qr-reader";
    frame.prepend(reader);
  }

  frame.classList.add("active", "loading");
  frame.style.setProperty("display", "block", "important");
  frame.style.setProperty("visibility", "visible", "important");
  frame.style.setProperty("opacity", "1", "important");
  frame.style.setProperty("height", "360px", "important");
  frame.style.setProperty("min-height", "360px", "important");

  reader.style.setProperty("display", "block", "important");
  reader.style.setProperty("visibility", "visible", "important");
  reader.style.setProperty("opacity", "1", "important");
  reader.style.setProperty("width", "100%", "important");
  reader.style.setProperty("height", "100%", "important");
  reader.style.setProperty("min-height", "360px", "important");

  setTimeout(() => {
    try { frame.scrollIntoView({ behavior: "smooth", block: "center" }); } catch(e) {}
  }, 80);

  return reader;
}

function forcarVideoStockQrVisivel() {
  const frame = document.getElementById("stockQrPreviewFrame");
  const reader = garantirPreviewStockQrVisivel();
  if (frame) {
    frame.classList.add("active");
    frame.classList.remove("loading");
    frame.style.setProperty("display", "block", "important");
  }
  if (reader) {
    reader.style.setProperty("display", "block", "important");
    reader.style.setProperty("height", "360px", "important");
    reader.style.setProperty("min-height", "360px", "important");
  }
  document.querySelectorAll("#stockQrReader video, #stockQrReader canvas").forEach((el) => {
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    el.muted = true;
    el.style.setProperty("display", "block", "important");
    el.style.setProperty("visibility", "visible", "important");
    el.style.setProperty("opacity", "1", "important");
    el.style.setProperty("width", "100%", "important");
    el.style.setProperty("height", "360px", "important");
    el.style.setProperty("object-fit", "cover", "important");
  });
}

async function startStockQrScanner() {
  const reader = document.getElementById("stockQrReader");

  if (!reader) {
    mostrarMensagem("Área do scanner QR não encontrada.", "erro");
    return;
  }

  try {
    await garantirHtml5QrcodeStock();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Biblioteca do scanner QR não carregada.", "erro");
    setStockQrStatus("Biblioteca QR não carregada. Verifica internet/HTTPS.", "erro");
    return;
  }

  if (stockQrScannerActive) {
    mostrarMensagem("Scanner QR já está ligado.", "erro");
    return;
  }

  reader.innerHTML = "";
  stockQrScannerInstance = new Html5Qrcode("stockQrReader");

  try {
    const cameraConfig = await escolherCameraTraseiraStockQr();

    await stockQrScannerInstance.start(
      cameraConfig,
      { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
      async (decodedText) => {
        const code = extrairABTDoQrStock(decodedText);
        const now = Date.now();

        if (!code) return;
        if (code === stockQrLastCode && now - stockQrLastAt < 2500) return;

        stockQrLastCode = code;
        stockQrLastAt = now;

        setStockQrStatus("QR lido. A procurar toner em Stock...");
        mostrarMensagem("QR lido. A procurar toner em Stock...");

        const handled = await usarPorCodigoEtiquetaToner(code);

        if (handled) {
          tocarBipStockQr();
          setStockQrStatus("Toner marcado como usado e movido para Histórico.", "ok");
          await stopStockQrScanner();
        } else {
          setStockQrStatus("QR lido, mas não é uma etiqueta de toner válida.", "erro");
          mostrarMensagem("QR não reconhecido como etiqueta de toner.", "erro");
        }
      },
      () => {}
    );

    stockQrScannerActive = true;
    forcarVideoStockQrVisivel();
    setTimeout(forcarVideoStockQrVisivel, 250);
    setTimeout(forcarVideoStockQrVisivel, 800);
    const previewFrameOk = document.getElementById("stockQrPreviewFrame");
    if (previewFrameOk) previewFrameOk.classList.remove("loading");
    setStockQrStatus("Cãmara ligada. Aponta para o QR da etiqueta.");
    mostrarMensagem("Cãmara QR ligada.");
  } catch (error) {
    console.error("Erro scanner QR Stock:", error);
    const previewFrameError = document.getElementById("stockQrPreviewFrame");
    if (previewFrameError) previewFrameError.classList.remove("loading");
    const msg = mensagemErroCameraStockQr(error);
    setStockQrStatus(msg, "erro");
    mostrarMensagem(msg, "erro");
  }
}

async function stopStockQrScanner() {
  const reader = document.getElementById("stockQrReader");

  try {
    if (stockQrScannerInstance && stockQrScannerActive) {
      await stockQrScannerInstance.stop();
      await stockQrScannerInstance.clear();
    }
  } catch (error) {
    console.error("Erro ao fechar scanner QR Stock:", error);
  } finally {
    stockQrScannerInstance = null;
    stockQrScannerActive = false;
    if (reader) reader.innerHTML = "";
    const previewFrame = document.getElementById("stockQrPreviewFrame");
    if (previewFrame) previewFrame.classList.remove("active", "loading");
    setStockQrStatus("Scanner desligado.");
  }
}

window.startStockQrScanner = startStockQrScanner;
window.stopStockQrScanner = stopStockQrScanner;
/* ===== END STOCK QR SCANNER BUTTON ===== */


window.testarCamerasStockQr = async function(){
  try{
    await garantirHtml5QrcodeStock();
    const cams = await Html5Qrcode.getCameras();
    console.log("Cãmaras disponíveis:", cams);
    setStockQrStatus("Cãmaras encontradas: " + (cams || []).map(c => c.label || c.id).join(" | "));
    return cams;
  }catch(e){
    console.error(e);
    setStockQrStatus(mensagemErroCameraStockQr(e), "erro");
    return [];
  }
};

/* =========================
   APP BRAGA v1.30.7 — DIAGNÓSTICO + UX SEGURO
   Não altera autenticação, roles ou estrutura Firebase.
========================= */
(function(){
  const LOG_KEY = "appBraga_diagnosticLogs_v1";
  const LAST_READ_KEY = "appBraga_lastScannerRead";
  const LAST_LABEL_KEY = "appBraga_lastEtiquetaWordPayload";
  const MAX_LOGS = 40;
  const DIAGNOSTIC_NOISE_PATTERNS = [
    /@firebase\/firestore.*WebChannel transport errored/i,
    /Firestore .*Connection.*WebChannel transport errored/i,
    /WebChannel transport errored/i
  ];

  function nowText(){ try { return new Date().toLocaleString("pt-PT"); } catch(e){ return String(new Date()); } }
  function isDiagnosticNoise(message, extra){
    const text = `${message || ""} ${extra || ""}`;
    return DIAGNOSTIC_NOISE_PATTERNS.some((pattern) => pattern.test(text));
  }
  function readLogs(){
    try {
      return JSON.parse(localStorage.getItem(LOG_KEY) || "[]").filter((item) => !isDiagnosticNoise(item?.message, item?.extra));
    } catch(e){
      return [];
    }
  }
  function writeLogs(logs){ try { localStorage.setItem(LOG_KEY, JSON.stringify((logs || []).slice(0, MAX_LOGS))); } catch(e){} }
  function addLog(level, source, message, extra){
    if (isDiagnosticNoise(message, extra)) return;
    const item = { time: nowText(), level: level || "info", source: source || "app", message: String(message || ""), extra: extra ? String(extra).slice(0,900) : "" };
    const logs = readLogs(); logs.unshift(item); writeLogs(logs);
    try { atualizarLogsDiagnosticoAppBraga(); } catch(e){}
  }
  window.appBragaAddDiagnosticLog = addLog;

  const oldError = console.error;
  console.error = function(){
    try { addLog("error", "console", Array.from(arguments).map(a => a && a.message ? a.message : String(a)).join(" | ")); } catch(e){}
    return oldError.apply(console, arguments);
  };
  const oldWarn = console.warn;
  console.warn = function(){
    try { addLog("warn", "console", Array.from(arguments).map(a => a && a.message ? a.message : String(a)).join(" | ")); } catch(e){}
    return oldWarn.apply(console, arguments);
  };
  window.addEventListener("error", e => addLog("error", "window", e.message || "Erro JS", `${e.filename || ""}:${e.lineno || ""}`));
  window.addEventListener("unhandledrejection", e => addLog("error", "promise", e.reason && e.reason.message ? e.reason.message : String(e.reason || "Promise rejeitada")));

  function setTxt(id, value){ const n = document.getElementById(id); if(n) n.textContent = value; }
  function toDateMs(v){
    if(!v) return 0;
    if(typeof v === "number") return v;
    if(v && typeof v.toDate === "function") return v.toDate().getTime();
    if(v instanceof Date) return v.getTime();
    const t = Date.parse(String(v)); return Number.isFinite(t) ? t : 0;
  }
  function startOfToday(){ const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); }
  function startOfWeek(){ const d = new Date(); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); d.setHours(0,0,0,0); return d.getTime(); }
  function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c])); }

  async function getCollectionArray(name){
    const database = (typeof getDbAppBraga === "function" ? getDbAppBraga() : (window.db || window.firebase?.firestore?.()));
    if(!database || !database.collection) return [];
    const snap = await database.collection(name).get();
    const arr = []; snap.forEach(doc => arr.push({idDoc: doc.id, ...doc.data()})); return arr;
  }

  async function atualizarDashboardUtilAppBraga(){
    if(!document.getElementById("dashTonersHoje")) return;
    try{
      const [stock, historico, etiquetas, manutencoes, impressoras] = await Promise.all([
        getCollectionArray("stock").catch(()=>[]), getCollectionArray("historico").catch(()=>[]), getCollectionArray("etiquetasWord").catch(()=>[]), getCollectionArray("manutencoes").catch(()=>[]), getCollectionArray("impressoras").catch(()=>[])
      ]);
      const today = startOfToday(), week = startOfWeek(), seven = Date.now() - 7*86400000;
      const createdMs = x => toDateMs(x.createdAtMs || x.created || x.createdAt || x.data || x.dataScan || x.dataFolha);
      setTxt("dashTonersHoje", stock.filter(x => createdMs(x) >= today).length);
      setTxt("dashTonersSemana", historico.filter(x => createdMs(x) >= week).length);
      setTxt("dashEtiquetasRecentes", etiquetas.filter(x => createdMs(x) >= seven).length);
      const logs = readLogs(); const critical = logs.filter(x => x.level === "error" && Date.now() - Date.parse((x.time||"").replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')) < 86400000).length;
      setTxt("dashHealthMini", critical ? "Atenção" : "OK");
      setTxt("dashHealthMiniText", critical ? `${critical} erro(s) nas últimas leituras` : "Sem erros críticos");
      const etHost = document.getElementById("dashUltimasEtiquetas");
      if(etHost){
        const list = etiquetas.sort((a,b)=>createdMs(b)-createdMs(a)).slice(0,5);
        etHost.innerHTML = list.length ? list.map(t => `<div class="mini-feed-item"><div><strong>${esc(t.localCurto || t.localizacao || t.serie || "Etiqueta")}</strong><span>${esc(t.serie || t.codigoEtiqueta || "-")}</span></div><small>${esc(t.dataEtiqueta || t.data || "")}</small></div>`).join("") : `<div class="mini-feed-item"><span>Sem etiquetas recentes</span></div>`;
      }
      const mHost = document.getElementById("dashManutencoesPendentes");
      if(mHost){
        const pend = manutencoes.filter(x => !/fechad|conclu|resolvid|ok/i.test(String(x.estado || x.status || ""))).slice(0,4);
        const impProblem = impressoras.filter(x => /erro|avaria|baixo|offline|manut/i.test(String(x.estado || x.status || x.obs || ""))).slice(0,3);
        const rows = [...pend.map(x=>({a:x.impressora||x.equipamento||"Manutenção", b:x.estado||x.status||"Pendente"})), ...impProblem.map(x=>({a:x.nome||x.modelo||x.localizacao||"Impressora", b:x.estado||x.status||"Atenção"}))].slice(0,5);
        mHost.innerHTML = rows.length ? rows.map(x => `<div class="mini-feed-item"><strong>${esc(x.a)}</strong><small>${esc(x.b)}</small></div>`).join("") : `<div class="mini-feed-item"><span>Sem pendências detetadas</span></div>`;
      }
    } catch(e){ addLog("error", "dashboard", e.message || e); }
  }
  window.atualizarDashboardUtilAppBraga = atualizarDashboardUtilAppBraga;

  setTimeout(() => {
    if(typeof window.processarTextoLidoStable === "function") return;
    const oldProc = window.processarOCRInput;
    if(typeof oldProc === "function"){
      window.processarOCRInput = async function(ev){
        setTxt("scannerOcrState", "A ler...");
        try{ const r = await oldProc.apply(this, arguments); setTxt("scannerOcrState", "Lido"); return r; }
        catch(e){ setTxt("scannerOcrState", "Erro"); addLog("error", "ocr", e.message || e); throw e; }
      };
    }
    const oldGerar = window.gerarWordEtiquetaFromForm;
    if(typeof oldGerar === "function"){
      window.gerarWordEtiquetaFromForm = async function(){
        const payload = (typeof extrairDadosEtiquetaWord === "function") ? extrairDadosEtiquetaWord() : null;
        const ok = await oldGerar.apply(this, arguments);
        if(ok && payload){ try{ localStorage.setItem(LAST_LABEL_KEY, JSON.stringify(payload)); }catch(e){} addLog("info", "etiqueta", `Etiqueta gerada: ${payload.codigoEtiqueta || payload.serie || "sem código"}`); }
        return ok;
      };
    }
  }, 800);

  async function reimprimirUltimaEtiquetaWord(){
    try{
      let payload = null;
      try{ payload = JSON.parse(localStorage.getItem(LAST_LABEL_KEY) || "null"); }catch(e){}
      if(!payload){
        const arr = await getCollectionArray("etiquetasWord");
        payload = arr.sort((a,b)=>toDateMs(b.created || b.createdAtMs)-toDateMs(a.created || a.createdAtMs))[0];
      }
      if(!payload) return typeof mostrarMensagem === "function" && mostrarMensagem("Ainda não existe uma etiqueta para reimprimir.", "erro");
      if(typeof gerarWordEtiquetaPartilhada === "function") await gerarWordEtiquetaPartilhada(payload, { saveRecord:false, silent:false });
      else if(typeof gerarWordEtiquetaFromForm === "function") await gerarWordEtiquetaFromForm(false);
      addLog("info", "etiqueta", "Reimpressão da última etiqueta");
    } catch(e){ addLog("error", "etiqueta", e.message || e); if(typeof mostrarMensagem === "function") mostrarMensagem("Erro ao reimprimir a última etiqueta.", "erro"); }
  }
  window.reimprimirUltimaEtiquetaWord = reimprimirUltimaEtiquetaWord;

  function card(label, value, status){ return `<div class="diagnostic-card ${esc(status||"")}"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`; }
  async function executarDiagnosticoAppBraga(){
    const checks = [];
    checks.push(["Versao", (typeof APP_VERSION !== "undefined" ? APP_VERSION : "1.30.0"), "ok"]);
    checks.push(["Rede", navigator.onLine ? "Online" : "Offline", navigator.onLine ? "ok" : "warn"]);
    checks.push(["Firebase", window.firebase ? "Carregado" : "Nao carregado", window.firebase ? "ok" : "error"]);
    checks.push(["Firestore", (typeof getDbAppBraga === "function" && getDbAppBraga()) ? "Disponivel" : "Indisponivel", (typeof getDbAppBraga === "function" && getDbAppBraga()) ? "ok" : "error"]);
    checks.push(["Camara", (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ? "Suportada" : "Nao suportada", (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ? "ok" : "warn"]);
    checks.push(["Scanner QR", typeof Html5Qrcode !== "undefined" ? "Biblioteca OK" : "Biblioteca ausente", typeof Html5Qrcode !== "undefined" ? "ok" : "warn"]);
    checks.push(["OCR", typeof Tesseract !== "undefined" ? "Biblioteca OK" : "Biblioteca ausente", typeof Tesseract !== "undefined" ? "ok" : "warn"]);
    checks.push(["Word/Etiquetas", typeof docx !== "undefined" ? "Biblioteca OK" : "Biblioteca ausente", typeof docx !== "undefined" ? "ok" : "warn"]);
    checks.push(["Cache local", (()=>{try{localStorage.setItem("__test","1");localStorage.removeItem("__test");return "OK"}catch(e){return "Bloqueada"}})(), "ok"]);
    const host = document.getElementById("diagnosticGrid"); if(host) host.innerHTML = checks.map(x => card(x[0],x[1],x[2])).join("");
    atualizarLogsDiagnosticoAppBraga(); addLog("info", "diagnostico", "Verificacao executada");
  }
  window.executarDiagnosticoAppBraga = executarDiagnosticoAppBraga;

  function atualizarLogsDiagnosticoAppBraga(){
    const host = document.getElementById("diagnosticLogs"); if(!host) return;
    const logs = readLogs();
    host.innerHTML = logs.length ? logs.map(l => `<div class="diagnostic-log-item ${esc(l.level)}"><span class="log-time">${esc(l.time)} - ${esc(l.level)} - ${esc(l.source)}</span>${esc(l.message)}${l.extra ? "\n"+esc(l.extra) : ""}</div>`).join("") : `<div class="diagnostic-log-item">Sem erros registados.</div>`;
  }
  window.atualizarLogsDiagnosticoAppBraga = atualizarLogsDiagnosticoAppBraga;
  function limparLogsDiagnosticoAppBraga(){ writeLogs([]); atualizarLogsDiagnosticoAppBraga(); if(typeof mostrarMensagem === "function") mostrarMensagem("Logs limpos.", "sucesso"); }
  window.limparLogsDiagnosticoAppBraga = limparLogsDiagnosticoAppBraga;

  document.addEventListener("DOMContentLoaded", () => {
    atualizarDashboardUtilAppBraga();
    if(document.getElementById("diagnosticGrid")) setTimeout(executarDiagnosticoAppBraga, 500);
    setInterval(atualizarDashboardUtilAppBraga, 60000);
  });
})();

/* ===== APP BRAGA V1.33.4 - SIDEBAR GROUPS STATE FIX ===== */
(function(){
  const STORAGE_KEY = "appBraga.sidebar.groups.open";
  const LEGACY_KEYS = [
    "appBraga.sidebar.groups.open.v1322",
    "appBraga.sidebar.groups.open.v1324"
  ];

  function readJson(key){
    try { return JSON.parse(localStorage.getItem(key) || "{}"); }
    catch(e){ return {}; }
  }

  function readState(){
    let state = readJson(STORAGE_KEY);
    if (!state || Object.keys(state).length === 0) {
      for (const key of LEGACY_KEYS) {
        const legacy = readJson(key);
        if (legacy && Object.keys(legacy).length) { state = legacy; break; }
      }
    }
    return state || {};
  }

  function writeState(state){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state || {})); }
    catch(e){}
  }

  function currentFile(){
    const path = (location.pathname || "").split("/").pop() || "index.html";
    return path.toLowerCase();
  }

  function collectSidebarState(sidebar){
    const next = {};
    sidebar.querySelectorAll(".sidebar-group").forEach((group) => {
      const key = group.dataset.sidebarGroup || "grupo";
      next[key] = group.classList.contains("is-open");
    });
    return next;
  }

  function saveCurrentSidebarState(sidebar){
    if (!sidebar) return;
    writeState(collectSidebarState(sidebar));
  }

  function setupSidebarGroups(){
    const sidebar = document.querySelector(".sidebar-pro-groups, aside.sidebar");
    if (!sidebar) return;

    const activeFile = currentFile();
    sidebar.querySelectorAll("a[href]").forEach((link) => {
      const href = (link.getAttribute("href") || "").split("?")[0].split("#")[0].split("/").pop().toLowerCase();
      if (href === activeFile) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });

    const state = readState();
    sidebar.querySelectorAll(".sidebar-group").forEach((group) => {
      const key = group.dataset.sidebarGroup || "grupo";
      const toggle = group.querySelector(".sidebar-group-toggle");
      const hasActive = !!group.querySelector("a.active, a[aria-current='page']");
      const shouldOpen = Object.prototype.hasOwnProperty.call(state, key) ? !!state[key] : (hasActive || group.dataset.defaultOpen === "1");

      function setOpen(open){
        group.classList.toggle("is-open", !!open);
        if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
      }

      setOpen(shouldOpen);

      if (toggle && toggle.dataset.bound !== "1") {
        toggle.dataset.bound = "1";
        toggle.addEventListener("click", () => {
          const nextOpen = !group.classList.contains("is-open");
          setOpen(nextOpen);
          saveCurrentSidebarState(sidebar);
        });
      }
    });

    if (sidebar.dataset.sidebarGroupsReady !== "1") {
      sidebar.dataset.sidebarGroupsReady = "1";

      /* Guarda o estado real que o utilizador deixou antes de mudar de página. */
      sidebar.addEventListener("click", (event) => {
        const link = event.target.closest("a[href]");
        if (link) saveCurrentSidebarState(sidebar);
      }, true);

      window.addEventListener("pagehide", () => saveCurrentSidebarState(sidebar));
      window.addEventListener("beforeunload", () => saveCurrentSidebarState(sidebar));
    }

    /* Se ainda não existia estado guardado, grava o layout inicial desta página para as próximas. */
    if (!localStorage.getItem(STORAGE_KEY)) saveCurrentSidebarState(sidebar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupSidebarGroups);
  } else {
    setupSidebarGroups();
  }
  setTimeout(setupSidebarGroups, 120);
  setTimeout(setupSidebarGroups, 500);
  setTimeout(setupSidebarGroups, 1200);
})();
/* ===== END APP BRAGA V1.33.4 - SIDEBAR GROUPS STATE FIX ===== */

/* ===== APP BRAGA V1.33.4 - FAVORITOS EDITAVEIS SIDEBAR ===== */
(function(){
  const STORAGE_KEY = "appBraga.sidebar.favoritos.v1329";
  const DEFAULT_FAVS = ["index.html", "stock.html", "diretorio.html", "impressoras.html"];
  const PAGES = [
    { href:"index.html", label:"Dashboard", icon:"🏠" },
    { href:"add-toner.html", label:"Adicionar Toner", icon:"➕" },
    { href:"stock.html", label:"Stock", icon:"📦" },
    { href:"historico.html", label:"Histórico", icon:"🧾" },
    { href:"tarefas.html", label:"Tarefas", icon:"✓" },
    { href:"scanner-ia.html", label:"Scanner IA", icon:"▣" },
    { href:"etiquetas-word.html", label:"Etiquetas Word", icon:"🏷️" },
    { href:"impressoras.html", label:"Impressoras", icon:"🖨️" },
    { href:"manutencao-impressoras.html", label:"Manutenção Impressoras", icon:"🛠️" },
    { href:"computadores.html", label:"Computadores", icon:"💻" },
    { href:"pistolas.html", label:"Pistolas CK65", icon:"📟" },
    { href:"radios.html", label:"Rádios", icon:"📡" },
    { href:"portas.html", label:"Portas Rede", icon:"🔌" },
    { href:"diretorio.html", label:"Diretório", icon:"☎️" },
    { href:"informacoes.html", label:"Informações", icon:"ℹ️" },
    { href:"users.html", label:"Users", icon:"👥" },
    { href:"diagnostico.html", label:"Diagnóstico", icon:"🩺" },
    { href:"config.html", label:"Configurações", icon:"⚙️" }
  ];
  function safeGetFavs(){
    try{
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if(Array.isArray(parsed)) return parsed.filter(Boolean);
    }catch(e){}
    return DEFAULT_FAVS.slice();
  }
  function saveFavs(list){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(list)])); }catch(e){}
  }
  function currentFile(){
    const p = (location.pathname || "").split("/").pop() || "index.html";
    return p === "" ? "index.html" : p;
  }
  function linkFor(page){
    const a = document.createElement("a");
    a.href = page.href;
    a.dataset.icon = page.icon;
    if(currentFile() === page.href) a.classList.add("active");
    a.innerHTML = `<span class="sidebar-link-text">${page.label}</span>`;
    return a;
  }
  function renderFavorites(){
    const section = document.querySelector(".sidebar-favorites");
    if(!section) return;
    const favs = safeGetFavs();
    const pages = favs.map(h => PAGES.find(p => p.href === h)).filter(Boolean);
    section.innerHTML = `
      <div class="sidebar-section-title">
        <span><span>⭐</span><strong> Favoritos</strong></span>
        <button class="sidebar-fav-edit" type="button" title="Editar favoritos" aria-label="Editar favoritos">✦</button>
      </div>
      <div class="sidebar-fav-list"></div>
    `;
    const list = section.querySelector(".sidebar-fav-list");
    if(!pages.length){
      list.innerHTML = '<div class="empty-favs">Sem favoritos. Carrega em ✦ para escolher.</div>';
    }else{
      pages.forEach(p => list.appendChild(linkFor(p)));
    }
    section.querySelector(".sidebar-fav-edit")?.addEventListener("click", openFavModal);
  }
  function openFavModal(){
    document.querySelector(".sidebar-fav-manage-overlay")?.remove();
    const selected = new Set(safeGetFavs());
    const overlay = document.createElement("div");
    overlay.className = "sidebar-fav-manage-overlay";
    overlay.innerHTML = `
      <div class="sidebar-fav-manage-card" role="dialog" aria-modal="true" aria-label="Editar favoritos">
        <div class="sidebar-fav-manage-head">
          <div><h3>Editar favoritos</h3><p>Escolhe as páginas que queres sempre no topo da sidebar.</p></div>
          <button class="sidebar-fav-close" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="sidebar-fav-grid">
          ${PAGES.map(p => `
            <label class="sidebar-fav-option">
              <input type="checkbox" value="${p.href}" ${selected.has(p.href) ? "checked" : ""}>
              <span>${p.icon}</span><span>${p.label}</span>
            </label>`).join("")}
        </div>
        <div class="sidebar-fav-actions">
          <button class="secondary-btn" type="button" data-fav-reset>Repor padrão</button>
          <button class="secondary-btn" type="button" data-fav-cancel>Cancelar</button>
          <button class="primary-btn" type="button" data-fav-save>Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector(".sidebar-fav-close")?.addEventListener("click", close);
    overlay.querySelector("[data-fav-cancel]")?.addEventListener("click", close);
    overlay.addEventListener("click", (e)=>{ if(e.target === overlay) close(); });
    overlay.querySelector("[data-fav-reset]")?.addEventListener("click", ()=>{
      saveFavs(DEFAULT_FAVS); close(); renderFavorites();
    });
    overlay.querySelector("[data-fav-save]")?.addEventListener("click", ()=>{
      const list = Array.from(overlay.querySelectorAll("input[type='checkbox']:checked")).map(i => i.value);
      saveFavs(list); close(); renderFavorites();
    });
  }
  function init(){ renderFavorites(); }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
/* ===== END APP BRAGA V1.33.4 - FAVORITOS EDITAVEIS SIDEBAR ===== */

/* ===== APP BRAGA v1.35.6 - NOTIFICAÇÕES: ESTADO, HISTÓRICO E REPARAÇÃO ===== */
function setPushDiagValueApp(id, text, state = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "-";
  el.classList.remove("ok", "warn", "bad");
  if (state) el.classList.add(state);
}

async function obterPushSubscriptionAtualApp() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    await registarServiceWorkerAppBraga?.();
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.warn("Diagnóstico push: sem subscription atual", error);
    return null;
  }
}

async function atualizarDiagnosticoPushAutomaticoApp() {
  if (!/notificacoes\.html$/i.test(location.pathname || "")) return null;
  const isSecure = !!window.isSecureContext;
  const hasSw = "serviceWorker" in navigator;
  const hasPush = "PushManager" in window;
  const permission = "Notification" in window ? Notification.permission : "unsupported";
  const env = window.electronAPI?.showNotification ? "Electron" : (isStandalonePwaAppBraga() ? "PWA instalada" : "Browser");
  let subscription = null;
  if (isSecure && hasSw && hasPush) subscription = await obterPushSubscriptionAtualApp();
  const endpoint = subscription?.endpoint || appNotificationState.pushSubscriptionEndpoint || "";

  setPushDiagValueApp("pushDiagServiceWorker", hasSw ? "OK" : "Falha", hasSw ? "ok" : "bad");
  setPushDiagValueApp("pushDiagPushManager", hasPush ? "OK" : "Falha", hasPush ? "ok" : "bad");
  setPushDiagValueApp("pushDiagPermission", permission, permission === "granted" ? "ok" : (permission === "denied" ? "bad" : "warn"));
  setPushDiagValueApp("pushDiagEndpoint", endpoint ? "Criado" : "Sem endpoint", endpoint ? "ok" : "warn");
  setPushDiagValueApp("pushDiagEnvironment", env, env === "Electron" ? "warn" : "ok");

  if (window.electronAPI?.showNotification && !endpoint) {
    setCloudNotificationDiagnosticApp("Electron não cria Web Push real neste ambiente. Para PC, usa a PWA instalada pelo Edge/Chrome.", "warn");
  } else if (endpoint) {
    setCloudNotificationDiagnosticApp("Este dispositivo tem endpoint Web Push. Se o teste falhar, o problema está na Cloud Function/Firestore.", "ok");
  }
  return { isSecure, hasSw, hasPush, permission, env, endpoint };
}

function getCloudDeviceReadinessApp(item = {}) {
  const hasStandard = !!(item.pushSubscription?.endpoint || item.endpoint);
  const hasFcm = !!item.token;
  const active = item.active !== false;
  const permission = item.permission || "sem dados";
  const staleMs = Date.now() - normalizeTimestampApp(item.updatedAt || item.createdAt);
  const stale = staleMs > 1000 * 60 * 60 * 24 * 30;
  let state = "warn";
  let label = "Reparar";
  if (!active) { state = "bad"; label = "Inativo"; }
  else if (hasStandard) { state = stale ? "warn" : "ok"; label = stale ? "Antigo" : "Web Push ativo"; }
  else if (hasFcm) { state = stale ? "warn" : "ok"; label = stale ? "FCM antigo" : "FCM ativo"; }
  else { state = "warn"; label = "Sem push cloud"; }
  if (permission === "denied") { state = "bad"; label = "Bloqueado"; }
  return { hasStandard, hasFcm, active, stale, state, label };
}

function getUniqueActiveCloudDevicesApp(items = []) {
  const sorted = items
    .filter((item) => item.active !== false)
    .sort((a, b) => normalizeTimestampApp(b.updatedAt || b.createdAt) - normalizeTimestampApp(a.updatedAt || a.createdAt));
  const map = new Map();
  sorted.forEach((item) => {
    const key = item.pushSubscription?.endpoint || item.endpoint || item.token || item.deviceKey || item.id;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

function renderCloudDevicesNotificacoesApp(items = []) {
  const host = document.getElementById("cloudDevicesList");
  if (!host) return;
  const activeItems = getUniqueActiveCloudDevicesApp(items);
  const webPushItems = activeItems.filter((item) => item.pushSubscription?.endpoint || item.endpoint);
  const remoteItems = activeItems.filter((item) => item.pushSubscription?.endpoint || item.endpoint || item.token);
  setCloudNotificationTextApp("cloudDevicesStatus", `${activeItems.length} registados`, activeItems.length ? "ok" : "warn");
  setCloudNotificationTextApp("cloudDevicesDetail", `${webPushItems.length} Web Push · ${remoteItems.length} remotos prontos`);

  if (!activeItems.length) {
    host.innerHTML = `<div class="empty-state mini">Ainda não há dispositivos registados.</div>`;
    return;
  }

  host.innerHTML = `
    <table class="notification-devices-pro-table">
      <thead>
        <tr><th>Dispositivo</th><th>Tipo</th><th>Push</th><th>Último contacto</th><th>Estado</th></tr>
      </thead>
      <tbody>
        ${activeItems.map((item) => {
          const readiness = getCloudDeviceReadinessApp(item);
          const isCurrent = item.id === appNotificationState.restoredTokenDocId ||
            (appNotificationState.fcmToken && item.token === appNotificationState.fcmToken) ||
            (appNotificationState.pushSubscriptionEndpoint && (item.endpoint === appNotificationState.pushSubscriptionEndpoint || item.pushSubscription?.endpoint === appNotificationState.pushSubscriptionEndpoint));
          const device = labelDispositivoNotificacaoApp(item);
          const role = labelNotificationDeviceRoleApp(item.notificationDeviceRole || item.deviceRole || "");
          const mode = labelMetodoNotificacaoApp(item);
          const endpoint = item.pushSubscription?.endpoint || item.endpoint || item.token || "";
          const updated = formatTimestampApp(item.updatedAt || item.createdAt);
          return `
            <tr class="${isCurrent ? "is-current" : ""}">
              <td data-label="Dispositivo"><div class="notification-device-main"><strong>${escapeHtmlAppBraga(device)}${isCurrent ? " · Este" : ""}</strong><small>${escapeHtmlAppBraga(endpoint)}</small></div></td>
              <td data-label="Tipo"><span class="notification-chip">${escapeHtmlAppBraga(role)}</span></td>
              <td data-label="Push"><span class="notification-chip ${readiness.hasStandard ? "ok" : (readiness.hasFcm ? "ok" : "warn")}">${escapeHtmlAppBraga(mode)}</span></td>
              <td data-label="Último contacto">${escapeHtmlAppBraga(updated)}</td>
              <td data-label="Estado"><span class="notification-chip ${readiness.state}">${escapeHtmlAppBraga(readiness.label)}</span></td>
            </tr>`;
        }).join("")}
      </tbody>
    </table>`;

  if (activeItems.length && !webPushItems.length) {
    setCloudNotificationDiagnosticApp("Nenhum dispositivo tem Web Push standard. Instala como PWA e carrega em Guardar e reparar push.", "warn");
  }
}

async function carregarDispositivosCloudNotificacoesApp(force = false) {
  const host = document.getElementById("cloudDevicesList");
  if (!host || !window.db?.collection) return;
  try {
    host.innerHTML = `<p class="muted">A carregar dispositivos...</p>`;
    const snapshot = await window.db.collection("notificationTokens").get();
    const items = [];
    snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
    renderCloudDevicesNotificacoesApp(items);
    await atualizarDiagnosticoPushAutomaticoApp();
    await carregarHistoricoNotificacoesCloudApp(false);
  } catch (error) {
    console.error("Erro ao carregar dispositivos cloud:", error);
    host.innerHTML = `<div class="empty-state mini">Erro ao carregar dispositivos.</div>`;
  }
}

async function repararTodosRegistosCloudNotificacoesApp() {
  try {
    if (!window.db?.collection) throw new Error("Firebase indisponível.");
    const snapshot = await window.db.collection("notificationTokens").get();
    const batch = window.db.batch();
    const latestByKey = new Map();
    const now = Date.now();
    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      const key = data.pushSubscription?.endpoint || data.endpoint || data.token || data.deviceKey || doc.id;
      const current = latestByKey.get(key);
      const updated = normalizeTimestampApp(data.updatedAt || data.createdAt);
      if (!current || updated > current.updated) latestByKey.set(key, { doc, data, updated });
    });
    let disabled = 0;
    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      const key = data.pushSubscription?.endpoint || data.endpoint || data.token || data.deviceKey || doc.id;
      const latest = latestByKey.get(key);
      const hasRemote = !!(data.token || data.pushSubscription?.endpoint || data.endpoint);
      const tooOld = normalizeTimestampApp(data.updatedAt || data.createdAt) && (now - normalizeTimestampApp(data.updatedAt || data.createdAt) > 1000 * 60 * 60 * 24 * 120);
      if ((latest && latest.doc.id !== doc.id) || data.active === false || !hasRemote || tooOld) {
        batch.set(doc.ref, { active: false, disabledAt: now, disabledReason: latest?.doc.id !== doc.id ? "duplicado-antigo" : (!hasRemote ? "sem-push-cloud" : "registo-antigo") }, { merge: true });
        disabled += 1;
      }
    });
    if (disabled) await batch.commit();
    await repararDispositivoNotificacoesCloudApp();
    setCloudNotificationDiagnosticApp(`Reparação concluída. ${disabled} registo(s) antigo(s) desativado(s).`, "ok");
    await carregarDispositivosCloudNotificacoesApp(true);
  } catch (error) {
    setCloudNotificationDiagnosticApp(error.message || "Erro ao reparar registos cloud.", "bad");
    mostrarMensagem(error.message || "Erro ao reparar registos cloud.", "erro");
  }
}

async function carregarHistoricoNotificacoesCloudApp(showMessage = false) {
  const host = document.getElementById("cloudNotificationsHistory");
  if (!host || !window.db?.collection) return;
  try {
    const snap = await window.db.collection("notificationHistory").orderBy("createdAt", "desc").limit(12).get();
    const items = [];
    snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
    if (!items.length) {
      host.innerHTML = `<div class="empty-state mini">Ainda não há histórico de envios cloud.</div>`;
      return;
    }
    host.innerHTML = items.map((item) => `
      <div class="notification-history-item">
        <div>
          <strong>${escapeHtmlAppBraga(item.title || item.event || "Notificação")}</strong>
          <small>${escapeHtmlAppBraga(item.body || "")} · ${escapeHtmlAppBraga(formatTimestampApp(item.createdAt || item.lastRunAt))}</small>
          ${item.error ? `<small>Erro: ${escapeHtmlAppBraga(item.error)}</small>` : ""}
        </div>
        <div class="notification-history-stats">
          <span class="notification-chip ${Number(item.sent || 0) > 0 ? "ok" : "warn"}">Enviadas: ${Number(item.sent || 0)}</span>
          <span class="notification-chip ${Number(item.failed || 0) > 0 ? "bad" : "ok"}">Falhas: ${Number(item.failed || 0)}</span>
          <span class="notification-chip">WebPush: ${Number(item.standardWebPushTargets || 0)}</span>
          <span class="notification-chip">FCM: ${Number(item.fcmTargets || 0)}</span>
        </div>
      </div>`).join("");
    if (showMessage) mostrarMensagem("Histórico atualizado.", "sucesso");
  } catch (error) {
    console.warn("Histórico notificationHistory indisponível, a tentar auditLogs", error);
    try {
      const snap = await window.db.collection("auditLogs").where("action", "==", "notification-broadcast").limit(12).get();
      const items = [];
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      items.sort((a, b) => normalizeTimestampApp(b.createdAt) - normalizeTimestampApp(a.createdAt));
      host.innerHTML = items.length ? items.map((item) => `
        <div class="notification-history-item">
          <div><strong>${escapeHtmlAppBraga(item.title || item.event || "Notificação")}</strong><small>${escapeHtmlAppBraga(formatTimestampApp(item.createdAt))}</small></div>
          <div class="notification-history-stats"><span class="notification-chip ok">Enviadas: ${Number(item.sent || 0)}</span><span class="notification-chip ${Number(item.failed || 0) ? "bad" : "ok"}">Falhas: ${Number(item.failed || 0)}</span></div>
        </div>`).join("") : `<div class="empty-state mini">Sem histórico disponível.</div>`;
    } catch (innerError) {
      host.innerHTML = `<div class="empty-state mini">Erro ao carregar histórico.</div>`;
    }
  }
}

(function initNotificacoesPro1353(){
  if (APP_NOTIFICATIONS_REBUILD_MODE) return;
  if (!/notificacoes\.html$/i.test(location.pathname || "")) return;
  const run = () => {
    atualizarDiagnosticoPushAutomaticoApp();
    setTimeout(() => {
      carregarHistoricoNotificacoesCloudApp(false);
      carregarDispositivosCloudNotificacoesApp(true);
    }, 900);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
/* ===== END APP BRAGA v1.35.6 ===== */







/* ===== APP BRAGA v1.56.1 - SIDEBAR OPERACIONAL FINAL ===== */
(function(){
  const GROUP_KEY = "appBraga.sidebar.groups.open.v1557";
  const COLLAPSE_KEY = "appBraga.sidebar.collapsed.v1557";
  const DESKTOP = "(min-width: 769px)";

  function isDesktop(){ return !window.matchMedia || window.matchMedia(DESKTOP).matches; }
  function getSidebar(){ return document.querySelector("aside.sidebar, .sidebar"); }
  function currentPage(){ return ((location.pathname || "").split("/").pop() || "index.html").toLowerCase(); }
  function readJSON(key, fallback){ try { return JSON.parse(localStorage.getItem(key) || ""); } catch(e){ return fallback; } }
  function writeJSON(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){} }
  function readCollapsed(){ try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch(e){ return false; } }
  function saveCollapsed(v){ try { localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0"); } catch(e){} }

  function cleanOverlays(){
    const overlays = Array.from(document.querySelectorAll(".app-sidebar-overlay"));
    overlays.forEach((ov, index) => {
      if (index > 0) { ov.remove(); return; }
      const opened = document.body.classList.contains("sidebar-open") || getSidebar()?.classList.contains("app-open");
      if (!opened) ov.classList.remove("show");
      ov.style.pointerEvents = opened ? "auto" : "none";
    });
  }

  function setGroup(group, open, persist){
    if (!group) return;
    group.classList.toggle("is-open", !!open);
    const btn = group.querySelector(".sidebar-group-toggle");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (persist) saveGroups();
  }

  function saveGroups(){
    const sidebar = getSidebar();
    if (!sidebar) return;
    const state = {};
    sidebar.querySelectorAll(".sidebar-group[data-sidebar-group]").forEach(group => {
      state[group.dataset.sidebarGroup] = group.classList.contains("is-open");
    });
    writeJSON(GROUP_KEY, state);
  }

  function restoreGroups(){
    const sidebar = getSidebar();
    if (!sidebar) return;
    const state = readJSON(GROUP_KEY, null);
    const current = currentPage();
    sidebar.querySelectorAll(".sidebar-group[data-sidebar-group]").forEach(group => {
      const hasCurrent = !!group.querySelector(`a[href$="${current}"]`);
      const shouldOpen = state && Object.prototype.hasOwnProperty.call(state, group.dataset.sidebarGroup)
        ? !!state[group.dataset.sidebarGroup]
        : hasCurrent;
      setGroup(group, shouldOpen, false);
    });
  }

  function applyCollapsed(collapsed, persist){
    const active = !!collapsed && isDesktop();
    document.documentElement.classList.toggle("sidebar-collapsed", active);
    document.body.classList.toggle("sidebar-collapsed", active);
    document.querySelectorAll(".sidebar-collapse-toggle").forEach(btn => {
      btn.textContent = active ? "›" : "‹";
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.setAttribute("aria-label", active ? "Expandir sidebar" : "Colapsar sidebar");
    });
    if (persist) saveCollapsed(active);
  }

  function ensureSidebarReady(){
    const sidebar = getSidebar();
    if (!sidebar) return;
    sidebar.classList.add("sidebar-pro-groups", "sidebar-collapsible-pro", "sidebar-ready-final");
    sidebar.style.pointerEvents = "auto";
    sidebar.querySelectorAll("a[href]").forEach(link => {
      link.style.pointerEvents = "auto";
      const text = (link.querySelector(".sidebar-link-text")?.textContent || link.textContent || "").replace(/\s+/g, " ").trim();
      if (text) link.title = text;
      const href = (link.getAttribute("href") || "").split("?")[0].split("#")[0].split("/").pop().toLowerCase();
      link.classList.toggle("active", href === currentPage());
      if (href === currentPage()) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (!sidebar.querySelector(".sidebar-collapse-toggle")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sidebar-collapse-toggle";
      btn.title = "Colapsar/expandir sidebar";
      btn.setAttribute("aria-label", "Colapsar sidebar");
      btn.textContent = "‹";
      const brand = sidebar.querySelector(".premium-brand, .brand, .sidebar-brand-card, .brand-block") || sidebar.firstElementChild;
      if (brand) brand.appendChild(btn); else sidebar.prepend(btn);
    }
    restoreGroups();
    applyCollapsed(readCollapsed(), false);
    cleanOverlays();
  }

  document.addEventListener("click", function(event){
    const collapse = event.target.closest?.(".sidebar-collapse-toggle");
    if (collapse) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      applyCollapsed(!document.body.classList.contains("sidebar-collapsed"), true);
      return;
    }

    const toggle = event.target.closest?.(".sidebar-group-toggle");
    if (toggle && toggle.closest(".sidebar")) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const group = toggle.closest(".sidebar-group");
      setGroup(group, !group.classList.contains("is-open"), true);
      cleanOverlays();
      return;
    }

    const link = event.target.closest?.(".sidebar a[href]");
    if (link) {
      saveGroups();
      cleanOverlays();
      // Deixar a navegacao normal acontecer. Este handler existe em capture para impedir scripts antigos de anularem o clique.
    }
  }, true);

  function boot(){
    ensureSidebarReady();
    setTimeout(ensureSidebarReady, 80);
    setTimeout(ensureSidebarReady, 350);
    setTimeout(ensureSidebarReady, 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.addEventListener("pageshow", boot);
  window.addEventListener("resize", () => setTimeout(() => applyCollapsed(readCollapsed(), false), 80), { passive:true });

  try {
    const observer = new MutationObserver(() => {
      if (observer._timer) clearTimeout(observer._timer);
      observer._timer = setTimeout(ensureSidebarReady, 40);
    });
    observer.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:["class", "style"] });
  } catch(e) {}
})();
/* ===== END APP BRAGA v1.56.1 - SIDEBAR OPERACIONAL FINAL ===== */
