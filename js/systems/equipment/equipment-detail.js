(function () {
  "use strict";

  const state = {
    typeKey: "",
    config: null,
    item: null,
    collectionName: "",
    related: []
  };

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

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

  function compact(values) {
    return values.map((value) => String(value ?? "").trim()).filter(Boolean);
  }

  function firstField(item, fields = []) {
    for (const field of fields) {
      const value = getNestedValue(item, field);
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  }

  function getNestedValue(item, field) {
    if (!item || !field) return "";
    if (!String(field).includes(".")) return item[field];
    return String(field).split(".").reduce((current, key) => current && current[key], item);
  }

  function formatValue(value) {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? "Sim" : "Nao";
    if (typeof value === "number") {
      if (value > 100000000000) return new Date(value).toLocaleString("pt-PT");
      return String(value);
    }
    if (value && typeof value.toDate === "function") return value.toDate().toLocaleString("pt-PT");
    if (Array.isArray(value)) return value.length ? `${value.length} registo(s)` : "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function titleFor(config, item) {
    return firstField(item, config.titleFields) || item.id || "Ficha";
  }

  function subtitleFor(config, item) {
    return compact((config.subtitleFields || []).map((field) => firstField(item, [field]))).slice(0, 4).join(" - ");
  }

  function iconFor(typeKey) {
    return {
      impressora: "IMP",
      computador: "PC",
      user: "USR",
      pistola: "CK",
      porta: "NET",
      radio: "RAD",
      stock: "TON"
    }[typeKey] || "EQ";
  }

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = value;
  }

  function setLoading(text) {
    const node = byId("equipmentStatus");
    if (node) node.textContent = text;
  }

  function getDb() {
    return window.db || (window.firebase && firebase.firestore ? firebase.firestore() : null);
  }

  async function fetchDoc(collectionName, id) {
    const db = getDb();
    if (!db?.collection || !collectionName || !id) return null;
    const doc = await db.collection(collectionName).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, firebaseId: doc.id, ...doc.data() };
  }

  async function fetchAny(config, id) {
    const collections = [config.collection, ...(config.fallbackCollections || [])];
    for (const collectionName of collections) {
      const item = await fetchDoc(collectionName, id);
      if (item) return { item, collectionName };
    }
    return { item: null, collectionName: "" };
  }

  function buildFieldRows(config, item) {
    const used = new Set(["id", "firebaseId", "idDoc"]);
    const mainRows = (config.primaryFields || []).map(([label, ...fields]) => {
      fields.forEach((field) => used.add(field));
      return { label, value: firstField(item, fields) };
    });

    const hidden = new Set(config.privateFields || []);
    const extraRows = Object.keys(item || {})
      .filter((key) => !used.has(key) && !hidden.has(key) && !key.startsWith("_"))
      .slice(0, 18)
      .map((key) => ({ label: labelFromKey(key), value: item[key] }));

    return [...mainRows, ...extraRows].filter((row) => row.value !== undefined && row.value !== null && String(row.value).trim() !== "");
  }

  function labelFromKey(key) {
    return String(key)
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function renderFields() {
    const rows = buildFieldRows(state.config, state.item);
    const host = byId("equipmentFields");
    if (!host) return;
    host.innerHTML = rows.length ? rows.map((row) => `
      <div class="equipment-field">
        <span>${escapeHtml(row.label)}</span>
        <strong>${escapeHtml(formatValue(row.value))}</strong>
      </div>
    `).join("") : `<div class="empty-state">Sem campos para mostrar.</div>`;
  }

  function renderActions() {
    const host = byId("equipmentActions");
    if (!host) return;
    const actions = [
      ...(state.config.actions || []),
      { label: "Copiar link", action: "copy" },
      { label: "Imprimir ficha", action: "print" }
    ];
    host.innerHTML = actions.map((action) => {
      if (action.href) return `<a class="secondary-btn equipment-action-link" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`;
      return `<button class="secondary-btn" type="button" data-equipment-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>`;
    }).join("");
    host.querySelector('[data-equipment-action="copy"]')?.addEventListener("click", copyLink);
    host.querySelector('[data-equipment-action="print"]')?.addEventListener("click", () => window.print());
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLoading("Link copiado");
    } catch {
      setLoading("Nao foi possivel copiar automaticamente");
    }
  }

  function itemMatchesRelation(item, relation, source) {
    const sourceValues = compact((relation.compare || []).map((field) => firstField(source, [field]))).map(normalize).filter((v) => v.length >= 2);
    if (!sourceValues.length) return false;
    const targetText = normalize((relation.fields || []).map((field) => formatValue(getNestedValue(item, field))).join(" "));
    return sourceValues.some((value) => targetText.includes(value));
  }

  async function fetchRelated() {
    const db = getDb();
    if (!db?.collection || !state.config?.history?.length) return [];
    const groups = [];
    for (const relation of state.config.history) {
      try {
        const snap = await db.collection(relation.collection).limit(60).get();
        const items = snap.docs
          .map((doc) => ({ id: doc.id, firebaseId: doc.id, ...doc.data() }))
          .filter((item) => itemMatchesRelation(item, relation, state.item))
          .slice(0, 8);
        groups.push({ ...relation, items });
      } catch {
        groups.push({ ...relation, items: [], error: true });
      }
    }
    return groups;
  }

  function renderRelated() {
    const host = byId("equipmentHistory");
    if (!host) return;
    if (!state.related.length) {
      host.innerHTML = `<div class="empty-state">Sem historico relacionado nesta ficha.</div>`;
      return;
    }
    host.innerHTML = state.related.map((group) => `
      <div class="equipment-history-group">
        <div class="equipment-history-title">
          <strong>${escapeHtml(group.label)}</strong>
          <span>${group.error ? "Indisponivel" : `${group.items.length} registo(s)`}</span>
        </div>
        ${group.items.length ? group.items.map(renderRelatedItem).join("") : `<div class="equipment-history-empty">Sem registos encontrados.</div>`}
      </div>
    `).join("");
  }

  function renderRelatedItem(item) {
    const title = firstField(item, ["titulo", "modelo", "nome", "name", "equipamento", "action", "weekLabel", "estado"]) || item.id;
    const detail = compact(["createdAt", "updatedAt", "data", "estado", "motivo", "ip", "user", "localizacao"].map((field) => formatValue(item[field])).filter((value) => value !== "-")).slice(0, 4).join(" - ");
    return `
      <div class="equipment-history-item">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(detail || item.id)}</span>
      </div>
    `;
  }

  function buildQrUrl() {
    const text = window.location.href;
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(text)}`;
  }

  function renderHeader() {
    const title = titleFor(state.config, state.item);
    const subtitle = subtitleFor(state.config, state.item);
    document.title = `${title} - Ficha`;
    setText("equipmentTitle", title);
    setText("equipmentType", state.config.label);
    setText("equipmentSubtitle", subtitle || `ID ${state.item.id}`);
    setText("equipmentCollection", state.collectionName || state.config.collection);
    setText("equipmentId", state.item.id || "-");
    setText("equipmentBadge", iconFor(state.typeKey));
    const qr = byId("equipmentQr");
    if (qr) {
      qr.src = buildQrUrl();
      qr.alt = `QR ${title}`;
    }
  }

  function renderTypeChooser() {
    const host = byId("equipmentChooser");
    if (!host) return;
    const models = window.AppBragaEquipmentModels?.list || [];
    host.innerHTML = models.map((model) => `
      <a class="equipment-type-card" href="equipamento.html?tipo=${encodeURIComponent(model.key)}">
        <strong>${escapeHtml(model.plural || model.label)}</strong>
        <span>${escapeHtml(model.collection)}</span>
      </a>
    `).join("");
  }

  async function renderTypeList(config, typeKey) {
    const host = byId("equipmentSearchResults");
    if (!host) return;
    const db = getDb();
    if (!db?.collection) {
      host.innerHTML = `<div class="empty-state">Firebase indisponivel.</div>`;
      return;
    }
    host.innerHTML = `<div class="empty-state">A carregar ${escapeHtml(config.plural || config.label)}...</div>`;
    try {
      const snap = await db.collection(config.collection).limit(80).get();
      const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      host.innerHTML = items.length ? items.map((item) => `
        <a class="equipment-result-card" href="equipamento.html?tipo=${encodeURIComponent(typeKey)}&id=${encodeURIComponent(item.id)}">
          <strong>${escapeHtml(titleFor(config, item))}</strong>
          <span>${escapeHtml(subtitleFor(config, item) || item.id)}</span>
        </a>
      `).join("") : `<div class="empty-state">Sem registos nesta colecao.</div>`;
      bindLocalSearch(items, config, typeKey);
    } catch {
      host.innerHTML = `<div class="empty-state">Nao foi possivel carregar esta lista.</div>`;
    }
  }

  function bindLocalSearch(items, config, typeKey) {
    const input = byId("equipmentSearch");
    const host = byId("equipmentSearchResults");
    if (!input || !host) return;
    input.addEventListener("input", () => {
      const q = normalize(input.value);
      const filtered = !q ? items : items.filter((item) => normalize(JSON.stringify(item)).includes(q));
      host.innerHTML = filtered.slice(0, 80).map((item) => `
        <a class="equipment-result-card" href="equipamento.html?tipo=${encodeURIComponent(typeKey)}&id=${encodeURIComponent(item.id)}">
          <strong>${escapeHtml(titleFor(config, item))}</strong>
          <span>${escapeHtml(subtitleFor(config, item) || item.id)}</span>
        </a>
      `).join("") || `<div class="empty-state">Sem resultados.</div>`;
    });
  }

  function showMode(mode) {
    document.body.dataset.equipmentMode = mode;
  }

  async function init() {
    const models = window.AppBragaEquipmentModels?.types || {};
    state.typeKey = normalize(qs("tipo") || qs("type"));
    state.config = models[state.typeKey] || null;
    const id = qs("id");

    renderTypeChooser();

    if (!state.config) {
      showMode("chooser");
      setLoading("Escolhe um tipo de ficha");
      return;
    }

    setText("equipmentListTitle", state.config.plural || state.config.label);
    if (!id) {
      showMode("list");
      setLoading(`A listar ${state.config.plural || state.config.label}`);
      await renderTypeList(state.config, state.typeKey);
      return;
    }

    showMode("detail");
    setLoading("A carregar ficha");
    const result = await fetchAny(state.config, id);
    state.item = result.item;
    state.collectionName = result.collectionName;

    if (!state.item) {
      showMode("missing");
      setLoading("Ficha nao encontrada");
      setText("equipmentMissingText", `Nao encontrei ${state.config.label} com o ID ${id}.`);
      return;
    }

    renderHeader();
    renderFields();
    renderActions();
    state.related = await fetchRelated();
    renderRelated();
    setLoading("Ficha carregada");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
