(function () {
  "use strict";

  const COLLECTIONS = [
    "stock",
    "historico",
    "pcs",
    "computadores",
    "printers",
    "impressoras",
    "manutencoes",
    "users",
    "pistolas",
    "portas",
    "radios",
    "radioWeeklyRecords",
    "radioHistory",
    "informacoes",
    "etiquetasWord",
    "config"
  ];

  const SCHEDULE_HOUR = 18;
  const SCHEDULE_MINUTE = 30;
  let running = false;
  let lastStatus = null;
  let panelReady = false;
  let panelTimer = null;
  let scheduleTimer = null;

  function isElectronBackupAvailable() {
    return !!window.electronAPI?.writeLocalBackup;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function isBusinessDay(date) {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }

  function nextBackupDate(from = new Date()) {
    const candidate = new Date(from);
    candidate.setHours(SCHEDULE_HOUR, SCHEDULE_MINUTE, 0, 0);
    if (from >= candidate || !isBusinessDay(candidate)) {
      do {
        candidate.setDate(candidate.getDate() + 1);
        candidate.setHours(SCHEDULE_HOUR, SCHEDULE_MINUTE, 0, 0);
      } while (!isBusinessDay(candidate));
    }
    return candidate;
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("pt-PT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatCountdown(target) {
    const diff = Math.max(0, target.getTime() - Date.now());
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function normalizeFirestoreValue(value) {
    if (value === null || value === undefined) return value;
    if (typeof value !== "object") return value;
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    if (Array.isArray(value)) return value.map(normalizeFirestoreValue);
    const out = {};
    Object.keys(value).forEach((key) => {
      out[key] = normalizeFirestoreValue(value[key]);
    });
    return out;
  }

  async function collectBackupData() {
    if (!window.db?.collection) throw new Error("Firestore indisponivel.");
    const collections = {};
    let documentCount = 0;

    for (const name of COLLECTIONS) {
      const snap = await window.db.collection(name).get();
      collections[name] = snap.docs.map((doc) => ({
        id: doc.id,
        data: normalizeFirestoreValue(doc.data())
      }));
      documentCount += collections[name].length;
    }

    return {
      schemaVersion: 1,
      schedule: "Dias uteis as 18:30",
      collectionCount: COLLECTIONS.length,
      documentCount,
      collections
    };
  }

  async function refreshBackupStatus() {
    if (!isElectronBackupAvailable()) {
      lastStatus = { ok: false, status: { lastError: "Backup local disponivel apenas no Electron." } };
      renderBackupPanel();
      return lastStatus;
    }
    lastStatus = await window.electronAPI.getBackupStatus();
    renderBackupPanel();
    return lastStatus;
  }

  async function runBackup(manual = false) {
    if (running) return;
    if (!isElectronBackupAvailable()) return refreshBackupStatus();
    running = true;
    renderBackupPanel("A criar backup...");
    try {
      const payload = await collectBackupData();
      payload.manual = manual;
      const result = await window.electronAPI.writeLocalBackup(payload);
      lastStatus = { ok: result.ok, status: result.status, backupDir: lastStatus?.backupDir };
      renderBackupPanel(result.ok ? "Backup concluido." : "Erro no backup.");
      return result;
    } catch (error) {
      lastStatus = { ok: false, status: { ...(lastStatus?.status || {}), lastError: error.message } };
      renderBackupPanel("Erro no backup.");
      return { ok: false, error: error.message };
    } finally {
      running = false;
    }
  }

  async function maybeRunScheduledBackup() {
    if (!isElectronBackupAvailable() || running || !window.db?.collection) return;
    const now = new Date();
    if (!isBusinessDay(now)) return;
    if (now.getHours() !== SCHEDULE_HOUR || now.getMinutes() < SCHEDULE_MINUTE) return;
    const status = lastStatus?.status || (await refreshBackupStatus()).status || {};
    if (status.lastRunDate === dateKey(now)) return;
    await runBackup(false);
  }

  function ensureBackupPanel() {
    if (panelReady) return;
    const main = document.querySelector(".main, main");
    const backupSection = document.querySelector(".config-section-backups");
    if (!main || !backupSection) return;
    panelReady = true;
    const panel = document.createElement("div");
    panel.className = "panel config-section local-backup-panel";
    panel.innerHTML = `
      <div class="section-header">
        <div>
          <h3>Backup local automatico</h3>
          <p class="section-subtitle">Dias uteis as 18:30 no Electron. Guarda JSON local com os dados da Firestore.</p>
        </div>
        <button class="primary-btn" type="button" id="localBackupRunNow">Fazer backup agora</button>
      </div>
      <div class="system-health-grid local-backup-grid">
        <div class="health-card"><span>Estado</span><strong id="localBackupState">A verificar</strong></div>
        <div class="health-card"><span>Proximo backup</span><strong id="localBackupNext">-</strong></div>
        <div class="health-card"><span>Temporizador</span><strong id="localBackupTimer">-</strong></div>
        <div class="health-card"><span>Ultimo backup</span><strong id="localBackupLast">-</strong></div>
      </div>
      <div class="config-actions-row">
        <button class="secondary-btn" type="button" id="localBackupOpenFolder">Abrir pasta de backups</button>
        <button class="secondary-btn" type="button" id="localBackupRefresh">Atualizar estado</button>
      </div>
      <p class="section-subtitle" id="localBackupPath"></p>
    `;
    backupSection.insertAdjacentElement("beforebegin", panel);
    panel.querySelector("#localBackupRunNow")?.addEventListener("click", () => runBackup(true));
    panel.querySelector("#localBackupRefresh")?.addEventListener("click", () => refreshBackupStatus());
    panel.querySelector("#localBackupOpenFolder")?.addEventListener("click", async () => {
      if (window.electronAPI?.openBackupFolder) await window.electronAPI.openBackupFolder();
    });
  }

  function setText(id, text) {
    const node = document.getElementById(id);
    if (node) node.textContent = text;
  }

  function renderBackupPanel(transientState) {
    ensureBackupPanel();
    const panel = document.querySelector(".local-backup-panel");
    if (!panel) return;
    const next = nextBackupDate();
    const status = lastStatus?.status || {};
    const available = isElectronBackupAvailable();

    setText("localBackupState", transientState || (available ? (status.ok ? "Ativo" : "Sem backup recente") : "Apenas Electron"));
    setText("localBackupNext", formatDateTime(next));
    setText("localBackupTimer", formatCountdown(next));
    setText("localBackupLast", status.lastRunAt ? `${formatDateTime(status.lastRunAt)} · ${status.documentCount || 0} docs` : "-");
    setText("localBackupPath", available ? (lastStatus?.backupDir || "Pasta local da app") : "No iPhone, Android e GitHub Pages nao existe escrita automatica em disco local.");

    const stateNode = document.getElementById("localBackupState");
    if (stateNode) {
      stateNode.className = available && status.ok ? "ok" : "warn";
      if (status.lastError) stateNode.title = status.lastError;
    }
  }

  function start() {
    if (!isElectronBackupAvailable() && !document.querySelector(".config-section-backups")) return;
    ensureBackupPanel();
    refreshBackupStatus();
    if (document.querySelector(".local-backup-panel") && !panelTimer) {
      panelTimer = setInterval(() => renderBackupPanel(), 1000);
    }
    if (isElectronBackupAvailable() && !scheduleTimer) {
      scheduleTimer = setInterval(maybeRunScheduledBackup, 30000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.AppBragaLocalBackup = {
    runNow: () => runBackup(true),
    refresh: refreshBackupStatus,
    nextBackupDate
  };
})();
