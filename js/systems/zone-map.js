(function () {
  "use strict";

  const COLLECTIONS = [
    ["impressoras", "impressora"],
    ["printers", "impressora"],
    ["computadores", "computador"],
    ["pcs", "computador"],
    ["portas", "porta"],
    ["radios", "radio"],
    ["pistolas", "pistola"],
    ["personalTasks", "tarefa"],
    ["manutencoes", "manutencao"]
  ];
  const state = { items: [], query: "", type: "all", priority: "all" };

  function isPage() {
    return /zonas\.html$/i.test(location.pathname || "");
  }

  function db() {
    return window.db || (window.firebase?.firestore ? firebase.firestore() : null);
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
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function first(item, fields = []) {
    for (const field of fields) {
      const value = item?.[field];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  }

  function percent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : null;
  }

  function tonerWorst(item = {}) {
    const values = [];
    if (item.toner && typeof item.toner === "object") {
      Object.values(item.toner).forEach((value) => {
        const p = percent(value);
        if (p !== null) values.push(p);
      });
    }
    if (Array.isArray(item.colors)) {
      item.colors.forEach((entry) => {
        const p = percent(entry?.percent ?? entry?.value ?? entry?.nivel);
        if (p !== null) values.push(p);
      });
    }
    ["black", "cyan", "magenta", "yellow", "percent"].forEach((key) => {
      const p = percent(item[key] ?? item[`${key}_percent`] ?? item[`${key}Percent`]);
      if (p !== null) values.push(p);
    });
    return values.length ? Math.min(...values) : null;
  }

  function zoneFor(item = {}) {
    const value = first(item, ["zona", "armazem", "localizacao", "location", "local", "empresa", "site", "secao", "departamento"]);
    return String(value || "Sem zona").trim();
  }

  function titleFor(type, item = {}) {
    if (type === "tarefa") return first(item, ["title", "titulo", "name"]) || "Tarefa";
    if (type === "porta") return first(item, ["porta", "nome", "equipamento", "ip"]) || "Porta";
    if (type === "radio") return first(item, ["nome", "name", "mac", "serial"]) || "Radio";
    if (type === "pistola") return first(item, ["nome", "num", "sn", "serial"]) || "Pistola";
    return first(item, ["modelo", "model", "nome", "name", "serie", "serial", "ip"]) || item.id || "Equipamento";
  }

  function priorityFor(type, item = {}) {
    const raw = normalize(item.priority || item.prioridade || item.urgencia);
    if (["urgente", "urgent", "critica", "critico"].includes(raw)) return "urgent";
    if (["alta", "high"].includes(raw)) return "high";
    if (["baixa", "low"].includes(raw)) return "low";
    if (type === "tarefa") {
      if (!item.done && item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10)) return "urgent";
      return item.done ? "low" : "normal";
    }
    if (type === "manutencao" && !/resolvido|fechado|concluido|concluído/i.test(String(item.estado || ""))) return "high";
    if (type === "impressora") {
      const worst = tonerWorst(item);
      if (worst !== null && worst <= 0) return "urgent";
      if (worst !== null && worst <= 25) return "high";
    }
    return "normal";
  }

  function priorityLabel(priority) {
    return { urgent: "Urgente", high: "Alta", normal: "Normal", low: "Baixa" }[priority] || "Normal";
  }

  function typeLabel(type) {
    return {
      impressora: "Impressora",
      computador: "Computador",
      porta: "Porta",
      radio: "Radio",
      pistola: "Pistola",
      tarefa: "Tarefa",
      manutencao: "Manutencao"
    }[type] || type;
  }

  function detailFor(type, item = {}) {
    const details = [
      first(item, ["ip"]),
      first(item, ["user", "utilizador", "owner", "responsavel"]),
      first(item, ["serie", "serial", "sn", "mac"]),
      type === "impressora" && tonerWorst(item) !== null ? `Toner ${tonerWorst(item)}%` : "",
      type === "tarefa" && item.dueDate ? `Prazo ${item.dueDate}` : "",
      type === "manutencao" ? first(item, ["estado", "motivo"]) : ""
    ].filter(Boolean);
    return details.slice(0, 3).join(" - ");
  }

  async function load() {
    const database = db();
    const status = document.getElementById("zoneMapStatus");
    if (!database?.collection) {
      if (status) status.textContent = "Firebase indisponivel";
      return;
    }
    if (status) status.textContent = "A carregar";
    const results = await Promise.all(COLLECTIONS.map(async ([collection, type]) => {
      try {
        const snap = await database.collection(collection).limit(300).get();
        return snap.docs.map((doc) => ({ id: doc.id, collection, type, ...doc.data() }));
      } catch {
        return [];
      }
    }));
    state.items = results.flat().map((item) => ({
      ...item,
      zone: zoneFor(item),
      title: titleFor(item.type, item),
      priority: priorityFor(item.type, item),
      detail: detailFor(item.type, item)
    }));
    if (status) status.textContent = `${state.items.length} registos`;
    render();
  }

  function filteredItems() {
    const q = normalize(state.query);
    return state.items.filter((item) => {
      if (state.type !== "all" && item.type !== state.type) return false;
      if (state.priority !== "all" && item.priority !== state.priority) return false;
      if (!q) return true;
      return normalize(`${item.zone} ${item.title} ${item.detail} ${item.collection} ${JSON.stringify(item)}`).includes(q);
    });
  }

  function renderSummary(items) {
    const host = document.getElementById("zoneMapSummary");
    if (!host) return;
    const zones = new Set(items.map((item) => item.zone)).size;
    const urgent = items.filter((item) => item.priority === "urgent").length;
    const high = items.filter((item) => item.priority === "high").length;
    const printers = items.filter((item) => item.type === "impressora").length;
    host.innerHTML = `
      <article class="zone-summary-card ${urgent ? "is-danger" : "is-ok"}"><span>Zonas</span><strong>${zones}</strong><small>Com registos ativos</small></article>
      <article class="zone-summary-card ${urgent ? "is-danger" : "is-ok"}"><span>Urgentes</span><strong>${urgent}</strong><small>Tratar primeiro</small></article>
      <article class="zone-summary-card ${high ? "is-warn" : "is-ok"}"><span>Alta prioridade</span><strong>${high}</strong><small>Acompanhar hoje</small></article>
      <article class="zone-summary-card"><span>Impressoras</span><strong>${printers}</strong><small>No mapa</small></article>
    `;
  }

  function render() {
    const host = document.getElementById("zoneMapGrid");
    if (!host) return;
    const items = filteredItems();
    renderSummary(items);
    const byZone = new Map();
    items.forEach((item) => {
      if (!byZone.has(item.zone)) byZone.set(item.zone, []);
      byZone.get(item.zone).push(item);
    });
    const zones = Array.from(byZone.entries()).sort((a, b) => {
      const pa = a[1].some((item) => item.priority === "urgent") ? 0 : (a[1].some((item) => item.priority === "high") ? 1 : 2);
      const pb = b[1].some((item) => item.priority === "urgent") ? 0 : (b[1].some((item) => item.priority === "high") ? 1 : 2);
      return pa - pb || a[0].localeCompare(b[0]);
    });
    host.innerHTML = zones.length ? zones.map(([zone, zoneItems]) => {
      const urgent = zoneItems.filter((item) => item.priority === "urgent").length;
      const high = zoneItems.filter((item) => item.priority === "high").length;
      const className = urgent ? "is-danger" : (high ? "is-warn" : "is-ok");
      return `
        <article class="zone-card ${className}">
          <header>
            <div><strong>${escapeHtml(zone)}</strong><small>${zoneItems.length} registo(s)</small></div>
            <span>${urgent ? `${urgent} urgente` : (high ? `${high} alta` : "OK")}</span>
          </header>
          <div class="zone-items">
            ${zoneItems.slice(0, 10).map((item) => `
              <a class="zone-item" href="${linkFor(item)}">
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <small>${escapeHtml(detailFor(item.type, item) || item.collection)}</small>
                </div>
                <span class="zone-chip ${item.priority}">${escapeHtml(typeLabel(item.type))} - ${escapeHtml(priorityLabel(item.priority))}</span>
              </a>
            `).join("")}
          </div>
        </article>
      `;
    }).join("") : `<div class="empty-state">Sem resultados para estes filtros.</div>`;
  }

  function linkFor(item = {}) {
    const typeMap = {
      impressora: "impressora",
      computador: "computador",
      porta: "porta",
      radio: "radio",
      pistola: "pistola"
    };
    if (typeMap[item.type]) return `equipamento.html?tipo=${encodeURIComponent(typeMap[item.type])}&id=${encodeURIComponent(item.id)}`;
    if (item.type === "tarefa") return "tarefas.html";
    if (item.type === "manutencao") return "manutencao-impressoras.html";
    return "index.html";
  }

  function bind() {
    document.getElementById("zoneMapSearch")?.addEventListener("input", (event) => {
      state.query = event.target.value || "";
      render();
    });
    document.getElementById("zoneMapType")?.addEventListener("change", (event) => {
      state.type = event.target.value || "all";
      render();
    });
    document.getElementById("zoneMapPriority")?.addEventListener("change", (event) => {
      state.priority = event.target.value || "all";
      render();
    });
    document.querySelector("[data-zone-refresh]")?.addEventListener("click", load);
  }

  function init() {
    if (!isPage()) return;
    bind();
    setTimeout(load, 700);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
