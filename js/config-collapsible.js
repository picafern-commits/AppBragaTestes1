(function () {
  const CARD_SELECTOR = "main .config-section, main .config-card, main .enterprise-config-card";
  let memoryState = {};
  let remoteLoaded = false;

  async function loadState() {
    if (remoteLoaded) return memoryState;
    try {
      if (window.db?.collection) {
        const snap = await window.db.collection("config").doc("uiConfigCollapse").get();
        memoryState = snap.exists ? (snap.data()?.sections || {}) : {};
        remoteLoaded = true;
      }
    } catch {}
    return memoryState;
  }

  function state() {
    return memoryState || {};
  }

  async function save(nextState) {
    memoryState = nextState || {};
    try {
      if (window.db?.collection) {
        await window.db.collection("config").doc("uiConfigCollapse").set({
          sections: memoryState,
          updatedAt: Date.now()
        }, { merge: true });
        remoteLoaded = true;
      }
    }
    catch {}
  }

  function cleanTitle(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function title(card, index) {
    const heading = card.querySelector(".section-header h1, .section-header h2, .section-header h3, .section-header h4, h1, h2, h3, h4, .card-title");
    return cleanTitle(heading ? heading.textContent : `Seccao ${index + 1}`);
  }

  function key(text, index) {
    return cleanTitle(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `sec-${index}`;
  }

  function hideDuplicatedTitle(node) {
    if (node.nodeType !== 1) return;
    if (node.matches("h1,h2,h3,h4,.card-title")) {
      node.style.display = "none";
      return;
    }
    const heading = node.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > .card-title");
    if (heading) heading.style.display = "none";
  }

  function applyCollapsed(card, body, collapsed) {
    card.classList.toggle("is-collapsed", collapsed);
    body.hidden = collapsed;
    const icon = card.querySelector(".config-collapse-icon");
    if (icon) icon.textContent = collapsed ? "+" : "-";
  }

  function ensureGlobalActions() {
    if (document.querySelector(".config-collapse-global-actions")) return;
    const main = document.querySelector("main");
    if (!main) return;
    const actions = document.createElement("div");
    actions.className = "config-collapse-global-actions";
    actions.innerHTML = `
      <button class="secondary-btn" type="button" onclick="configExpandAll()">Abrir tudo</button>
      <button class="secondary-btn" type="button" onclick="configCollapseAll()">Fechar tudo</button>
    `;
    const hero = main.querySelector(".page-hero, .dashboard-header, .section-header");
    if (hero?.nextSibling) main.insertBefore(actions, hero.nextSibling);
    else main.insertBefore(actions, main.firstChild);
  }

  async function setup() {
    if (!/config\.html$/i.test(location.pathname)) return;
    await loadState();
    ensureGlobalActions();
    const saved = state();
    const cards = [...document.querySelectorAll(CARD_SELECTOR)];

    cards.forEach((card, index) => {
      if (card.dataset.collapseReady === "1" || card.closest(".modal-card")) return;

      const cardTitle = title(card, index);
      const cardKey = key(cardTitle, index);
      const children = [...card.childNodes];
      const header = document.createElement("button");
      const body = document.createElement("div");

      header.type = "button";
      header.className = "config-collapse-header";
      header.innerHTML = `<span class="config-collapse-title">${cardTitle}</span><span class="config-collapse-icon">-</span>`;
      body.className = "config-collapse-body";

      children.forEach((child) => {
        hideDuplicatedTitle(child);
        body.appendChild(child);
      });

      card.classList.add("config-collapsible-card");
      card.dataset.collapseReady = "1";
      card.dataset.key = cardKey;
      card.appendChild(header);
      card.appendChild(body);

      header.addEventListener("click", (event) => {
        event.preventDefault();
        const nextCollapsed = !card.classList.contains("is-collapsed");
        const nextState = state();
        nextState[cardKey] = nextCollapsed;
        save(nextState);
        applyCollapsed(card, body, nextCollapsed);
      });

      applyCollapsed(card, body, saved[cardKey] === true);
    });
  }

  window.configExpandAll = () => {
    const nextState = state();
    document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      if (card.dataset.key) nextState[card.dataset.key] = false;
      const body = card.querySelector(".config-collapse-body");
      if (body) applyCollapsed(card, body, false);
    });
    save(nextState);
  };

  window.configCollapseAll = () => {
    const nextState = state();
    document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      if (card.dataset.key) nextState[card.dataset.key] = true;
      const body = card.querySelector(".config-collapse-body");
      if (body) applyCollapsed(card, body, true);
    });
    save(nextState);
  };

  document.addEventListener("DOMContentLoaded", () => {
    setup();
    setTimeout(setup, 500);
    setTimeout(setup, 1500);
  });
  window.addEventListener("pageshow", () => setTimeout(setup, 200));
})();
