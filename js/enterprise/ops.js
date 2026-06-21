(function () {
  "use strict";

  const COLLECTIONS = [
    { name: "impressoras", label: "Impressora", page: "impressoras.html", fields: ["modelo", "serie", "serial", "ip", "armazem", "localizacao"] },
    { name: "printers", label: "Impressora", page: "impressoras.html", fields: ["modelo", "model", "serie", "serial", "ip", "location", "localizacao"] },
    { name: "stock", label: "Stock", page: "stock.html", fields: ["equipamento", "cor", "lote", "localizacao", "armazem"] },
    { name: "computadores", label: "Computador", page: "computadores.html", fields: ["nome", "hostname", "serie", "ip", "user", "localizacao"] },
    { name: "pcs", label: "Computador", page: "computadores.html", fields: ["nome", "hostname", "serie", "ip", "user", "localizacao"] },
    { name: "users", label: "User", page: "users.html", fields: ["nome", "name", "email", "numero", "departamento", "funcao"] },
    { name: "pistolas", label: "Pistola CK65", page: "pistolas.html", fields: ["nome", "num", "serial", "sn", "mac", "operador", "armazem"] },
    { name: "portas", label: "Porta Rede", page: "portas.html", fields: ["nome", "porta", "ip", "switch", "localizacao", "armazem"] },
    { name: "radios", label: "Radio", page: "radios.html", fields: ["nome", "mac", "serial", "rf", "user", "estado"] },
    { name: "radioWeeklyRecords", label: "Registo semanal", page: "radios.html", fields: ["weekLabel", "weekStart", "weekEnd", "createdBy"] },
    { name: "manutencoes", label: "Manutencao", page: "manutencao-impressoras.html", fields: ["modelo", "serie", "ip", "estado", "motivo", "user"] },
    { name: "informacoes", label: "Informacao", page: "informacoes.html", fields: ["titulo", "obs", "texto"] },
    { name: "etiquetasWord", label: "Etiqueta Word", page: "etiquetas-word.html", fields: ["titulo", "data", "user", "descricao"] },
    { name: "auditLogs", label: "Auditoria", page: "historico.html", fields: ["action", "path", "collection", "event", "title"] }
  ];

  const ICONS = {
    "index.html": "\u2302",
    "add-toner.html": "➕",
    "stock.html": "📦",
    "historico.html": "\u2197",
    "etiquetas-word.html": "\u25A4",
    "impressoras.html": "\u25A6",
    "manutencao-impressoras.html": "\u25C7",
    "computadores.html": "\u25AD",
    "users.html": "\u25CE",
    "pistolas.html": "\u2301",
    "portas.html": "\u25A7",
    "radios.html": "\u25CC",
    "informacoes.html": "\u24D8",
    "tarefas.html": "\u25A8",
    "diagnostico.html": "\u26A1",
    "config.html": "\u2699"
  };

  const state = {
    searchIndex: [],
    collectionCache: {},
    lowToner: [],
    firstSnapshot: {},
    auditReady: false
  };

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function isHtmlPage() {
    return /\/html\//i.test(location.pathname) || location.pathname.endsWith(".html");
  }

  function pagePrefix() {
    return /\/html\//i.test(location.pathname) ? "" : "html/";
  }

  function cleanText(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function asPercent(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
  }

  function getTonerPercent(data) {
    if (!data || typeof data !== "object") return null;
    const direct = [
      data.percent,
      data.tonerPercent,
      data.toner_percent,
      data.black,
      data.preto,
      data.k,
      data.K
    ];
    for (const value of direct) {
      const percent = asPercent(value);
      if (percent !== null) return percent;
    }
    if (data.toner && typeof data.toner === "object") {
      const candidates = [data.toner.black, data.toner.preto, data.toner.k, data.toner.K, data.toner.percent];
      for (const value of candidates) {
        const percent = asPercent(value);
        if (percent !== null) return percent;
      }
    }
    if (Array.isArray(data.supplies)) {
      const black = data.supplies.find((item) => cleanText(item.color || item.name).includes("preto") || cleanText(item.color || item.name).includes("black"));
      const percent = asPercent(black?.percent ?? black?.level);
      if (percent !== null) return percent;
    }
    return null;
  }

  function tonerColor(percent) {
    if (percent <= 0) return "#dc2626";
    if (percent < 10) return "#ef4444";
    if (percent < 25) return "#f59e0b";
    if (percent < 55) return "#eab308";
    return "#22c55e";
  }

  function toast(title, body) {
    let stack = document.querySelector(".app-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "app-toast-stack";
      document.body.appendChild(stack);
    }
    const node = document.createElement("div");
    node.className = "app-toast";
    node.innerHTML = `<strong>${escapeHtml(title)}</strong><div>${escapeHtml(body || "")}</div>`;
    stack.appendChild(node);
    setTimeout(() => node.remove(), 5200);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function setupDeviceClasses() {
    const width = Math.min(window.innerWidth || 0, screen.width || window.innerWidth || 0);
    const ua = navigator.userAgent || "";
    const isPhone = width <= 768;
    const isTablet = !isPhone && width <= 1180;
    document.body.classList.toggle("enterprise-device-phone", isPhone);
    document.body.classList.toggle("enterprise-device-tablet", isTablet);
    document.body.classList.toggle("enterprise-device-desktop", !isPhone && !isTablet);
    document.body.classList.toggle("enterprise-ios", /iPhone|iPad|iPod/i.test(ua));
    document.body.classList.toggle("enterprise-android", /Android/i.test(ua));
  }

  function setupSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    sidebar.querySelectorAll("a").forEach((link) => {
      const href = (link.getAttribute("href") || "").split("/").pop();
      link.dataset.icon = ICONS[href] || "\u2022";
      const text = (link.textContent || "").trim();
      if (!link.querySelector(".sidebar-link-text")) {
        link.innerHTML = `<span class="sidebar-link-text">${escapeHtml(text)}</span>`;
      }
    });

    if (!document.querySelector(".app-menu-toggle")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "app-menu-toggle";
      button.setAttribute("aria-label", "Abrir menu");
      button.textContent = "\u2630";
      document.body.appendChild(button);
    }
    if (!document.querySelector(".app-sidebar-overlay")) {
      const overlay = document.createElement("div");
      overlay.className = "app-sidebar-overlay";
      document.body.appendChild(overlay);
    }

    const button = document.querySelector(".app-menu-toggle");
    const overlay = document.querySelector(".app-sidebar-overlay");
    const close = () => {
      sidebar.classList.remove("app-open", "open", "active");
      document.body.classList.remove("sidebar-open");
      overlay?.classList.remove("show");
      if (button) button.textContent = "\u2630";
    };
    const open = () => {
      sidebar.classList.add("app-open", "open", "active");
      document.body.classList.add("sidebar-open");
      overlay?.classList.add("show");
      if (button) button.textContent = "\u00d7";
    };

    if (button && !button.dataset.enterpriseBound) {
      button.dataset.enterpriseBound = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        sidebar.classList.contains("app-open") ? close() : open();
      });
    }
    if (overlay && !overlay.dataset.enterpriseBound) {
      overlay.dataset.enterpriseBound = "1";
      overlay.addEventListener("click", close);
    }
    sidebar.querySelectorAll("a").forEach((link) => {
      if (link.dataset.enterpriseCloseBound) return;
      link.dataset.enterpriseCloseBound = "1";
      link.addEventListener("click", close);
    });

    if (!document.body.dataset.enterpriseSidebarSwipe) {
      document.body.dataset.enterpriseSidebarSwipe = "1";
      let startX = 0;
      let startY = 0;
      let tracking = false;
      document.addEventListener("touchstart", (event) => {
        const touch = event.touches?.[0];
        if (!touch) return;
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = startX <= 28 || sidebar.classList.contains("app-open");
      }, { passive: true });
      document.addEventListener("touchend", (event) => {
        if (!tracking) return;
        const touch = event.changedTouches?.[0];
        tracking = false;
        if (!touch) return;
        const dx = touch.clientX - startX;
        const dy = Math.abs(touch.clientY - startY);
        if (dy > 80 || Math.abs(dx) < 68 || Math.abs(dx) < dy * 1.25) return;
        if (dx > 0 && startX <= 34) open();
        if (dx < 0 && sidebar.classList.contains("app-open")) close();
      }, { passive: true });
    }
  }

  function setupSearchShell() {
    document.querySelectorAll(".enterprise-search-shell").forEach((node) => node.remove());
    document.body.classList.remove("enterprise-search-ready");
  }

  function setupElectronSidebarActions() {
    const sidebar = document.querySelector(".sidebar");
    if (!window.electronAPI?.closeApp) return;
    document.querySelectorAll(".enterprise-window-actions").forEach((node) => node.remove());
    sidebar?.querySelectorAll(".enterprise-sidebar-window-actions, [data-enterprise-displays], [data-enterprise-display-select], [data-enterprise-move-display], [data-enterprise-display-status]").forEach((node) => node.remove());
    if (!sidebar) return;
    const actions = document.createElement("div");
    actions.className = "enterprise-sidebar-window-actions";
    actions.innerHTML = `
      <button class="enterprise-window-btn" type="button" data-enterprise-hide title="Segundo plano" aria-label="Segundo plano">⏸</button>
      <button class="enterprise-window-btn enterprise-window-close" type="button" data-enterprise-close title="Fechar App" aria-label="Fechar App">⏻</button>
    `;
    sidebar.appendChild(actions);
    bindElectronWindowButtons(actions);
  }

  function bindElectronWindowButtons(actions) {
    if (actions.dataset.enterpriseBound) return;
    actions.dataset.enterpriseBound = "1";
    actions.querySelector("[data-enterprise-hide]")?.addEventListener("click", async () => {
      await window.electronAPI.hideApp();
    });
    actions.querySelector("[data-enterprise-close]")?.addEventListener("click", async () => {
      const ok = window.confirm("Queres fechar completamente a App Braga?");
      if (!ok) return;
      await window.electronAPI.closeApp();
    });
  }

  function setupDensityControls() {
    const themeCard = document.querySelector(".theme-pro-card");
    if (!themeCard || document.getElementById("appResolution")) return;
    const row = document.createElement("div");
    row.className = "theme-pro-grid";
    row.innerHTML = `
      <label class="theme-pro-field">
        <span>Densidade visual</span>
        <select id="appResolution" onchange="guardarResolucaoApp(this.value)">
          <option value="compact">Compacto PC</option>
          <option value="comfortable">Confortavel</option>
          <option value="wide">Grande Tablet/iPhone</option>
        </select>
      </label>
    `;
    const actions = themeCard.querySelector(".theme-pro-actions");
    themeCard.insertBefore(row, actions || null);
  }

  function shouldSpellcheck(node) {
    if (!node || node.disabled || node.readOnly) return false;
    if (node.matches?.("textarea,[contenteditable='true']")) return true;
    if (!node.matches?.("input")) return false;
    const type = String(node.getAttribute("type") || "text").toLowerCase();
    return ["", "text", "search", "email"].includes(type);
  }

  function applySpellcheck(root = document) {
    document.documentElement.lang = document.documentElement.lang || "pt-PT";
    root.querySelectorAll?.("input, textarea, [contenteditable='true']").forEach((node) => {
      if (!shouldSpellcheck(node)) return;
      node.setAttribute("spellcheck", "true");
      node.setAttribute("autocorrect", "on");
      node.setAttribute("autocomplete", node.getAttribute("autocomplete") || "on");
      node.setAttribute("lang", node.getAttribute("lang") || "pt-PT");
    });
  }

  function setupSpellcheck() {
    applySpellcheck(document);
    if (window.__appBragaSpellcheckObserver) return;
    window.__appBragaSpellcheckObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (shouldSpellcheck(node)) applySpellcheck({ querySelectorAll: () => [node] });
          applySpellcheck(node);
        });
      });
    });
    window.__appBragaSpellcheckObserver.observe(document.body, { childList: true, subtree: true });
  }

  function setElectronDisplayStatus(status, details) {
    const statusNode = document.getElementById("electronDisplayStatus");
    const detailsNode = document.getElementById("electronDisplayDetails");
    if (statusNode) statusNode.textContent = status || "";
    if (detailsNode) detailsNode.textContent = details || "";
  }

  async function carregarMonitoresElectronApp() {
    const select = document.getElementById("electronDisplaySelect");
    if (!select) return;
    if (!window.electronAPI?.listDisplays) {
      select.innerHTML = `<option value="">Electron indisponivel</option>`;
      setElectronDisplayStatus("Indisponivel", "Abre esta pagina dentro da app Electron instalada. No browser/GitHub Pages nao ha acesso aos monitores do PC.");
      return;
    }
    select.innerHTML = `<option value="">A detectar...</option>`;
    setElectronDisplayStatus("A detectar", "A pedir lista de monitores ao processo principal do Electron.");
    try {
      const result = await window.electronAPI.listDisplays();
      const displays = Array.isArray(result?.displays) ? result.displays : [];
      select.innerHTML = displays.length ? displays.map((display) => `
        <option value="${escapeHtml(display.id)}">${escapeHtml(display.label)}${display.primary ? " - Principal" : ""}${display.current ? " - Atual" : ""} - ${display.bounds.width}x${display.bounds.height}</option>
      `).join("") : `<option value="">Sem monitores detectados</option>`;
      if (result?.currentDisplayId) select.value = String(result.currentDisplayId);
      setElectronDisplayStatus(
        displays.length ? `${displays.length} monitor(es) detectado(s)` : "Sem monitores",
        displays.length ? "Escolhe o monitor e carrega em mover." : "O Windows/Electron devolveu zero monitores."
      );
    } catch (error) {
      select.innerHTML = `<option value="">Erro ao detectar</option>`;
      setElectronDisplayStatus("Erro", error?.message || "Falha ao comunicar com o Electron.");
    }
  }

  async function moverAppParaMonitorElectron() {
    const select = document.getElementById("electronDisplaySelect");
    const displayId = select?.value || "";
    if (!window.electronAPI?.moveToDisplay) {
      setElectronDisplayStatus("Indisponivel", "Esta funcao so trabalha na app Electron instalada.");
      return;
    }
    if (!displayId) {
      setElectronDisplayStatus("Escolhe um monitor", "Deteta os monitores e escolhe um monitor valido.");
      return;
    }
    setElectronDisplayStatus("A mover", "A janela vai sair temporariamente de fullscreen para mudar de ecra.");
    try {
      const result = await window.electronAPI.moveToDisplay(displayId);
      if (!result?.ok) {
        setElectronDisplayStatus("Falhou", result?.error || "O Electron nao conseguiu mover a janela.");
        return;
      }
      setElectronDisplayStatus("Movido", "Monitor guardado. A app vai tentar abrir neste monitor no proximo arranque.");
      setTimeout(carregarMonitoresElectronApp, 900);
    } catch (error) {
      setElectronDisplayStatus("Erro", error?.message || "Falha ao mover a janela.");
    }
  }

  function setupElectronDisplayConfig() {
    if (!document.getElementById("electronDisplaySelect")) return;
    window.carregarMonitoresElectronApp = carregarMonitoresElectronApp;
    window.moverAppParaMonitorElectron = moverAppParaMonitorElectron;
    carregarMonitoresElectronApp();
  }

  function polishModalsAndEmptyStates() {
    document.querySelectorAll(".modal-content, .app-modal-content").forEach((modal) => {
      if (modal.dataset.enterprisePolished) return;
      modal.dataset.enterprisePolished = "1";
      const buttons = modal.querySelectorAll("button");
      if (buttons.length && !modal.querySelector(".enterprise-modal-actions")) {
        const actions = document.createElement("div");
        actions.className = "enterprise-modal-actions";
        buttons.forEach((button) => actions.appendChild(button));
        modal.appendChild(actions);
      }
    });
    document.querySelectorAll(".reference-empty, .empty-state").forEach((node) => {
      node.setAttribute("role", "status");
    });
  }

  function itemTitle(collection, data) {
    const fields = collection.fields || [];
    for (const field of fields) {
      if (data[field]) return String(data[field]);
    }
    return data.nome || data.name || data.titulo || data.ip || data.serial || "Registo";
  }

  function itemSubtitle(data) {
    return [data.ip, data.serie || data.serial || data.sn, data.localizacao || data.location, data.armazem, data.estado]
      .filter(Boolean)
      .join(" - ");
  }

  function setupRealtimeSearchAndNotifications() {
    if (!window.db?.collection || window.__enterpriseSearchBound) return;
    window.__enterpriseSearchBound = true;

    COLLECTIONS.forEach((collection) => {
      try {
        window.db.collection(collection.name).onSnapshot((snapshot) => {
          const previous = state.collectionCache[collection.name] || {};
          const next = {};
          snapshot.docs.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() };
            next[doc.id] = data;
          });
          state.collectionCache[collection.name] = next;
          rebuildSearchIndex();
          if (collection.name === "printers" || collection.name === "impressoras") {
            updateLowTonerFromPrinters();
          }
          updateDashboardOps();
          updateSystemHealthExtra();
        }, () => {});
      } catch (error) {}
    });
  }

  function rebuildSearchIndex() {
    state.searchIndex = [];
    COLLECTIONS.forEach((collection) => {
      const items = Object.values(state.collectionCache[collection.name] || {});
      items.forEach((data) => {
        const title = itemTitle(collection, data);
        const subtitle = itemSubtitle(data);
        state.searchIndex.push({
          title,
          subtitle,
          label: collection.label,
          page: collection.page,
          haystack: cleanText([collection.label, title, subtitle, ...collection.fields.map((field) => data[field])].join(" \u00b7 "))
        });
      });
    });
  }

  function renderSearchResults(query, target) {
    const q = cleanText(query);
    if (!q) {
      target.classList.remove("is-open");
      target.innerHTML = "";
      return;
    }
    const prefix = pagePrefix();
    const hits = state.searchIndex.filter((item) => item.haystack.includes(q)).slice(0, 12);
    target.classList.add("is-open");
    target.innerHTML = hits.length ? hits.map((item) => `
      <div class="enterprise-search-result" data-page="${escapeHtml(prefix + item.page)}">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.label)}${item.subtitle ? " - " + escapeHtml(item.subtitle) : ""}</span>
      </div>
    `).join("") : `<div class="enterprise-search-result"><strong>Sem resultados</strong><span>Tenta outro termo.</span></div>`;
    target.querySelectorAll("[data-page]").forEach((node) => {
      node.addEventListener("click", () => { location.href = node.dataset.page; });
    });
  }

  function updateLowTonerFromPrinters() {
    const byIp = new Map();
    ["printers", "impressoras"].forEach((name) => {
      Object.values(state.collectionCache[name] || {}).forEach((item) => {
        const percent = getTonerPercent(item);
        if (percent === null || percent >= 25) return;
        const key = item.ip || item.id || item.serie || item.serial;
        if (!key) return;
        byIp.set(String(key), {
          id: item.id,
          ip: item.ip || item.id || "-",
          title: item.modelo || item.model || item.nome || item.name || "Impressora",
          subtitle: item.localizacao || item.location || item.serie || item.serial || "",
          percent
        });
      });
    });
    state.lowToner = Array.from(byIp.values()).sort((a, b) => a.percent - b.percent);
    renderLowTonerDashboard();
  }

  function ensureDashboardOps() {
    document.getElementById("dashboardOpsPanel")?.remove();
    return null;
  }

  function renderLowTonerDashboard() {
    const panel = ensureDashboardOps();
    if (!panel) return;
    const countNode = document.getElementById("dashboardOpsLowTonerCount");
    const list = document.getElementById("dashboardOpsLowTonerList");
    if (countNode) countNode.textContent = String(state.lowToner.length);
    if (!list) return;
    if (!state.lowToner.length) {
      list.innerHTML = `<div class="empty-state mini">Sem toner critico neste momento.</div>`;
      return;
    }
    list.innerHTML = state.lowToner.slice(0, 8).map((item) => {
      const color = tonerColor(item.percent);
      return `
        <div class="dashboard-low-toner-item">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.subtitle || item.ip || "")}</span>
            <small>${escapeHtml(item.ip || "")}</small>
          </div>
          <div>
            <div class="dashboard-low-toner-meter">
              <div class="dashboard-low-toner-fill" style="width:${item.percent}%;--toner-level-color:${color}"></div>
            </div>
            <strong style="color:${color}">${item.percent}%</strong>
          </div>
        </div>
      `;
    }).join("");
  }

  function updateDashboardOps() {
    const panel = ensureDashboardOps();
    if (!panel) return;
    const set = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = String(value);
    };
    const manutencoes = Object.values(state.collectionCache.manutencoes || {})
      .filter((item) => !/resolvido|fechado|concluido|concluído/i.test(String(item.estado || "")));
    const audit = Object.values(state.collectionCache.auditLogs || {});
    set("dashboardOpsPushCount", "0");
    set("dashboardOpsMaintenanceCount", manutencoes.length);
    set("dashboardOpsAuditCount", audit.length);
    const pushDetail = document.getElementById("dashboardOpsPushDetail");
    if (pushDetail) pushDetail.textContent = "Sistema removido";
    const sync = document.getElementById("dashboardOpsSync");
    if (sync) sync.textContent = `Sync ${new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
    renderLowTonerDashboard();
  }
  function updateSystemHealthExtra() {
    const grid = document.getElementById("systemHealthGrid");
    if (!grid || grid.dataset.enterpriseExpanded) return;
    grid.dataset.enterpriseExpanded = "1";
    const cards = [
      ["Service Worker", "healthServiceWorker"],
      ["Tema", "healthTheme"],
      ["Ultima sync", "healthLastSync"]
    ];
    cards.forEach(([label, id]) => {
      const card = document.createElement("div");
      card.className = "health-card";
      card.innerHTML = `<span>${label}</span><strong id="${id}">A verificar</strong>`;
      grid.appendChild(card);
    });
    refreshSystemHealthExtra();
  }

  async function refreshSystemHealthExtra() {
    const set = (id, text, cls) => {
      const node = document.getElementById(id);
      if (!node) return;
      node.textContent = text;
      node.className = cls || "";
    };
    const sw = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
    set("healthServiceWorker", sw ? "Ativo" : "Sem registo", sw ? "ok" : "warn");
    set("healthTheme", window.AppThemePro ? "Ativo" : "Indisponivel", window.AppThemePro ? "ok" : "warn");
    set("healthLastSync", new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }), "ok");
  }

  function setupAuditPatch() {
    if (!window.db || state.auditReady) return;
    const probeCollection = window.db.collection("_appBragaAuditProbe");
    const probeDocument = probeCollection.doc("_probe");
    const docProto = Object.getPrototypeOf(probeDocument);
    const colProto = Object.getPrototypeOf(probeCollection);
    if (!docProto || !colProto || docProto.__appBragaAuditPatched) return;
    state.auditReady = true;
    docProto.__appBragaAuditPatched = true;

    const originalSet = docProto.set;
    const originalUpdate = docProto.update;
    const originalDelete = docProto.delete;
    const originalAdd = colProto.add;

    function shouldAudit(ref) {
      const path = ref?.path || "";
      return path && !path.startsWith("auditLogs");
    }

    function log(action, ref, payload) {
      try {
        if (!shouldAudit(ref) || !window.db?.collection) return;
        window.db.collection("auditLogs").add({
          action,
          path: ref.path,
          payload: payload ? JSON.parse(JSON.stringify(payload).slice(0, 2000)) : null,
          page: location.pathname,
          userAgent: navigator.userAgent,
          createdAt: Date.now()
        }).catch(() => {});
      } catch (error) {}
    }

    docProto.set = function patchedSet(data, options) {
      return originalSet.apply(this, arguments).then((result) => {
        log("set", this, data);
        return result;
      });
    };
    docProto.update = function patchedUpdate(data) {
      return originalUpdate.apply(this, arguments).then((result) => {
        log("update", this, data);
        return result;
      });
    };
    docProto.delete = function patchedDelete() {
      return originalDelete.apply(this, arguments).then((result) => {
        log("delete", this, null);
        return result;
      });
    };
    colProto.add = function patchedAdd(data) {
      return originalAdd.apply(this, arguments).then((result) => {
        log("add", result, data);
        return result;
      });
    };
  }

  function init() {
    setupDeviceClasses();
    setupSidebar();
    setupElectronSidebarActions();
    setupSearchShell();
    setupDensityControls();
    setupSpellcheck();
    setupElectronDisplayConfig();
    polishModalsAndEmptyStates();
    ensureDashboardOps();
    updateSystemHealthExtra();
    setTimeout(() => {
      setupAuditPatch();
      refreshSystemHealthExtra();
    }, 900);
  }

  ready(init);
  window.addEventListener("resize", () => {
    setupDeviceClasses();
    setupSidebar();
    setupElectronSidebarActions();
    setupElectronDisplayConfig();
  }, { passive: true });
  window.AppBragaEnterpriseOps = {
    refresh: init,
    updateLowTonerFromPrinters
  };
})();
