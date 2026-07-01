(function () {
  "use strict";

  const COOKIE = "appBragaThemePro";
  const DESIGN_COOKIE = "appBragaVisualDesign";
  const DESIGN_STORAGE = "appBraga.visualDesign";
  const WORKSPACE_COOKIE = "appBragaWorkspaceMode";
  const WORKSPACE_STORAGE = "appBraga.workspaceMode";
  const LEGACY_COOKIE = "appAccentColor";
  const ONE_YEAR = 31536000;
  const DEFAULT_WORKSPACE = {
    mode: "simple",
    density: "comfortable",
    radius: "soft",
    mobileActions: "on"
  };
  const DEFAULT_THEME = {
    primary: "#ef4444",
    secondary: "#f97316",
    background: "#151515",
    background2: "#101114",
    surface: "#1c1c1e",
    surface2: "#242428",
    text: "#f8fafc",
    muted: "#a8b0bd",
    buttonTextMode: "auto"
  };

  const PRESETS = {
    autozitania: {
      name: "Autozitânia",
      primary: "#ef4444",
      secondary: "#f97316",
      background: "#151515",
      background2: "#101114",
      surface: "#1c1c1e",
      surface2: "#242428",
      text: "#f8fafc",
      muted: "#a8b0bd"
    },
    graphite: {
      name: "Grafite",
      primary: "#f59e0b",
      secondary: "#ef4444",
      background: "#151515",
      background2: "#0f0f10",
      surface: "#202124",
      surface2: "#292a2e",
      text: "#fafafa",
      muted: "#b8bec8"
    },
    ocean: {
      name: "Oceano",
      primary: "#06b6d4",
      secondary: "#2563eb",
      background: "#121416",
      background2: "#0e1114",
      surface: "#1b2127",
      surface2: "#222a32",
      text: "#f8fafc",
      muted: "#a7b3c1"
    },
    violet: {
      name: "Violeta",
      primary: "#a855f7",
      secondary: "#ec4899",
      background: "#151515",
      background2: "#111013",
      surface: "#211f25",
      surface2: "#2b2630",
      text: "#fbf7ff",
      muted: "#beb4c8"
    }
  };

  function hex(value, fallback) {
    const clean = String(value || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(clean) ? clean.toLowerCase() : fallback;
  }

  function rgb(hexColor) {
    const clean = hex(hexColor, DEFAULT_THEME.primary).slice(1);
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function brightness(hexColor) {
    const c = rgb(hexColor);
    return ((c.r * 299) + (c.g * 587) + (c.b * 114)) / 1000;
  }

  function cookieGet(name) {
    try {
      const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
      return match ? decodeURIComponent(match[1]) : "";
    } catch (error) {
      return "";
    }
  }

  function cookieSet(name, value, maxAge = ONE_YEAR) {
    try {
      document.cookie = name + "=" + encodeURIComponent(value) + "; Max-Age=" + maxAge + "; Path=/; SameSite=Lax";
    } catch (error) {}
  }

  function designAssetPath(fileName) {
    const inHtmlFolder = /\/html\//i.test(location.pathname || "");
    return (inHtmlFolder ? "../css/" : "css/") + fileName + "?v=1.38.0";
  }

  function getCachedVisualDesign() {
    try {
      const stored = localStorage.getItem(DESIGN_STORAGE);
      if (stored === "classic" || stored === "pro") return stored;
    } catch (error) {}
    const cookie = cookieGet(DESIGN_COOKIE);
    return cookie === "classic" || cookie === "pro" ? cookie : "pro";
  }

  function syncDesignControls(mode) {
    document.querySelectorAll("[data-design-mode]").forEach((button) => {
      const active = button.getAttribute("data-design-mode") === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const select = document.getElementById("appVisualDesignMode");
    if (select) select.value = mode;
  }

  const TEXT_FIXES = [
    ["Navegação", "Navegacao"],
    ["Operação", "Operacao"],
    ["Administração", "Administracao"],
    ["Manutenção", "Manutencao"],
    ["Configurações", "Configuracoes"],
    ["Informações", "Informacoes"],
    ["Diretório", "Diretorio"],
    ["Histórico", "Historico"],
    ["Diagnóstico", "Diagnostico"],
    ["Rádios", "Radios"],
    ["página", "pagina"],
    ["Toners disponíveis", "Toners disponiveis"],
    ["Manutenções", "Manutencoes"],
    ["clássico", "classico"],
    ["botoes", "botoes"],
    ["‹", "<"],
    ["›", ">"],
    ["⭐", "*"],
    ["⚡", "OP"],
    ["✅", "OK"],
    ["➕", "+"],
    ["⚙️", "CFG"],
    ["🏠", "DB"],
    ["📦", "ST"],
    ["🖨️", "IMP"],
    ["🧾", "HIS"],
    ["📄", "IA"],
    ["🏷️", "ETQ"],
    ["🧰", "EQP"],
    ["🛠️", "MAN"],
    ["💻", "PC"],
    ["📟", "CK"],
    ["📡", "RAD"],
    ["🌐", "INF"],
    ["🔌", "NET"],
    ["ℹ️", "INFO"],
    ["👥", "USR"],
    ["🩺", "DIA"]
  ];

  const SIDEBAR_CODES = [
    ["index.html", "🏠"],
    ["stock.html", "📦"],
    ["diretorio.html", "☎️"],
    ["impressoras.html", "🖨️"],
    ["add-toner.html", "➕"],
    ["historico.html", "🧾"],
    ["tarefas.html", "✓"],
    ["equipas-semanais.html", "👥"],
    ["scanner-ia.html", "▣"],
    ["etiquetas-word.html", "🏷️"],
    ["manutencao-impressoras.html", "🛠️"],
    ["computadores.html", "💻"],
    ["pistolas.html", "📟"],
    ["radios.html", "📡"],
    ["portas.html", "🔌"],
    ["informacoes.html", "ℹ️"],
    ["notificacoes.html", "◉"],
    ["users.html", "👥"],
    ["diagnostico.html", "🩺"],
    ["config.html", "⚙️"]
  ];

  const SIDEBAR_GROUP_CODES = {
    "opera-o": "⚡",
    "equipamentos": "🧰",
    "infraestrutura": "🌐",
    "administra-o": "⚙️"
  };

  function decodeMojibake(value) {
    let text = String(value || "");
    for (let i = 0; i < 3; i += 1) {
      try {
        const decoded = decodeURIComponent(escape(text));
        if (!decoded || decoded === text) break;
        text = decoded;
      } catch (error) {
        break;
      }
    }
    return text;
  }

  function fixTextValue(value) {
    const original = String(value || "");
    let text = decodeMojibake(original);
    TEXT_FIXES.forEach(([bad, good]) => {
      text = text.split(bad).join(good);
    });
    if (/[\u00c3\u00c2\u00e2\u00f0\ufffd]/.test(original)) {
      text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return text;
  }

  function sanitizeVisibleText() {
    if (!document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const tag = node.parentElement?.tagName;
        return /^(SCRIPT|STYLE|NOSCRIPT)$/i.test(tag || "") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fixed = fixTextValue(node.nodeValue);
      if (fixed !== node.nodeValue) node.nodeValue = fixed;
    });
    document.querySelectorAll("[placeholder],[title],[aria-label],option").forEach((node) => {
      ["placeholder", "title", "aria-label"].forEach((attr) => {
        if (!node.hasAttribute?.(attr)) return;
        const fixed = fixTextValue(node.getAttribute(attr));
        if (fixed !== node.getAttribute(attr)) node.setAttribute(attr, fixed);
      });
      if (node.tagName === "OPTION") node.textContent = fixTextValue(node.textContent);
    });
    document.querySelectorAll(".sidebar a[href]").forEach((link) => {
      const href = link.getAttribute("href") || "";
      const found = SIDEBAR_CODES.find(([page]) => href.endsWith(page));
      if (found) link.setAttribute("data-icon", found[1]);
    });
    document.querySelectorAll(".sidebar-group-icon").forEach((node) => {
      node.textContent = fixTextValue(node.textContent);
    });
    document.querySelectorAll(".sidebar-group[data-sidebar-group]").forEach((group) => {
      const code = SIDEBAR_GROUP_CODES[group.getAttribute("data-sidebar-group") || ""];
      const icon = group.querySelector(".sidebar-group-icon");
      if (code && icon) icon.textContent = code;
    });
    document.querySelectorAll(".sidebar-section-title > span").forEach((node) => {
      node.textContent = "⭐";
    });
  }

  function ensureSidebarPageLinks() {
    if (!document.body) return;
    const nav = document.querySelector(".sidebar-nav-pro, .sidebar nav");
    if (!nav) return;

    const ensureGroup = (key, icon, label) => {
      let group = nav.querySelector(`.sidebar-group[data-sidebar-group="${key}"]`);
      if (!group) {
        group = document.createElement("section");
        group.className = "sidebar-group";
        group.setAttribute("data-sidebar-group", key);
        group.innerHTML = `
          <button class="sidebar-group-toggle" type="button">
            <span class="sidebar-group-icon">${icon}</span>
            <span class="sidebar-group-title">${label}</span>
            <span class="sidebar-group-chevron">›</span>
          </button>
          <div class="sidebar-group-links"></div>
        `;
        nav.appendChild(group);
      }
      let links = group.querySelector(".sidebar-group-links");
      if (!links) {
        links = document.createElement("div");
        links.className = "sidebar-group-links";
        group.appendChild(links);
      }
      return links;
    };

    const addSidebarLink = (host, href, icon, text, beforeHref = "") => {
      if (!host || host.querySelector(`a[href="${href}"]`)) return;
      const link = document.createElement("a");
      link.href = href;
      link.setAttribute("data-icon", icon);
      link.innerHTML = `<span class="sidebar-link-text">${text}</span>`;
      const currentPage = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
      if (currentPage === href.toLowerCase()) {
        link.classList.add("active");
        host.closest(".sidebar-group")?.classList.add("is-open");
      }
      const before = beforeHref ? host.querySelector(`a[href="${beforeHref}"]`) : null;
      if (before) before.insertAdjacentElement("beforebegin", link);
      else host.appendChild(link);
    };
  }

  function applyLayoutData(data = {}) {
    const nextTheme = data.themePro || {
      primary: data.accentColor,
      secondary: data.accentColor2,
      buttonTextMode: data.buttonTextMode
    };

    // Guarda também em cache local o layout vindo da Firebase.
    // Assim, ao trocar de página, o Modo Clássico é aplicado logo no <head>
    // e não aparece aquele flash rápido do Modo Pro enquanto espera pela Firebase.
    apply({ ...getCachedTheme(), ...nextTheme }, { persist: true });
    applyVisualDesign(data.visualDesign || getCachedVisualDesign(), { persist: true });
    applyWorkspace(data.workspaceMode || getCachedWorkspace(), { persist: true });
    window.dispatchEvent(new CustomEvent("appbraga:layout", { detail: data }));
  }

  function isConfigPage() {
    const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    return page === "config.html";
  }

  function ensureClassicStylesheet(active) {
    const id = "appDesignClassicStylesheet";
    const existing = document.getElementById(id);
    if (!active) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = designAssetPath("app-design-classic.css");
    (document.head || document.documentElement).appendChild(link);
  }

  function currentPageTitle() {
    const hero = document.querySelector(".page-hero-title, .dashboard-header h1, main h1, .main h1");
    const active = document.querySelector(".sidebar a.active .sidebar-link-text, .sidebar a.active");
    return String(hero?.textContent || active?.textContent || document.title || "App Braga").trim();
  }

  function currentPageSubtitle() {
    const page = currentPageTitle().toLowerCase();
    if (page.includes("dashboard")) return "Visao operacional, tarefas e equipamentos importantes.";
    if (page.includes("tarefas")) return "Planeamento do trabalho em aberto, prioridades e prazos.";
    if (page.includes("equipas-semanais")) return "Rotacao semanal das equipas e membros de trabalho.";
    if (page.includes("toner")) return "Entrada rapida de movimentos e referencias.";
    if (page.includes("equipamento")) return "Ficha tecnica, relacoes e historico.";
    if (page.includes("config")) return "Preferencias, seguranca, aparencia e tema.";
    return "Centro operacional App Braga.";
  }

  function ensureProCommandBar(mode) {
    if (mode !== "pro" || !document.body) {
      document.querySelector(".app-pro-commandbar")?.remove();
      return;
    }
    const main = document.querySelector("main, .main, .main-content");
    if (!main) return;
    let bar = main.querySelector(":scope > .app-pro-commandbar");
    if (!bar) {
      bar = document.createElement("section");
      bar.className = "app-pro-commandbar";
      main.prepend(bar);
    }
    bar.innerHTML = `
      <div class="app-pro-command-title">
        <span class="app-pro-kicker">App Braga Pro</span>
        <strong>${currentPageTitle()}</strong>
        <small>${currentPageSubtitle()}</small>
      </div>
      <nav class="app-pro-command-actions" aria-label="Acoes rapidas">
        <a href="index.html">Dashboard</a>
        <a href="tarefas.html">Tarefas</a>
        <a href="equipas-semanais.html">Equipas</a>
        <a href="add-toner.html">Toner</a>
        <a href="notificacoes.html">Notificacoes</a>
        <a href="config.html">Design</a>
      </nav>
    `;
    sanitizeVisibleText();
  }

  function normalizeWorkspace(input = {}) {
    const rawMode = input.mode === "management" ? "simple" : input.mode;
    return {
      mode: ["simple", "tech"].includes(rawMode) ? rawMode : DEFAULT_WORKSPACE.mode,
      density: ["compact", "comfortable"].includes(input.density) ? input.density : DEFAULT_WORKSPACE.density,
      radius: ["sharp", "soft", "round"].includes(input.radius) ? input.radius : DEFAULT_WORKSPACE.radius,
      mobileActions: input.mobileActions === "off" ? "off" : "on"
    };
  }

  function parseWorkspace(value) {
    try {
      return normalizeWorkspace(value ? JSON.parse(value) : {});
    } catch (error) {
      return normalizeWorkspace({});
    }
  }

  function getCachedWorkspace() {
    try {
      const stored = localStorage.getItem(WORKSPACE_STORAGE);
      if (stored) return parseWorkspace(stored);
    } catch (error) {}
    return parseWorkspace(cookieGet(WORKSPACE_COOKIE));
  }

  function syncWorkspaceControls(workspaceInput) {
    const workspace = normalizeWorkspace(workspaceInput || getCachedWorkspace());
    document.querySelectorAll("[data-work-mode]").forEach((button) => {
      const active = button.getAttribute("data-work-mode") === workspace.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const map = {
      appWorkMode: workspace.mode,
      appDensityMode: workspace.density,
      appRadiusMode: workspace.radius,
      appMobileActions: workspace.mobileActions
    };
    Object.keys(map).forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.value = map[id];
    });
  }

  function ensureMobileActionDock(workspaceInput) {
    const workspace = normalizeWorkspace(workspaceInput || getCachedWorkspace());
    let dock = document.querySelector(".app-mobile-action-dock");
    const isPhoneSize = window.matchMedia?.("(max-width: 767px)")?.matches;
    const isTouchOnly = window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches;
    if (workspace.mobileActions === "off" || getCachedVisualDesign() !== "pro" || isPhoneSize || isTouchOnly) {
      dock?.remove();
      return;
    }
    if (!document.body) return;
    if (!dock) {
      dock = document.createElement("nav");
      dock.className = "app-mobile-action-dock";
      dock.setAttribute("aria-label", "Acoes rapidas mobile");
      document.body.appendChild(dock);
    }
    dock.innerHTML = `
      <a href="index.html">Hoje</a>
      <a href="tarefas.html">Tarefas</a>
      <a href="equipas-semanais.html">Equipas</a>
      <a href="add-toner.html">Toner</a>
      <a href="notificacoes.html">Avisos</a>
    `;
  }

  function applyWorkspace(workspaceInput = getCachedWorkspace(), options = {}) {
    const workspace = normalizeWorkspace(workspaceInput);
    const applyTo = (node) => {
      if (!node?.classList) return;
      node.classList.toggle("app-mode-tech", workspace.mode === "tech");
      node.classList.toggle("app-mode-simple", workspace.mode === "simple");
      node.classList.toggle("app-mode-management", workspace.mode === "simple");
      node.classList.toggle("app-density-compact", workspace.density === "compact");
      node.classList.toggle("app-density-comfortable", workspace.density === "comfortable");
      node.classList.toggle("app-radius-sharp", workspace.radius === "sharp");
      node.classList.toggle("app-radius-soft", workspace.radius === "soft");
      node.classList.toggle("app-radius-round", workspace.radius === "round");
      node.classList.toggle("app-mobile-actions-on", workspace.mobileActions === "on");
      node.classList.toggle("app-mobile-actions-off", workspace.mobileActions === "off");
      node.setAttribute("data-work-mode", workspace.mode);
      node.setAttribute("data-density", workspace.density);
    };
    applyTo(document.documentElement);
    applyTo(document.body);
    const radiusValue = workspace.radius === "sharp" ? "8px" : (workspace.radius === "round" ? "24px" : "16px");
    document.documentElement.style.setProperty("--app-control-radius", radiusValue);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => ensureMobileActionDock(workspace), { once: true });
    } else {
      ensureMobileActionDock(workspace);
    }
    if (options.persist !== false) {
      try { localStorage.setItem(WORKSPACE_STORAGE, JSON.stringify(workspace)); } catch (error) {}
      cookieSet(WORKSPACE_COOKIE, JSON.stringify(workspace));
    }
    syncWorkspaceControls(workspace);
    return workspace;
  }

  async function saveWorkspace(workspaceInput) {
    const workspace = applyWorkspace(workspaceInput);
    if (window.db?.collection) {
      await window.db.collection("config").doc("layout").set({
        workspaceMode: workspace,
        updatedAt: Date.now()
      }, { merge: true });
    }
    if (typeof window.mostrarMensagem === "function") window.mostrarMensagem("Modo de trabalho atualizado.");
    return workspace;
  }

  function applyVisualDesign(modeInput = getCachedVisualDesign(), options = {}) {
    const mode = modeInput === "classic" ? "classic" : "pro";
    const applyTo = (node) => {
      if (!node?.classList) return;
      node.classList.toggle("app-design-classic", mode === "classic");
      node.classList.toggle("app-design-pro", mode === "pro");
      node.setAttribute("data-app-design", mode);
    };
    applyTo(document.documentElement);
    applyTo(document.body);
    ensureClassicStylesheet(mode === "classic");
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => ensureProCommandBar(mode), { once: true });
    } else {
      ensureProCommandBar(mode);
    }
    if (options.persist !== false) {
      try { localStorage.setItem(DESIGN_STORAGE, mode); } catch (error) {}
      cookieSet(DESIGN_COOKIE, mode);
    }
    syncDesignControls(mode);
    applyWorkspace(getCachedWorkspace(), { persist: false });
    return mode;
  }

  async function saveVisualDesign(modeInput) {
    const mode = applyVisualDesign(modeInput);
    if (window.db?.collection) {
      await window.db.collection("config").doc("layout").set({
        visualDesign: mode,
        updatedAt: Date.now()
      }, { merge: true });
    }
    if (typeof window.mostrarMensagem === "function") {
      window.mostrarMensagem(mode === "classic" ? "Design clássico ativo." : "Design novo ativo.");
    }
    return mode;
  }

  function normalizeTheme(theme) {
    const legacyAccent = hex(cookieGet(LEGACY_COOKIE), "");
    return {
      primary: hex(theme.primary || theme.accentColor || legacyAccent, DEFAULT_THEME.primary),
      secondary: hex(theme.secondary || theme.accentColor2, DEFAULT_THEME.secondary),
      background: hex(theme.background || theme.bg, DEFAULT_THEME.background),
      background2: hex(theme.background2 || theme.bg2, DEFAULT_THEME.background2),
      surface: hex(theme.surface || theme.panel, DEFAULT_THEME.surface),
      surface2: hex(theme.surface2 || theme.panel2, DEFAULT_THEME.surface2),
      text: hex(theme.text, DEFAULT_THEME.text),
      muted: hex(theme.muted, DEFAULT_THEME.muted),
      buttonTextMode: ["auto", "light", "dark"].includes(theme.buttonTextMode) ? theme.buttonTextMode : DEFAULT_THEME.buttonTextMode
    };
  }

  function parseTheme(value) {
    try {
      const parsed = value ? JSON.parse(value) : {};
      return normalizeTheme(parsed);
    } catch (error) {
      return normalizeTheme({});
    }
  }

  function rgbaString(hexColor, alpha) {
    const c = rgb(hexColor);
    return "rgba(" + c.r + ", " + c.g + ", " + c.b + ", " + alpha + ")";
  }

  function apply(themeInput, options = {}) {
    const theme = normalizeTheme(themeInput || {});
    const root = document.documentElement;
    const primaryRgb = rgb(theme.primary);
    const secondaryRgb = rgb(theme.secondary);
    const buttonText = theme.buttonTextMode === "dark"
      ? "#101114"
      : theme.buttonTextMode === "light"
        ? "#ffffff"
        : brightness(theme.primary) > 168 ? "#101114" : "#ffffff";

    const vars = {
      "--app-primary": theme.primary,
      "--app-secondary": theme.secondary,
      "--app-bg": theme.background,
      "--app-bg-2": theme.background2,
      "--app-surface": rgbaString(theme.surface, .92),
      "--app-surface-2": rgbaString(theme.surface2, .88),
      "--app-text": theme.text,
      "--app-muted": theme.muted,
      "--app-button-text": buttonText,
      "--app-button-icon": buttonText,
      "--app-primary-rgb": primaryRgb.r + " " + primaryRgb.g + " " + primaryRgb.b,
      "--app-secondary-rgb": secondaryRgb.r + " " + secondaryRgb.g + " " + secondaryRgb.b,
      "--app-primary-soft": rgbaString(theme.primary, .16),
      "--app-primary-line": rgbaString(theme.primary, .30),
      "--app-primary-glow": rgbaString(theme.primary, .28),
      "--app-secondary-soft": rgbaString(theme.secondary, .15),
      "--app-secondary-line": rgbaString(theme.secondary, .28),
      "--app-success": "#22c55e",
      "--app-success-soft": "rgba(34, 197, 94, .14)",
      "--app-warning": "#f59e0b",
      "--app-warning-soft": "rgba(245, 158, 11, .15)",
      "--app-danger": "#ef4444",
      "--app-danger-soft": "rgba(239, 68, 68, .14)",
      "--app-accent": theme.primary,
      "--app-accent-hover": theme.secondary,
      "--app-accent-light": theme.secondary,
      "--app-accent-rgb": primaryRgb.r + " " + primaryRgb.g + " " + primaryRgb.b,
      "--app-accent-soft": rgbaString(theme.primary, .16),
      "--app-accent-softer": rgbaString(theme.primary, .08),
      "--app-accent-line": rgbaString(theme.primary, .30),
      "--app-accent-glow": rgbaString(theme.primary, .28),
      "--az-orange": theme.primary,
      "--az-orange-2": theme.secondary,
      "--az-orange-soft": rgbaString(theme.primary, .16),
      "--az-line": rgbaString(theme.primary, .30),
      "--primary": theme.primary,
      "--primary-hover": theme.secondary,
      "--sidebar-hover": theme.primary,
      "--brinka-pink": theme.primary,
      "--brinka-purple": theme.secondary,
      "--brinka-orange": theme.primary,
      "--brinka-orange2": theme.secondary,
      "--ent-blue": theme.primary,
      "--ent-purple": theme.secondary,
      "--ent-orange": theme.primary,
      "--app-blue": theme.primary,
      "--app-blue-soft": rgbaString(theme.primary, .16),
      "--pro-bg": theme.background,
      "--pro-bg-2": theme.background2,
      "--pro-surface": theme.surface,
      "--pro-surface-2": theme.surface2,
      "--pro-line": "rgba(194,205,222,.16)",
      "--pro-line-strong": rgbaString(theme.primary, .34),
      "--pro-text": theme.text,
      "--pro-muted": theme.muted,
      "--pro-red": theme.primary,
      "--pro-blue": theme.primary,
      "--pro-green": "#22c55e",
      "--pro-amber": "#f59e0b"
    };

    Object.keys(vars).forEach((key) => root.style.setProperty(key, vars[key]));
    root.classList.add("dark", "app-dark");
    document.body?.classList.add("dark", "app-dark");
    root.setAttribute("data-button-text-mode", theme.buttonTextMode);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", theme.background2);

    if (options.persist !== false) {
      cookieSet(COOKIE, JSON.stringify(theme));
      cookieSet(LEGACY_COOKIE, theme.primary);
      cookieSet("appButtonTextMode", theme.buttonTextMode);
    }

    syncControls(theme);
    applyWorkspace(getCachedWorkspace(), { persist: false });
    return theme;
  }

  function getCachedTheme() {
    return parseTheme(cookieGet(COOKIE));
  }

  function syncControls(themeInput) {
    const theme = normalizeTheme(themeInput || getCachedTheme());
    const map = {
      appThemePrimary: theme.primary,
      appThemeSecondary: theme.secondary,
      appThemeBackground: theme.background,
      appThemeBackground2: theme.background2,
      appThemeSurface: theme.surface,
      appThemeSurface2: theme.surface2,
      appThemeText: theme.text,
      appThemeMuted: theme.muted,
      appButtonTextMode: theme.buttonTextMode
    };
    Object.keys(map).forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.value = map[id];
    });
  }

  async function save(themeInput) {
    const theme = apply(themeInput);
    if (window.db?.collection) {
      await window.db.collection("config").doc("layout").set({
        themePro: theme,
        accentColor: theme.primary,
        accentColor2: theme.secondary,
        buttonTextMode: theme.buttonTextMode,
        updatedAt: Date.now()
      }, { merge: true });
    }
    if (typeof window.mostrarMensagem === "function") window.mostrarMensagem("Tema da APP atualizado.");
    return theme;
  }

  function readControls() {
    return normalizeTheme({
      primary: document.getElementById("appThemePrimary")?.value,
      secondary: document.getElementById("appThemeSecondary")?.value,
      background: document.getElementById("appThemeBackground")?.value,
      background2: document.getElementById("appThemeBackground2")?.value,
      surface: document.getElementById("appThemeSurface")?.value,
      surface2: document.getElementById("appThemeSurface2")?.value,
      text: document.getElementById("appThemeText")?.value,
      muted: document.getElementById("appThemeMuted")?.value,
      buttonTextMode: document.getElementById("appButtonTextMode")?.value
    });
  }

  function readWorkspaceControls() {
    return normalizeWorkspace({
      mode: document.getElementById("appWorkMode")?.value || document.querySelector("[data-work-mode].active")?.getAttribute("data-work-mode"),
      density: document.getElementById("appDensityMode")?.value,
      radius: document.getElementById("appRadiusMode")?.value,
      mobileActions: document.getElementById("appMobileActions")?.value
    });
  }

  function bindControls() {
    syncControls(getCachedTheme());
    syncDesignControls(getCachedVisualDesign());
    syncWorkspaceControls(getCachedWorkspace());
    document.querySelectorAll("[data-design-mode]").forEach((button) => {
      if (button.dataset.boundDesignMode) return;
      button.dataset.boundDesignMode = "1";
      button.addEventListener("click", () => saveVisualDesign(button.getAttribute("data-design-mode")).catch(console.error));
    });
    const designSelect = document.getElementById("appVisualDesignMode");
    if (designSelect && !designSelect.dataset.boundDesignMode) {
      designSelect.dataset.boundDesignMode = "1";
      designSelect.addEventListener("change", () => saveVisualDesign(designSelect.value).catch(console.error));
    }
    document.querySelectorAll("[data-work-mode]").forEach((button) => {
      if (button.dataset.boundWorkMode) return;
      button.dataset.boundWorkMode = "1";
      button.addEventListener("click", () => {
        const workspace = { ...getCachedWorkspace(), mode: button.getAttribute("data-work-mode") };
        saveWorkspace(workspace).catch(console.error);
      });
    });
    document.querySelectorAll("[data-workspace-live]").forEach((node) => {
      if (node.dataset.boundWorkspaceLive) return;
      node.dataset.boundWorkspaceLive = "1";
      node.addEventListener("change", () => saveWorkspace(readWorkspaceControls()).catch(console.error));
    });
    document.querySelectorAll("[data-theme-preset]").forEach((button) => {
      const key = button.getAttribute("data-theme-preset");
      const preset = PRESETS[key];
      if (!preset || button.dataset.boundThemePreset) return;
      button.dataset.boundThemePreset = "1";
      button.style.background = "linear-gradient(135deg, " + preset.primary + ", " + preset.secondary + ")";
      button.addEventListener("click", () => save({ ...getCachedTheme(), ...preset }));
    });
    document.querySelectorAll("[data-theme-live]").forEach((node) => {
      if (node.dataset.boundThemeLive) return;
      node.dataset.boundThemeLive = "1";
      node.addEventListener("input", () => apply(readControls()));
      node.addEventListener("change", () => save(readControls()).catch(console.error));
    });
  }

  function connectFirestore() {
    if (!window.db?.collection || window.__appThemeProFirestoreBound) return;
    window.__appThemeProFirestoreBound = true;
    const layoutRef = window.db.collection("config").doc("layout");
    if (isConfigPage()) {
      window.__appThemeProUnsubscribe = layoutRef.onSnapshot((doc) => {
        applyLayoutData(doc.exists ? doc.data() : {});
      }, (error) => console.error("Erro ao carregar tema:", error));
      return;
    }
    layoutRef.get().then((doc) => {
      applyLayoutData(doc.exists ? doc.data() : {});
    }).catch((error) => console.error("Erro ao carregar tema:", error));
  }

  window.addEventListener("beforeunload", () => {
    try { window.__appThemeProUnsubscribe?.(); } catch {}
    window.__appThemeProUnsubscribe = null;
    window.__appThemeProFirestoreBound = false;
  });

  window.AppThemePro = {
    DEFAULT_THEME,
    PRESETS,
    apply,
    save,
    readControls,
    bindControls,
    connectFirestore,
    getCachedTheme,
    normalizeTheme,
    applyVisualDesign,
    saveVisualDesign,
    getCachedVisualDesign,
    applyWorkspace,
    saveWorkspace,
    getCachedWorkspace,
    readWorkspaceControls
  };

  applyVisualDesign(getCachedVisualDesign(), { persist: false });
  apply(getCachedTheme(), { persist: false });
  applyWorkspace(getCachedWorkspace(), { persist: false });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      apply(getCachedTheme(), { persist: false });
      applyVisualDesign(getCachedVisualDesign(), { persist: false });
      applyWorkspace(getCachedWorkspace(), { persist: false });
      ensureSidebarPageLinks();
      sanitizeVisibleText();
      bindControls();
      setTimeout(connectFirestore, 300);
      setTimeout(() => {
        ensureSidebarPageLinks();
        sanitizeVisibleText();
      }, 900);
    });
  } else {
    apply(getCachedTheme(), { persist: false });
    applyVisualDesign(getCachedVisualDesign(), { persist: false });
    applyWorkspace(getCachedWorkspace(), { persist: false });
    ensureSidebarPageLinks();
    sanitizeVisibleText();
    bindControls();
    setTimeout(connectFirestore, 300);
    setTimeout(() => {
      ensureSidebarPageLinks();
      sanitizeVisibleText();
    }, 900);
  }
})();
