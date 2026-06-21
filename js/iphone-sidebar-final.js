/* APP BRAGA - mobile sidebar v2 */
(function () {
  "use strict";

  var NAV_GROUPS = [
    {
      title: "Operacao",
      items: [
        ["index.html", "🏠", "HJ"],
        ["tarefas.html", "Tarefas", "✅"],
        ["add-toner.html", "Adicionar Toner", "TN"],
        ["stock.html", "Stock", "📦"],
        ["historico.html", "Historico", "🕒"],
        ["scanner-ia.html", "Scanner IA", "📄"],
        ["etiquetas-word.html", "Etiquetas Word", "🏷️"]
      ]
    },
    {
      title: "Equipamentos",
      items: [
        ["impressoras.html", "Impressoras", "🖨️"],
        ["manutencao-impressoras.html", "Manutencao", "🛠️"],
        ["computadores.html", "Computadores", "💻"],
        ["pistolas.html", "Pistolas CK65", "📱"],
        ["radios.html", "Radios", "📡"]
      ]
    },
    {
      title: "Infraestrutura",
      items: [
        ["portas.html", "Portas Rede", "🌐"],
        ["diretorio.html", "Diretorio", "📇"],
        ["informacoes.html", "Informacoes", "ℹ️"]
      ]
    },
    {
      title: "Sistema",
      items: [
        ["users.html", "Users", "👥"],
        ["diagnostico.html", "Diagnostico", "🩺"],
        ["config.html", "Configuracoes", "⚙️"]
      ]
    }
  ];

  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
  }

  function pageName() {
    return (location.pathname || "").split("/").pop() || "index.html";
  }

  function ensureButton() {
    var button = document.querySelector(".app-menu-toggle");
    if (!button) {
      button = document.createElement("button");
      button.className = "app-menu-toggle";
      button.type = "button";
      document.body.appendChild(button);
    }
    button.classList.add("app-mobile-sidebar-button");
    button.textContent = document.body.classList.contains("sidebar-open") ? "x" : "Menu";
    button.setAttribute("aria-label", "Abrir menu");
    button.setAttribute("aria-expanded", document.body.classList.contains("sidebar-open") ? "true" : "false");
    return button;
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

  function ensureDrawer() {
    var drawer = document.querySelector(".app-mobile-sidebar-new");
    var current = pageName();
    if (!drawer) {
      drawer = document.createElement("nav");
      drawer.className = "app-mobile-sidebar-new";
      drawer.setAttribute("aria-label", "Menu principal");
      document.body.appendChild(drawer);
    }
    drawer.innerHTML = [
      '<div class="app-mobile-sidebar-head">',
      '<div class="app-mobile-sidebar-logo">AB</div>',
      '<div><strong>App Braga</strong><span>Centro operacional</span></div>',
      '</div>',
      NAV_GROUPS.map(function (group) {
        return '<section class="app-mobile-sidebar-group">' +
          '<p>' + group.title + '</p>' +
          group.items.map(function (item) {
            var active = item[0] === current ? " active" : "";
            return '<a class="' + active + '" href="' + item[0] + '">' +
              '<span class="app-mobile-sidebar-icon">' + item[2] + '</span>' +
              '<span>' + item[1] + '</span>' +
              '</a>';
          }).join("") +
          '</section>';
      }).join("")
    ].join("");
    return drawer;
  }

  function setClosed() {
    var drawer = ensureDrawer();
    var overlay = ensureOverlay();
    var button = ensureButton();
    drawer.classList.remove("open");
    overlay.classList.remove("show");
    document.body.classList.remove("sidebar-open");
    button.textContent = "Menu";
    button.setAttribute("aria-expanded", "false");
  }

  function setOpen() {
    var drawer = ensureDrawer();
    var overlay = ensureOverlay();
    var button = ensureButton();
    drawer.classList.add("open");
    overlay.classList.add("show");
    document.body.classList.add("sidebar-open");
    button.textContent = "x";
    button.setAttribute("aria-expanded", "true");
  }

  function toggle() {
    document.body.classList.contains("sidebar-open") ? setClosed() : setOpen();
  }

  function bindOnce() {
    if (document.documentElement.dataset.mobileSidebarV2 === "1") return;
    document.documentElement.dataset.mobileSidebarV2 = "1";

    var startX = 0;
    var startY = 0;
    var tracking = false;

    document.addEventListener("click", function (event) {
      var button = event.target.closest && event.target.closest(".app-menu-toggle");
      if (!button || !isMobile()) return;
      event.preventDefault();
      event.stopPropagation();
      toggle();
    }, true);

    document.addEventListener("click", function (event) {
      if (!isMobile()) return;
      if (event.target.closest && event.target.closest(".app-sidebar-overlay")) {
        event.preventDefault();
        setClosed();
      }
      if (event.target.closest && event.target.closest(".app-mobile-sidebar-new a[href]")) {
        setClosed();
      }
    }, true);

    document.addEventListener("touchstart", function (event) {
      if (!isMobile() || !event.touches || !event.touches.length) return;
      if (event.target.closest && event.target.closest("input, textarea, select, button, a")) return;
      var touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = (startX >= 34 && startX <= 118) || document.body.classList.contains("sidebar-open");
    }, { passive: true });

    document.addEventListener("touchmove", function (event) {
      if (!tracking || !isMobile() || !event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      var dx = touch.clientX - startX;
      var dy = Math.abs(touch.clientY - startY);
      if (Math.abs(dx) > 18 && dy < 34) event.preventDefault();
    }, { passive: false });

    document.addEventListener("touchend", function (event) {
      if (!tracking || !isMobile() || !event.changedTouches || !event.changedTouches.length) return;
      var touch = event.changedTouches[0];
      var dx = touch.clientX - startX;
      var dy = Math.abs(touch.clientY - startY);
      tracking = false;
      if (dy > 72 || Math.abs(dx) < 56) return;
      if (dx > 0 && startX >= 34 && startX <= 118) setOpen();
      if (dx < 0 && document.body.classList.contains("sidebar-open")) setClosed();
    }, { passive: true });
  }

  function init() {
    bindOnce();
    ensureButton();
    ensureOverlay();
    ensureDrawer();
    if (isMobile()) setClosed();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("pageshow", function () { setTimeout(init, 40); });
  window.addEventListener("resize", function () {
    setTimeout(function () {
      if (isMobile()) setClosed();
    }, 80);
  });

  window.AppBragaSidebar = {
    open: setOpen,
    close: setClosed,
    toggle: toggle
  };
})();
