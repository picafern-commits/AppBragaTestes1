
/* APP BRAGA - IPHONE FORCE FINAL */
(function () {
  var LINKS = [
    ["index.html", "Dashboard"],
    ["add-toner.html", "Adicionar Toner"],
    ["stock.html", "Stock"],
    ["historico.html", "Histórico"],
    ["etiquetas-word.html", "Etiquetas Word"],
    ["impressoras.html", "Impressoras"],
    ["manutencao-impressoras.html", "Manutenção Impressoras"],
    ["computadores.html", "Computadores"],
    ["users.html", "Users"],
    ["pistolas.html", "Pistolas CK65"],
    ["portas.html", "Portas Rede"],
    ["radios.html", "Rádios"],
    ["informacoes.html", "Informações"],
    ["config.html", "Configurações"]
  ];

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function normalizeSidebarLinks(sidebar) {
    var current = (location.pathname || "").split("/").pop() || "index.html";

    // Se a sidebar estiver estragada ou só com letras, reconstruir.
    var text = (sidebar.textContent || "").replace(/\s+/g, " ").trim();
    var needsRebuild = text.length < 35 || !/Dashboard|Adicionar|Stock|Hist/i.test(text);

    if (needsRebuild) {
      var brand = sidebar.querySelector(".brand, .premium-brand");
      sidebar.innerHTML = "";
      if (brand) sidebar.appendChild(brand);

      LINKS.forEach(function (item) {
        var a = document.createElement("a");
        a.href = item[0];
        a.innerHTML = '<span class="sidebar-link-text">' + item[1] + '</span>';
        if (current === item[0]) a.classList.add("active");
        sidebar.appendChild(a);
      });
      return;
    }

    sidebar.querySelectorAll("a").forEach(function (a) {
      var label = (a.textContent || "").replace(/\s+/g, " ").trim();
      if (!label) return;

      // Corrigir links que ficaram só com uma letra quando o CSS antigo encolhe.
      var href = (a.getAttribute("href") || "").split("/").pop();
      var known = LINKS.find(function (x) { return x[0] === href; });
      if (known) label = known[1];

      if (!a.querySelector(".sidebar-link-text")) {
        a.innerHTML = '<span class="sidebar-link-text">' + label + '</span>';
      } else {
        a.querySelector(".sidebar-link-text").textContent = label;
      }
    });
  }

  function forceFullscreenLayout() {
    if (!isMobile()) return;

    document.documentElement.classList.remove("sidebar-collapsed");
    document.body.classList.remove("sidebar-collapsed", "app-mobile-actions-on");
    document.documentElement.classList.add("iphone-fit-locked");
    document.body.classList.add("iphone-fit-locked");

    document.querySelectorAll(".app-mobile-action-dock").forEach(function (dock) {
      dock.remove();
    });

    document.documentElement.style.setProperty("width", "100%", "important");
    document.documentElement.style.setProperty("max-width", "100%", "important");
    document.documentElement.style.setProperty("overflow-x", "hidden", "important");
    document.body.style.setProperty("width", "100%", "important");
    document.body.style.setProperty("max-width", "100%", "important");
    document.body.style.setProperty("margin", "0", "important");
    document.body.style.setProperty("padding-left", "0", "important");
    document.body.style.setProperty("padding-right", "0", "important");
    document.body.style.setProperty("padding-bottom", "0", "important");
    document.body.style.setProperty("display", "block", "important");
    document.body.style.setProperty("overflow-x", "hidden", "important");

    var nodes = document.querySelectorAll(".app, .main, main, .main-content, .page-content, .dashboard-container, .content-area, .dashboard-shell, .content, .page, .page-shell");
    nodes.forEach(function (main) {
      main.style.setProperty("margin-left", "0", "important");
      main.style.setProperty("margin-right", "0", "important");
      main.style.setProperty("left", "0", "important");
      main.style.setProperty("right", "auto", "important");
      main.style.setProperty("width", "100%", "important");
      main.style.setProperty("max-width", "100%", "important");
      main.style.setProperty("min-width", "0", "important");
      main.style.setProperty("padding-left", "max(12px, env(safe-area-inset-left, 0px))", "important");
      main.style.setProperty("padding-right", "max(12px, env(safe-area-inset-right, 0px))", "important");
      main.style.setProperty("box-sizing", "border-box", "important");
      main.style.setProperty("overflow-x", "hidden", "important");
    });

    document.querySelectorAll(".panel, .card, .premium-card, .stat-card, .metric-card, .stock-card, .config-card, .table-wrap, .scanner-panel, .personal-panel").forEach(function (node) {
      node.style.setProperty("max-width", "100%", "important");
      node.style.setProperty("min-width", "0", "important");
      node.style.setProperty("box-sizing", "border-box", "important");
    });
  }

  function setupMenu() {
    var sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    if (!isMobile()) {
      document.body.classList.remove("sidebar-open", "iphone-fit-locked", "app-mobile-actions-on");
      document.documentElement.classList.remove("iphone-fit-locked");
      document.querySelectorAll(".app-menu-toggle, .app-sidebar-overlay, .app-mobile-action-dock").forEach(function (node) {
        node.remove();
      });
      sidebar.classList.remove("app-open");
      sidebar.style.removeProperty("transform");
      sidebar.style.removeProperty("pointer-events");
      sidebar.style.removeProperty("visibility");
      return;
    }

    normalizeSidebarLinks(sidebar);
    forceFullscreenLayout();

    var btn = document.querySelector(".app-menu-toggle");
    if (!btn) {
      btn = document.createElement("button");
      btn.className = "app-menu-toggle";
      btn.type = "button";
      btn.textContent = "☰";
      document.body.appendChild(btn);
    }

    var overlay = document.querySelector(".app-sidebar-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "app-sidebar-overlay";
      document.body.appendChild(overlay);
    }

    function open() {
      sidebar.classList.add("app-open");
      document.body.classList.add("sidebar-open");
      overlay.classList.add("show");
      btn.textContent = "×";
      sidebar.style.setProperty("transform", "translateX(0)", "important");
      sidebar.style.setProperty("pointer-events", "auto", "important");
    }

    function close() {
      sidebar.classList.remove("app-open");
      document.body.classList.remove("sidebar-open");
      overlay.classList.remove("show");
      btn.textContent = "☰";
      sidebar.style.removeProperty("transform");
      sidebar.style.removeProperty("pointer-events");
      sidebar.style.removeProperty("visibility");
    }

    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      sidebar.classList.contains("app-open") ? close() : open();
    };

    overlay.onclick = close;

    sidebar.querySelectorAll("a").forEach(function (a) {
      if (a.dataset.iphoneNavBound === "1") return;
      a.dataset.iphoneNavBound = "1";
      a.addEventListener("click", function (event) {
        var href = a.getAttribute("href");
        if (!href || href === "#") {
          close();
          return;
        }
        if (!isMobile()) {
          close();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        close();
        setTimeout(function () {
          window.location.href = href;
        }, 40);
      });
    });

    if (isMobile() && !document.body.classList.contains("sidebar-open")) {
      close();
    }
  }

  function init() {
    setupMenu();
    setTimeout(function () {
      setupMenu();
      forceFullscreenLayout();
    }, 300);
    setTimeout(function () {
      setupMenu();
      forceFullscreenLayout();
    }, 1000);
    setTimeout(function () {
      setupMenu();
      forceFullscreenLayout();
    }, 2200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("resize", function () {
    forceFullscreenLayout();
    setupMenu();
  });

  window.addEventListener("pageshow", function () {
    var sidebar = document.querySelector(".sidebar");
    var overlay = document.querySelector(".app-sidebar-overlay");
    var btn = document.querySelector(".app-menu-toggle");
    if (!isMobile() || !sidebar) return;
    sidebar.classList.remove("app-open");
    document.body.classList.remove("sidebar-open");
    overlay && overlay.classList.remove("show");
    if (btn) btn.textContent = "☰";
    sidebar.style.removeProperty("transform");
    sidebar.style.removeProperty("pointer-events");
    sidebar.style.removeProperty("visibility");
    forceFullscreenLayout();
  });

  if (window.MutationObserver) {
    var fitTimer = null;
    new MutationObserver(function () {
      if (!isMobile()) return;
      clearTimeout(fitTimer);
      fitTimer = setTimeout(forceFullscreenLayout, 40);
    }).observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class", "style"]
    });
  }

  setInterval(function () {
    if (isMobile()) forceFullscreenLayout();
  }, 1500);
})();
