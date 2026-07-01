/* APP BRAGA - final iPhone/tablet sidebar controller */
(function () {
  "use strict";

  var LINKS = [
    ["index.html", "Dashboard"],
    ["add-toner.html", "Adicionar Toner"],
    ["stock.html", "Stock"],
    ["historico.html", "Historico"],
    ["tarefas.html", "Tarefas"],
    ["scanner-ia.html", "Scanner IA"],
    ["etiquetas-word.html", "Etiquetas Word"],
    ["impressoras.html", "Impressoras"],
    ["manutencao-impressoras.html", "Manutencao Impressoras"],
    ["computadores.html", "Computadores"],
    ["users.html", "Users"],
    ["pistolas.html", "Pistolas CK65"],
    ["portas.html", "Portas Rede"],
    ["diretorio.html", "Diretorio"],
    ["radios.html", "Radios"],
    ["informacoes.html", "Informacoes"],
    ["diagnostico.html", "Diagnostico"],
    ["config.html", "Configuracoes"]
  ];

  var PAGE_ICONS = {
    "index.html":"🏠",
    "stock.html":"📦",
    "diretorio.html":"☎️",
    "impressoras.html":"🖨️",
    "add-toner.html":"➕",
    "historico.html":"🧾",
    "tarefas.html":"✓",
    "scanner-ia.html":"▣",
    "etiquetas-word.html":"🏷️",
    "manutencao-impressoras.html":"🛠️",
    "computadores.html":"💻",
    "pistolas.html":"📟",
    "radios.html":"📡",
    "portas.html":"🔌",
    "informacoes.html":"ℹ️",
    "notificacoes.html":"◉",
    "users.html":"👥",
    "diagnostico.html":"🩺",
    "config.html":"⚙️"
  };

  var GROUP_ICONS = {
    "opera-o":"⚡",
    "equipamentos":"🧰",
    "infraestrutura":"🌐",
    "administra-o":"⚙️"
  };

  function fileNameFromHref(href) {
    return String(href || "").split("?")[0].split("#")[0].split("/").pop().toLowerCase();
  }


  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
  }

  function getPageName() {
    return (location.pathname || "").split("/").pop() || "index.html";
  }

  function ensureOverlay() {
    var overlay = document.querySelector(".app-sidebar-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "app-sidebar-overlay";
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function ensureButton() {
    var button = document.querySelector(".app-menu-toggle");
    if (!button) {
      button = document.createElement("button");
      button.className = "app-menu-toggle";
      button.type = "button";
      document.body.appendChild(button);
    }
    button.setAttribute("aria-label", "Abrir menu");
    button.onclick = null;
    button.setAttribute("title", "Menu");
    if (!button.textContent || button.textContent.length > 2) button.textContent = "\u2630";
    return button;
  }


  function removeDuplicateSidebars() {
    var all = Array.prototype.slice.call(document.querySelectorAll("aside.sidebar, .enterprise-sidebar, #sidebar"));
    if (all.length <= 1) return all[0] || null;
    var keep = all.find(function (el) { return el.classList && el.classList.contains("sidebar-pro-groups"); }) || all[0];
    all.forEach(function (el) {
      if (el !== keep && el.parentNode) el.parentNode.removeChild(el);
    });
    return keep;
  }

  function enforceEmojiSidebar(sidebar) {
    if (!sidebar) return;
    sidebar.classList.add("sidebar-pro-groups", "sidebar-collapsible-pro", "sidebar-single-source");
    sidebar.querySelectorAll("a[href]").forEach(function (link) {
      var file = fileNameFromHref(link.getAttribute("href"));
      if (PAGE_ICONS[file]) link.setAttribute("data-icon", PAGE_ICONS[file]);
      var text = link.querySelector(".sidebar-link-text");
      if (!text) {
        var label = (link.textContent || "").replace(/\s+/g, " ").trim();
        link.innerHTML = '<span class="sidebar-link-text">' + label + '</span>';
      }
      if (file === getPageName().toLowerCase()) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    sidebar.querySelectorAll(".sidebar-group[data-sidebar-group]").forEach(function (group) {
      var key = group.getAttribute("data-sidebar-group") || "";
      var icon = group.querySelector(".sidebar-group-icon");
      if (icon && GROUP_ICONS[key]) icon.textContent = GROUP_ICONS[key];
      var isActive = !!group.querySelector("a.active, a[aria-current='page']");
      if (isActive || group.getAttribute("data-default-open") === "1") group.classList.add("is-open");
      var toggle = group.querySelector(".sidebar-group-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", group.classList.contains("is-open") ? "true" : "false");
    });
    sidebar.querySelectorAll(".sidebar-section-title > span").forEach(function (node) { node.textContent = "⭐"; });
  }

  function normalizeLinks(sidebar) {
    var current = getPageName();
    var links = Array.prototype.slice.call(sidebar.querySelectorAll("a[href]"));
    var usableLinks = links.filter(function (link) {
      return (link.getAttribute("href") || "").trim() && link.getAttribute("href") !== "#";
    });

    if (usableLinks.length < 8) {
      var brand = sidebar.querySelector(".brand, .premium-brand");
      sidebar.innerHTML = "";
      if (brand) sidebar.appendChild(brand);
      LINKS.forEach(function (item) {
        var link = document.createElement("a");
        link.href = item[0];
        var icon = PAGE_ICONS[item[0]] || "•";
        link.setAttribute("data-icon", icon);
        if (item[0] === current) link.classList.add("active");
        link.innerHTML = '<span class="sidebar-link-text">' + item[1] + "</span>";
        sidebar.appendChild(link);
      });
      return;
    }

    usableLinks.forEach(function (link) {
      var href = (link.getAttribute("href") || "").split("/").pop();
      var known = LINKS.find(function (item) { return item[0] === href; });
      var label = known ? known[1] : (link.textContent || "").replace(/\s+/g, " ").trim();
      if (PAGE_ICONS[href]) link.setAttribute("data-icon", PAGE_ICONS[href]);
      if (!label) return;

      var textNode = link.querySelector(".sidebar-link-text");
      if (!textNode) {
        var icon = link.querySelector("svg, i, .icon, .nav-icon, .sidebar-icon");
        link.innerHTML = "";
        if (icon) link.appendChild(icon);
        textNode = document.createElement("span");
        textNode.className = "sidebar-link-text";
        link.appendChild(textNode);
      }
      textNode.textContent = label;
      if (href === current) link.classList.add("active");
    });
  }

  function getContext() {
    var sidebar = removeDuplicateSidebars() || document.querySelector("aside.sidebar.sidebar-pro-groups, aside.sidebar, .enterprise-sidebar, #sidebar");
    if (!sidebar) return null;
    normalizeLinks(sidebar);
    enforceEmojiSidebar(sidebar);
    return {
      sidebar: sidebar,
      button: ensureButton(),
      overlay: ensureOverlay()
    };
  }

  function setClosed() {
    var ctx = getContext();
    if (!ctx) return;
    ctx.sidebar.classList.remove("app-open", "open", "active");
    document.body.classList.remove("sidebar-open");
    ctx.overlay.classList.remove("show");
    ctx.button.textContent = "\u2630";
    ctx.button.setAttribute("aria-expanded", "false");
    ctx.sidebar.style.removeProperty("transform");
    ctx.sidebar.style.removeProperty("visibility");
    ctx.sidebar.style.removeProperty("pointer-events");
  }

  function setOpen() {
    var ctx = getContext();
    if (!ctx) return;
    ctx.sidebar.classList.add("app-open");
    document.body.classList.add("sidebar-open");
    ctx.overlay.classList.add("show");
    ctx.button.textContent = "\u00d7";
    ctx.button.setAttribute("aria-expanded", "true");
  }

  function toggle() {
    if (document.body.classList.contains("sidebar-open")) {
      setClosed();
    } else {
      setOpen();
    }
  }

  function bindOnce() {
    if (document.documentElement.dataset.iphoneSidebarFinal === "1") return;
    document.documentElement.dataset.iphoneSidebarFinal = "1";
    var swipeStartX = 0;
    var swipeStartY = 0;
    var swipeTracking = false;

    document.addEventListener("click", function (event) {
      var button = event.target.closest && event.target.closest(".app-menu-toggle");
      if (!button || !isMobile()) return;
      event.preventDefault();
      event.stopPropagation();
      toggle();
    }, true);

    document.addEventListener("click", function (event) {
      var overlay = event.target.closest && event.target.closest(".app-sidebar-overlay");
      if (!overlay || !isMobile()) return;
      event.preventDefault();
      event.stopPropagation();
      setClosed();
    }, true);

    document.addEventListener("click", function (event) {
      var link = event.target.closest && event.target.closest("aside.sidebar a[href], .sidebar a[href], #sidebar a[href], .enterprise-sidebar a[href]");
      if (!link || !isMobile()) return;
      setClosed();
    }, true);

    document.addEventListener("touchstart", function (event) {
      if (!isMobile() || !event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      swipeStartX = touch.clientX;
      swipeStartY = touch.clientY;
      swipeTracking = swipeStartX <= 26 || document.body.classList.contains("sidebar-open");
    }, { passive: true });

    document.addEventListener("touchend", function (event) {
      if (!swipeTracking || !isMobile() || !event.changedTouches || !event.changedTouches.length) return;
      var touch = event.changedTouches[0];
      var dx = touch.clientX - swipeStartX;
      var dy = Math.abs(touch.clientY - swipeStartY);
      swipeTracking = false;
      if (dy > 70 || Math.abs(dx) < 58) return;
      if (dx > 0 && swipeStartX <= 26) setOpen();
      if (dx < 0 && document.body.classList.contains("sidebar-open")) setClosed();
    }, { passive: true });
  }


  function bindGroupsOnce() {
    var sidebar = document.querySelector("aside.sidebar.sidebar-pro-groups, aside.sidebar");
    if (!sidebar) return;
    sidebar.querySelectorAll(".sidebar-group").forEach(function (group) {
      var toggle = group.querySelector(".sidebar-group-toggle");
      if (!toggle || toggle.dataset.sidebarGroupBound === "1") return;
      toggle.dataset.sidebarGroupBound = "1";
      toggle.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        group.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", group.classList.contains("is-open") ? "true" : "false");
      });
    });
  }

  function init() {
    bindOnce();
    getContext();
    bindGroupsOnce();
    if (isMobile()) setClosed();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("pageshow", function () {
    window.setTimeout(init, 40);
  });

  window.addEventListener("resize", function () {
    window.setTimeout(function () {
      getContext();
      if (isMobile() && !document.body.classList.contains("sidebar-open")) setClosed();
    }, 80);
  });

  window.AppBragaSidebar = {
    open: setOpen,
    close: setClosed,
    toggle: toggle
  };
})();
