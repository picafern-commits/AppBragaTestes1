(function(){
  "use strict";
  const VERSION = "1.58.30";
  const STORAGE_KEY = "appBraga.quickLock.enabled";
  const PIN_KEY = "appBraga.quickLock.pin";
  const LOGIN_PAGES = new Set(["index.html", "login.html", ""]);
  let enabled = false;
  let unsubscribe = null;

  function pageName(){ return String(location.pathname || "").split("/").pop().toLowerCase(); }
  function isLoginPage(){ return LOGIN_PAGES.has(pageName()); }
  function hasDb(){ return !!(window.db && typeof window.db.collection === "function"); }
  function showMessage(msg, type){
    if (typeof window.mostrarMensagem === "function") return window.mostrarMensagem(msg, type);
    console.log(`[quick-lock ${type || "info"}]`, msg);
  }
  function setLocal(value){ try { localStorage.setItem(STORAGE_KEY, value ? "1" : "0"); } catch(e) {} }
  function getLocal(){ try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch(e) { return false; } }
  async function hashText(text){
    const raw = String(text || "");
    if (window.crypto && crypto.subtle) {
      const bytes = new TextEncoder().encode(raw);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = Math.imul(31, h) + raw.charCodeAt(i) | 0;
    return `fallback-${Math.abs(h)}`;
  }
  function getSavedPinHash(){ try { return localStorage.getItem(PIN_KEY) || ""; } catch(e) { return ""; } }
  async function savePin(pin){ try { localStorage.setItem(PIN_KEY, await hashText(pin)); } catch(e) {} }
  function updateConfigUi(){
    const btn = document.getElementById("appQuickLockToggle");
    const status = document.getElementById("appQuickLockStatus");
    if (btn) { btn.textContent = enabled ? "Desativar" : "Ativar"; btn.classList.toggle("danger", enabled); }
    if (status) status.textContent = enabled ? "Ativo" : "Desligado";
  }
  function renderFloatingButton(){
    if (!document.body || isLoginPage()) return;
    let btn = document.getElementById("appQuickLockButton");
    if (!enabled) { if (btn) btn.remove(); return; }
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "appQuickLockButton";
      btn.className = "app-quick-lock-button";
      btn.type = "button";
      btn.title = "Bloqueio rápido da app";
      btn.setAttribute("aria-label", "Bloqueio rápido da app");
      btn.textContent = "🔒";
      btn.addEventListener("click", lockNow);
      document.body.appendChild(btn);
    }
  }
  function applyEnabled(value){ enabled = !!value; setLocal(enabled); updateConfigUi(); renderFloatingButton(); }
  async function toggleQuickLock(){
    const next = !enabled;
    if (next && !getSavedPinHash()) {
      const pin = prompt("Define um PIN simples para desbloquear o bloqueio rápido:");
      if (!pin || String(pin).trim().length < 3) return showMessage("PIN inválido. Usa pelo menos 3 números.", "erro");
      await savePin(String(pin).trim());
    }
    applyEnabled(next);
    if (!hasDb()) return showMessage("Firebase indisponível. A preferência ficou guardada neste dispositivo.", "erro");
    try {
      await window.db.collection("config").doc("layout").set({ quickLockEnabled: next, quickLockVersion: VERSION, updatedAt: Date.now() }, { merge: true });
      showMessage(next ? "Bloqueio rápido ativado." : "Bloqueio rápido desativado.");
    } catch(err) {
      console.error("Erro ao guardar bloqueio rápido:", err);
      showMessage("Não consegui guardar na Firebase. A app continua ligada e a preferência ficou local.", "erro");
    }
  }
  function lockNow(){
    if (!enabled || document.getElementById("appQuickLockOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "appQuickLockOverlay";
    overlay.className = "app-quick-lock-overlay";
    const hasPin = !!getSavedPinHash();
    overlay.innerHTML = `
      <div class="app-quick-lock-card">
        <div style="font-size:42px">🔒</div>
        <h2>App bloqueada</h2>
        <p>A sessão continua ativa. Nada foi apagado.</p>
        ${hasPin ? `<input id="quickLockPinInput" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN">` : ``}
        <button class="primary-btn" type="button" id="quickLockUnlockBtn">Desbloquear</button>
        <div class="quick-lock-error" id="quickLockError"></div>
      </div>`;
    document.body.appendChild(overlay);
    const input = document.getElementById("quickLockPinInput");
    const unlock = document.getElementById("quickLockUnlockBtn");
    const run = async () => {
      const saved = getSavedPinHash();
      if (!saved) return unlockNow();
      const value = input ? input.value.trim() : "";
      if ((await hashText(value)) === saved) return unlockNow();
      const err = document.getElementById("quickLockError");
      if (err) err.textContent = "PIN incorreto.";
    };
    if (unlock) unlock.addEventListener("click", run);
    if (input) { input.focus(); input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") run(); }); }
  }
  function unlockNow(){ const overlay = document.getElementById("appQuickLockOverlay"); if (overlay) overlay.remove(); }
  function bindFirebase(){
    if (!hasDb() || unsubscribe) return;
    try {
      unsubscribe = window.db.collection("config").doc("layout").onSnapshot((doc) => {
        if (doc && doc.exists) {
          const data = doc.data() || {};
          if (Object.prototype.hasOwnProperty.call(data, "quickLockEnabled")) applyEnabled(!!data.quickLockEnabled);
        }
      }, (err) => console.warn("Quick lock Firebase listener:", err));
    } catch(err) { console.warn("Quick lock Firebase bind:", err); }
  }
  function init(){
    applyEnabled(getLocal());
    bindFirebase();
    let tries = 0;
    const timer = setInterval(() => { bindFirebase(); if (unsubscribe || ++tries > 20) clearInterval(timer); }, 500);
  }
  window.alternarBloqueioRapidoApp = toggleQuickLock;
  window.bloquearAppRapido = lockNow;
  window.desbloquearBloqueioRapidoApp = unlockNow;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
