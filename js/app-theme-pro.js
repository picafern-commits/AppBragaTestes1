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
      name: "Autozitania",
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
    ["Nao", "Não"],
    ["nao", "não"],
    ["possivel", "possível"],
    ["Possivel", "Possível"],
    ["notificacao", "notificação"],
    ["Notificacao", "Notificação"],
    ["notificacoes", "notificações"],
    ["Notificacoes", "Notificações"],
    ["Navegacao", "Navegação"],
    ["Operacao", "Operação"],
    ["Administracao", "Administração"],
    ["Manutencao", "Manutenção"],
    ["manutencao", "manutenção"],
    ["Configuracoes", "Configurações"],
    ["Informacoes", "Informações"],
    ["Diretorio", "Diretório"],
    ["Historico", "Histórico"],
    ["historico", "histórico"],
    ["Diagnostico", "Diagnóstico"],
    ["Radios", "Rádios"],
    ["Visao", "Visão"],
    ["visao", "visão"],
    ["pagina", "página"],
    ["paginas", "páginas"],
    ["Pagina", "Página"],
    ["Paginas", "Páginas"],
    ["rapida", "rápida"],
    ["Rapida", "Rápida"],
    ["rapido", "rápido"],
    ["Rapido", "Rápido"],
    ["tecnica", "técnica"],
    ["Tecnica", "Técnica"],
    ["relacoes", "relações"],
    ["Relacoes", "Relações"],
    ["seguranca", "segurança"],
    ["Seguranca", "Segurança"],
    ["aparencia", "aparência"],
    ["Aparencia", "Aparência"],
    ["Preferencias", "Preferências"],
    ["preferencias", "preferências"],
    ["Organizacao", "Organização"],
    ["organizacao", "organização"],
    ["Responsavel", "Responsável"],
    ["responsavel", "responsável"],
    ["padrao", "padrão"],
    ["Padrao", "Padrão"],
    ["Toners disponiveis", "Toners disponíveis"],
    ["Manutencoes", "Manutenções"],
    ["classico", "clássico"],
    ["botoes", "botões"],
    ["camara", "câmara"],
    ["Camara", "Câmara"],
    ["Serie", "Série"],
    ["Codigo", "Código"],
    ["Localizacao", "Localização"],
    ["Referencia", "Referência"],
    ["Ultimos", "Últimos"],
    ["ultimos", "últimos"]
  ];

  const SIDEBAR_CODES = [
    ["index.html", "🏠"], ["stock.html", "📦"], ["diretorio.html", "📇"],
    ["impressoras.html", "🖨️"], ["add-toner.html", "➕"], ["historico.html", "🕒"],
    ["tarefas.html", "✅"], ["scanner-ia.html", "📄"], ["etiquetas-word.html", "🏷️"],
    ["manutencao-impressoras.html", "🛠️"], ["zonas.html", "📍"], ["computadores.html", "💻"],
    ["pistolas.html", "📱"], ["radios.html", "📡"], ["portas.html", "🌐"],
    ["informacoes.html", "ℹ️"], ["users.html", "👥"], ["diagnostico.html", "🩺"],
    ["config.html", "⚙️"]
  ];

  const SIDEBAR_GROUP_CODES = {
    "opera-o": "🧰",
    "equipamentos": "🖨️",
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
    return;
  }

  function normalizeSidebarLabel(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function removeOrphanSidebarLinks() {
    const pageLabels = new Set([
      "Dashboard", "Stock", "Diretorio", "Directorio", "Adicionar Toner", "Historico",
      "Tarefas", "Scanner IA", "Etiquetas Word", "Impressoras", "Manutencao Impressoras",
      "Computadores", "Pistolas CK65", "Radios", "Zonas", "Portas Rede", "Informacoes",
      "Users", "Diagnostico", "Configuracoes"
    ].map((value) => normalizeSidebarLabel(value)));
    document.querySelectorAll(".sidebar-nav-pro, .sidebar-group, .sidebar-group-links, .sidebar-fav-list").forEach((node) => {
      if (!node.closest(".sidebar, aside.sidebar, .app-mobile-sidebar-new")) node.remove();
    });
    document.querySelectorAll(".app-pro-commandbar, body > .personal-dashboard-actions").forEach((node) => node.remove());
    document.querySelectorAll('a[href*=".html"]').forEach((link) => {
      if (link.closest(".sidebar, aside.sidebar, .app-mobile-sidebar-new, .personal-dashboard-actions, .dashboard-task-panel")) return;
      const text = normalizeSidebarLabel(link.textContent || "");
      const href = String(link.getAttribute("href") || "");
      const looksLikeSidebarLink = pageLabels.has(text) || /^(index|stock|diretorio|add-toner|historico|tarefas|scanner-ia|etiquetas-word|impressoras|manutencao-impressoras|computadores|pistolas|radios|zonas|portas|informacoes|users|diagnostico|config)\.html$/i.test(href.split("/").pop() || "");
      if (!looksLikeSidebarLink) return;
      const parent = link.parentElement;
      link.remove();
      if (parent && !parent.closest(".sidebar") && parent.children.length === 0 && !String(parent.textContent || "").trim()) {
        parent.remove();
      }
    });
  }

  function watchOrphanSidebarLinks() {
    if (!document.body || !window.MutationObserver || document.body.dataset.sidebarOrphanWatch === "1") return;
    document.body.dataset.sidebarOrphanWatch = "1";
    let timer = null;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        sanitizeVisibleText();
        removeOrphanSidebarLinks();
      }, 90);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 30000);
  }

  function currentPageTitle() {
    const hero = document.querySelector(".page-hero-title, .dashboard-header h1, main h1, .main h1");
    const active = document.querySelector(".sidebar a.active .sidebar-link-text, .sidebar a.active");
    return String(hero?.textContent || active?.textContent || document.title || "App Braga").trim();
  }

  function currentPageSubtitle() {
    const page = currentPageTitle().toLowerCase();
    if (page.includes("dashboard")) return "Visão operacional, tarefas e equipamentos importantes.";
    if (page.includes("tarefas")) return "Planeamento do trabalho em aberto, prioridades e prazos.";
    if (page.includes("toner")) return "Entrada rápida de movimentos e referências.";
    if (page.includes("equipamento")) return "Ficha técnica, relações e histórico.";
    if (page.includes("config")) return "Preferências, segurança, aparência e tema.";
    return "Centro operacional App Braga.";
  }

  function ensureProCommandBar() {
    document.querySelectorAll(".app-pro-commandbar").forEach((node) => node.remove());
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

  function ensureMobileActionDock() {
    document.querySelectorAll(".app-mobile-action-dock").forEach((node) => node.remove());
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

  function isConfigPage() {
    const page = String(location.pathname || "").split("/").pop().toLowerCase();
    return page === "config.html";
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
      removeOrphanSidebarLinks();
      bindControls();
      setTimeout(connectFirestore, 300);
      setTimeout(() => {
        ensureSidebarPageLinks();
        sanitizeVisibleText();
        removeOrphanSidebarLinks();
      }, 900);
      setTimeout(removeOrphanSidebarLinks, 1800);
      setTimeout(removeOrphanSidebarLinks, 3200);
      watchOrphanSidebarLinks();
    });
  } else {
    apply(getCachedTheme(), { persist: false });
    applyVisualDesign(getCachedVisualDesign(), { persist: false });
    applyWorkspace(getCachedWorkspace(), { persist: false });
    ensureSidebarPageLinks();
    sanitizeVisibleText();
    removeOrphanSidebarLinks();
    bindControls();
    setTimeout(connectFirestore, 300);
    setTimeout(() => {
      ensureSidebarPageLinks();
      sanitizeVisibleText();
      removeOrphanSidebarLinks();
    }, 900);
    setTimeout(removeOrphanSidebarLinks, 1800);
    setTimeout(removeOrphanSidebarLinks, 3200);
    watchOrphanSidebarLinks();
  }
})();
