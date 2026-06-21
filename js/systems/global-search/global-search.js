(function () {
  "use strict";

  const state = {
    ready: false,
    loading: false,
    open: false,
    items: [],
    loadedAt: 0
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function getDb() {
    return window.db || (window.firebase && firebase.firestore ? firebase.firestore() : null);
  }

  function models() {
    const list = window.AppBragaEquipmentModels?.list || [];
    return list.filter((item) => item.collection && item.key);
  }

  function firstField(item, fields = []) {
    for (const field of fields) {
      const value = item[field];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  }

  function compact(values) {
    return values.map((value) => String(value ?? "").trim()).filter(Boolean);
  }

  function titleFor(model, item) {
    return firstField(item, model.titleFields) || item.id || "Registo";
  }

  function subtitleFor(model, item) {
    return compact((model.subtitleFields || []).map((field) => item[field])).slice(0, 4).join(" - ");
  }

  function buildHaystack(model, item) {
    return normalize([
      model.label,
      model.plural,
      model.collection,
      titleFor(model, item),
      subtitleFor(model, item),
      ...Object.values(item || {}).filter((value) => typeof value !== "object").slice(0, 40)
    ].join(" "));
  }

  function setStatus(text) {
    const node = byId("globalSearchStatus");
    if (node) node.textContent = text;
  }

  function renderShell() {
    if (byId("globalSearchButton")) return;
    const main = document.querySelector(".main, main");
    if (!main) return;
    const hero = main.querySelector(".page-hero") || main.firstElementChild;

    const button = document.createElement("button");
    button.id = "globalSearchButton";
    button.className = "secondary-btn global-search-button";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.textContent = "Pesquisar";
    button.addEventListener("click", toggleSearch);

    if (hero && hero.classList.contains("page-hero")) {
      hero.appendChild(button);
    } else {
      main.insertBefore(button, main.firstChild);
    }

    const panel = document.createElement("section");
    panel.id = "globalSearchPanel";
    panel.className = "panel global-search-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="global-search-head">
        <div>
          <h3>Pesquisa global</h3>
          <p class="section-subtitle">Procura users, impressoras, IPs, portas, pistolas, radios e toners.</p>
        </div>
        <button class="secondary-btn global-search-close" type="button" id="globalSearchClose">Fechar</button>
      </div>
      <div class="global-search-box">
        <input id="globalSearchInput" type="text" placeholder="Pesquisar por nome, IP, serie, MAC, user, porta ou toner...">
        <span id="globalSearchStatus">Pronto.</span>
      </div>
      <div id="globalSearchResults" class="global-search-results"></div>
    `;

    if (hero && hero.parentNode) hero.insertAdjacentElement("afterend", panel);
    else main.insertBefore(panel, main.firstChild);

    byId("globalSearchClose")?.addEventListener("click", closeSearch);
    byId("globalSearchInput")?.addEventListener("input", handleInput);
  }

  function toggleSearch() {
    state.open ? closeSearch() : openSearch();
  }

  async function openSearch() {
    const panel = byId("globalSearchPanel");
    const button = byId("globalSearchButton");
    if (!panel) return;
    state.open = true;
    panel.hidden = false;
    button?.setAttribute("aria-expanded", "true");
    button?.classList.add("is-active");
    setTimeout(() => byId("globalSearchInput")?.focus(), 30);
    await ensureIndex();
    renderResults(byId("globalSearchInput")?.value || "");
  }

  function closeSearch() {
    const panel = byId("globalSearchPanel");
    const button = byId("globalSearchButton");
    state.open = false;
    if (panel) panel.hidden = true;
    button?.setAttribute("aria-expanded", "false");
    button?.classList.remove("is-active");
  }

  async function ensureIndex(force = false) {
    if (state.loading) return;
    if (!force && state.ready && Date.now() - state.loadedAt < 120000) return;
    const db = getDb();
    const list = models();
    if (!db?.collection || !list.length) {
      setStatus("Firebase indisponivel.");
      return;
    }
    state.loading = true;
    setStatus("A carregar indice...");
    const items = [];
    for (const model of list) {
      try {
        const snap = await db.collection(model.collection).limit(120).get();
        snap.docs.forEach((doc) => {
          const data = { id: doc.id, firebaseId: doc.id, ...doc.data() };
          items.push({
            id: doc.id,
            typeKey: model.key,
            typeLabel: model.label,
            title: titleFor(model, data),
            subtitle: subtitleFor(model, data),
            href: `equipamento.html?tipo=${encodeURIComponent(model.key)}&id=${encodeURIComponent(doc.id)}`,
            haystack: buildHaystack(model, data)
          });
        });
      } catch {
        items.push({
          id: `${model.key}-error`,
          typeKey: model.key,
          typeLabel: model.label,
          title: `${model.label} indisponivel`,
          subtitle: "Nao foi possivel pesquisar esta colecao.",
          href: `equipamento.html?tipo=${encodeURIComponent(model.key)}`,
          haystack: normalize(`${model.label} ${model.plural}`)
        });
      }
    }
    state.items = items;
    state.ready = true;
    state.loadedAt = Date.now();
    state.loading = false;
    setStatus(`${items.length} registos indexados.`);
  }

  function handleInput(event) {
    renderResults(event.target.value || "");
  }

  function renderResults(query) {
    const host = byId("globalSearchResults");
    if (!host) return;
    const q = normalize(query);
    if (!q) {
      host.innerHTML = `<div class="empty-state">Escreve para pesquisar em toda a app.</div>`;
      return;
    }
    if (q.length < 2) {
      host.innerHTML = `<div class="empty-state">Escreve pelo menos 2 caracteres.</div>`;
      return;
    }
    const terms = q.split(/\s+/).filter(Boolean);
    const hits = state.items
      .map((item) => ({
        ...item,
        score: terms.reduce((score, term) => score + (item.haystack.includes(term) ? 1 : 0), 0)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 24);

    host.innerHTML = hits.length ? hits.map((item) => `
      <a class="global-search-result" href="${escapeHtml(item.href)}">
        <span>${escapeHtml(item.typeLabel)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.subtitle || item.id)}</small>
      </a>
    `).join("") : `<div class="empty-state">Sem resultados para "${escapeHtml(query)}".</div>`;
  }

  function init() {
    renderShell();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.AppBragaGlobalSearch = {
    open: openSearch,
    close: closeSearch,
    refresh: () => ensureIndex(true)
  };
})();
