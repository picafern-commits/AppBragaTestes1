
(function(){
  const CACHE_KEY = "appBragaEtiquetasFuturista";
  const byId = (id) => document.getElementById(id);
  let etqCurrentPage = 1;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

  function globalValue(name){
    try {
      if (Object.prototype.hasOwnProperty.call(window, name)) return window[name];
      return Function("try{return typeof " + name + " !== 'undefined' ? " + name + " : undefined}catch(e){return undefined}")();
    } catch(e) { return undefined; }
  }

  function getDb(){
    try { if (typeof getDbAppBraga === "function") return getDbAppBraga(); } catch(e) {}
    return window.db || (window.firebase && firebase.firestore ? firebase.firestore() : null);
  }

  function readCache(){
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]") || []; }
    catch(e){ return []; }
  }

  function writeCache(data){
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(Array.isArray(data) ? data.slice(0, 1000) : [])); }
    catch(e) {}
  }

  function dateMs(v){
    if (!v) return 0;
    if (typeof v === "number") return v;
    if (v && typeof v.toMillis === "function") return v.toMillis();
    if (v && typeof v.toDate === "function") { try { return v.toDate().getTime(); } catch(e) {} }
    if (v && v.seconds) return v.seconds * 1000;
    const raw = String(v || "").trim();
    if (!raw) return 0;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return new Date(raw).getTime() || 0;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
      const [d,m,y] = raw.split(/[\/\s]/);
      return new Date(`${y}-${m}-${d}`).getTime() || 0;
    }
    return new Date(raw).getTime() || 0;
  }

  function fmtDate(v, withTime = false){
    let d = null;
    if (v && typeof v.toDate === "function") { try { d = v.toDate(); } catch(e) {} }
    else if (v && v.seconds) d = new Date(v.seconds * 1000);
    else {
      const ms = dateMs(v);
      if (ms) d = new Date(ms);
    }
    if (d && !Number.isNaN(d.getTime())) {
      const date = d.toLocaleDateString("pt-PT");
      const time = d.toLocaleTimeString("pt-PT", { hour:"2-digit", minute:"2-digit" });
      return withTime ? `${date} ${time}` : date;
    }
    if (!v) return "—";
    return String(v);
  }

  function isToday(v){
    const ms = dateMs(v);
    if (!ms) return false;
    const a = new Date(ms), b = new Date();
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function sortRecent(arr){
    return (Array.isArray(arr) ? arr : []).slice().sort((a,b) => dateMs(dateOf(b)) - dateMs(dateOf(a)));
  }

  function getEtiquetas(){
    const direct = window.__etiquetasFuturista;
    if (Array.isArray(direct)) return direct;
    const legacy = globalValue("etiquetasWordGlobal");
    if (Array.isArray(legacy)) return legacy;
    return readCache();
  }

  function idOf(item){ return item?.idDoc || item?.firebaseId || item?.id || ""; }
  function dateOf(item){ return item?.createdAt || item?.created || item?.updatedAt || item?.dataEtiqueta || item?.data || item?.dataFolha || item?.dataScan || ""; }
  function refOf(item){ return item?.codigoEtiqueta || item?.referencia || item?.sdsRef || item?.lote || item?.codigoScan || idOf(item) || "—"; }
  function equipOf(item){ return item?.equipamento || item?.modelo || item?.printer || item?.nome || "Etiqueta"; }
  function localOf(item){ return item?.localCurto || item?.localizacao || item?.local || item?.armazem || "—"; }
  function documentOf(item){
    if (item?.titulo || item?.nome) return item.titulo || item.nome;
    const ref = refOf(item);
    if (ref && ref !== "—") return `Etiquetas Toners - ${ref}.docx`;
    return "Etiqueta";
  }

  function statusOf(item){
    const raw = norm(item?.estado || item?.status || item?.origem || "");
    if (raw.includes("falha") || raw.includes("erro")) return ["Falha","falha"];
    if (raw.includes("pend")) return ["Pendente","pendente"];
    if (raw.includes("reimpr")) return ["Reimpresso","reimpresso"];
    return ["Gerado","gerado"];
  }

  function searchBlob(item){
    return norm([
      documentOf(item), refOf(item), equipOf(item), localOf(item), item?.serie, item?.cor,
      item?.lote, item?.sdsRef, item?.origem, item?.estado, item?.status, item?.armazem
    ].join(" "));
  }

  function ensureFilterOptions(items){
    const armazem = byId("filterEtiquetasArmazem");
    if (armazem) {
      const current = armazem.value;
      const locais = [...new Set(items.map(x => x.armazem || localOf(x)).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"pt"));
      const html = '<option value="">Todos os armazéns</option>' + locais.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join("");
      if (armazem.dataset.optionsHtml !== html) {
        armazem.innerHTML = html;
        armazem.dataset.optionsHtml = html;
      }
      armazem.value = locais.includes(current) ? current : "";
    }
  }

  function filtered(){
    const items = sortRecent(getEtiquetas());
    ensureFilterOptions(items);
    const q = norm(byId("searchEtiquetasWord")?.value || "");
    const armazem = byId("filterEtiquetasArmazem")?.value || "";
    const tipo = norm(byId("filterEtiquetasTipo")?.value || "");
    const estado = norm(byId("filterEtiquetasOrigem")?.value || "");
    return items.filter(item => {
      const [status] = statusOf(item);
      const doc = norm(documentOf(item));
      return (!q || searchBlob(item).includes(q)) &&
        (!armazem || String(item?.armazem || localOf(item)) === armazem) &&
        (!tipo || doc.includes(tipo) || searchBlob(item).includes(tipo)) &&
        (!estado || norm(status).includes(estado) || norm(item?.estado || item?.status || item?.origem).includes(estado));
    });
  }

  function renderKpis(items){
    const today = items.filter(i => isToday(dateOf(i))).length;
    const pending = items.filter(i => statusOf(i)[1] === "pendente").length;
    const reprints = items.filter(i => statusOf(i)[1] === "reimpresso" || norm(i?.origem).includes("reimpr")).length;
    const uniqueEquip = new Set(items.map(equipOf).filter(Boolean)).size;
    const latest = sortRecent(items)[0];

    const set = (id, val) => { const el = byId(id); if (el) el.textContent = val; };
    set("etqKpiHoje", today);
    set("countEtiquetasStock", today);
    set("countEtiquetasTotal", items.length);
    set("etqKpiPendentes", pending);
    set("etqKpiReimpressoes", reprints);
    set("countEtiquetasHistorico", uniqueEquip);
    set("etqKpiUltimoLote", latest ? (latest.lote || refOf(latest)).toString().slice(-8) : "—");
    set("etqKpiUltimoLoteSub", latest ? fmtDate(dateOf(latest), true) : "Sem dados");
  }


  function renderPagination(totalItems, perPage){
    const host = byId("etqPagination");
    if (!host) return;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    if (etqCurrentPage > totalPages) etqCurrentPage = totalPages;
    if (etqCurrentPage < 1) etqCurrentPage = 1;

    const pages = [];
    const add = (p) => {
      if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p);
    };

    add(1);
    add(etqCurrentPage - 2);
    add(etqCurrentPage - 1);
    add(etqCurrentPage);
    add(etqCurrentPage + 1);
    add(etqCurrentPage + 2);
    add(totalPages);
    pages.sort((a,b)=>a-b);

    let html = `<button type="button" data-etq-page="first" ${etqCurrentPage === 1 ? "disabled" : ""}>‹‹</button>`;
    html += `<button type="button" data-etq-page="prev" ${etqCurrentPage === 1 ? "disabled" : ""}>‹</button>`;

    let last = 0;
    pages.forEach((p) => {
      if (last && p - last > 1) html += `<button type="button" class="dots" disabled>…</button>`;
      html += `<button type="button" data-etq-page="${p}" class="${p === etqCurrentPage ? "active" : ""}">${p}</button>`;
      last = p;
    });

    html += `<button type="button" data-etq-page="next" ${etqCurrentPage === totalPages ? "disabled" : ""}>›</button>`;
    html += `<button type="button" data-etq-page="last" ${etqCurrentPage === totalPages ? "disabled" : ""}>››</button>`;
    host.innerHTML = html;
  }

  function renderTable(items){
    const tbody = byId("etqTableBody");
    if (!tbody) return;
    const per = Number(byId("etqPerPage")?.value || 23);
    const totalPages = Math.max(1, Math.ceil(items.length / per));
    if (etqCurrentPage > totalPages) etqCurrentPage = totalPages;
    if (etqCurrentPage < 1) etqCurrentPage = 1;

    const start = (etqCurrentPage - 1) * per;
    const rows = items.slice(start, start + per);

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="etq-empty-row">Sem etiquetas para mostrar.</td></tr>';
      const info = byId("etqTableInfo");
      if (info) info.textContent = "Total 0 etiquetas";
      renderPagination(0, per);
      return;
    }

    tbody.innerHTML = rows.map(item => {
      const id = idOf(item);
      const [status, cls] = statusOf(item);
      const doc = documentOf(item);
      return `<tr data-etq-id="${esc(id)}">
        <td>${esc(fmtDate(dateOf(item), true))}</td>
        <td>📄 ${esc(doc)}</td>
        <td>${esc(refOf(item))}</td>
        <td>${esc(equipOf(item))}</td>
        <td>${esc(localOf(item))}</td>
        <td><span class="etq-status ${cls}">${esc(status)}</span></td>
        <td>
          <div class="etq-row-actions">
            <button class="etq-icon-btn" type="button" data-etq-action="view" data-id="${esc(id)}" title="Ver">👁</button>
            <button class="etq-icon-btn" type="button" data-etq-action="download" data-id="${esc(id)}" title="Descarregar / Imprimir">↓</button>
            <button class="etq-icon-btn" type="button" data-etq-action="menu" data-id="${esc(id)}" title="Mais">⋮</button>
          </div>
        </td>
      </tr>`;
    }).join("");

    const info = byId("etqTableInfo");
    if (info) {
      const from = items.length ? start + 1 : 0;
      const to = Math.min(start + rows.length, items.length);
      info.textContent = `A mostrar ${from} a ${to} de ${items.length} etiquetas`;
    }
    renderPagination(items.length, per);
  }


  function renderRecent(items){
    const host = byId("etqRecentDocs");
    if (!host) return;
    const rows = sortRecent(items).slice(0, 5);
    if (!rows.length) {
      host.innerHTML = '<div class="etq-doc-row"><strong>Sem documentos recentes</strong><span>—</span><button type="button">✓</button></div>';
      return;
    }
    host.innerHTML = rows.map(item => {
      const id = idOf(item);
      return `<div class="etq-doc-row">
        <strong>📄 ${esc(documentOf(item))}</strong>
        <span>${esc(fmtDate(dateOf(item), true).replace(new Date().getFullYear().toString(), "").trim())}</span>
        <button type="button" data-etq-action="download" data-id="${esc(id)}" title="Imprimir">✓</button>
      </div>`;
    }).join("");
  }

  function renderGeneration(items){
    const counts = { gerado:0, pendente:0, falha:0, reimpresso:0 };
    items.forEach(i => counts[statusOf(i)[1]] = (counts[statusOf(i)[1]] || 0) + 1);
    const total = Math.max(1, items.length);
    const host = byId("etqGenerationList");
    if (host) {
      const rows = [
        ["Gerado","gerado","#35df68"],
        ["Pendente","pendente","#ffae2f"],
        ["Falha","falha","#ff5168"],
        ["Reimpresso","reimpresso","#22d3ff"],
      ];
      host.innerHTML = rows.map(([label,key,color]) => {
        const val = counts[key] || 0;
        const pct = items.length ? Math.round(val / total * 100) : 0;
        return `<div class="etq-gen-row">
          <span class="etq-gen-dot" style="background:${color}"></span>
          <span>${label}</span>
          <strong>${val}</strong>
          <b>${pct}%</b>
        </div>`;
      }).join("") + `<small>Total: ${items.length}</small>`;
    }

    const donut = byId("etqDonut");
    if (donut) {
      const g = items.length ? counts.gerado / total * 100 : 0;
      const p = items.length ? g + counts.pendente / total * 100 : 0;
      const f = items.length ? p + counts.falha / total * 100 : 0;
      donut.style.background = `conic-gradient(#35df68 0 ${g}%, #ffae2f ${g}% ${p}%, #ff5168 ${p}% ${f}%, #22d3ff ${f}% 100%)`;
    }
  }

  function renderLegacyHost(items){
    const host = byId("listaEtiquetasWord");
    if (!host) return;
    host.innerHTML = items.map(item => `<div data-etiqueta-word-id="${esc(idOf(item))}">${esc(documentOf(item))}</div>`).join("");
  }

  function renderAll(){
    const all = sortRecent(getEtiquetas());
    const items = filtered();
    renderKpis(all);
    renderTable(items);
    renderRecent(all);
    renderGeneration(all);
    renderLegacyHost(items);
  }

  async function generateFromItem(item, options = {}){
    if (!item) return false;
    if (typeof window.regerarEtiquetaWordPartilhada === "function" && idOf(item) && options.preferExisting !== false) {
      try { return await window.regerarEtiquetaWordPartilhada(idOf(item)); } catch(e) { console.warn(e); }
    }
    if (typeof window.gerarWordEtiquetaPartilhada === "function") {
      const res = await window.gerarWordEtiquetaPartilhada(item, { saveRecord: options.saveRecord !== false, silent: false });
      try { if (window.registarEtiquetaGeradaAppBraga) await window.registarEtiquetaGeradaAppBraga(item); } catch(e) {}
      return res;
    }
    alert("Sistema Word indisponível nesta página.");
    return false;
  }

  async function openEtiqueta(id){
    const item = getEtiquetas().find(x => idOf(x) === id);
    if (!item) return;
    const msg = [
      `Documento: ${documentOf(item)}`,
      `Referência: ${refOf(item)}`,
      `Equipamento: ${equipOf(item)}`,
      `Local: ${localOf(item)}`,
      `Estado: ${statusOf(item)[0]}`,
      `Data: ${fmtDate(dateOf(item), true)}`
    ].join("\n");
    alert(msg);
  }

  async function deleteEtiqueta(id){
    if (!id) return;
    if (!confirm("Queres apagar esta etiqueta?")) return;
    const db = getDb();
    if (!db) return alert("Firebase indisponível.");
    try {
      await db.collection("etiquetasWord").doc(id).delete();
      if (typeof mostrarMensagem === "function") mostrarMensagem("Etiqueta apagada.");
      else alert("Etiqueta apagada.");
    } catch(e) {
      console.error(e);
      alert("Não consegui apagar a etiqueta.");
    }
  }

  function bindActions(){
    document.addEventListener("click", async (ev) => {
      const pageBtn = ev.target.closest("[data-etq-page]");
      if (pageBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        const action = pageBtn.dataset.etqPage;
        const per = Number(byId("etqPerPage")?.value || 23);
        const total = filtered().length;
        const totalPages = Math.max(1, Math.ceil(total / per));
        if (action === "first") etqCurrentPage = 1;
        else if (action === "prev") etqCurrentPage = Math.max(1, etqCurrentPage - 1);
        else if (action === "next") etqCurrentPage = Math.min(totalPages, etqCurrentPage + 1);
        else if (action === "last") etqCurrentPage = totalPages;
        else etqCurrentPage = Number(action) || 1;
        renderAll();
        return;
      }

      const btn = ev.target.closest("[data-etq-action]");
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      const id = btn.dataset.id || "";
      const item = getEtiquetas().find(x => idOf(x) === id);
      const action = btn.dataset.etqAction;
      if (action === "view") return openEtiqueta(id);
      if (action === "download") return generateFromItem(item, { preferExisting:true, saveRecord:false });
      if (action === "menu") return deleteEtiqueta(id);
    }, true);
  }

  function bindFilters(){
    ["searchEtiquetasWord","filterEtiquetasArmazem","filterEtiquetasTipo","filterEtiquetasOrigem","etqPerPage"].forEach(id => {
      const el = byId(id);
      if (!el || el.dataset.etqBound === "1") return;
      el.dataset.etqBound = "1";
      el.addEventListener("input", () => { etqCurrentPage = 1; renderAll(); });
      el.addEventListener("change", () => { etqCurrentPage = 1; renderAll(); });
    });
  }

  function bindRealtime(){
    const db = getDb();
    if (!db || !db.collection || window.__etiquetasFuturistaRealtimeStarted) return;
    window.__etiquetasFuturistaRealtimeStarted = true;
    try {
      db.collection("etiquetasWord").onSnapshot((snap) => {
        const arr = [];
        snap.forEach(doc => arr.push({ idDoc: doc.id, firebaseId: doc.id, ...doc.data() }));
        window.__etiquetasFuturista = sortRecent(arr);
        writeCache(window.__etiquetasFuturista);
        renderAll();
      }, (err) => {
        console.warn("Etiquetas realtime:", err);
        window.__etiquetasFuturista = readCache();
        renderAll();
      });
    } catch(e) {
      console.warn("Não foi possível ligar etiquetasWord:", e);
    }
  }

  function overrideLegacy(){
    const oldRender = window.renderEtiquetasWordCards;
    window.renderEtiquetasWordCards = function(){
      try {
        const legacy = globalValue("etiquetasWordGlobal");
        if (Array.isArray(legacy)) {
          window.__etiquetasFuturista = sortRecent(legacy);
          writeCache(window.__etiquetasFuturista);
        }
      } catch(e) {}
      renderAll();
      return true;
    };
  }

  window.limparFiltrosEtiquetasFuturista = function(){
    ["searchEtiquetasWord","filterEtiquetasArmazem","filterEtiquetasTipo","filterEtiquetasOrigem"].forEach(id => {
      const el = byId(id);
      if (el) el.value = "";
    });
    etqCurrentPage = 1;
    renderAll();
  };

  window.gerarEtiquetaRapidaFuturista = async function(){
    const latest = sortRecent(getEtiquetas())[0];
    if (latest) return generateFromItem(latest, { preferExisting:false, saveRecord:true });
    window.location.href = "add-toner.html";
  };


  window.addEventListener("appbraga:systems:update", function(ev){
    try {
      if (ev.detail && Array.isArray(ev.detail.etiquetasWord) && ev.detail.etiquetasWord.length) {
        window.__etiquetasFuturista = ev.detail.etiquetasWord;
        renderAll();
      }
    } catch(e) {}
  });

  function init(){
    overrideLegacy();
    bindFilters();
    bindActions();
    bindRealtime();
    renderAll();
    setTimeout(renderAll, 300);
    setTimeout(renderAll, 1200);
    setTimeout(renderAll, 2600);
    setInterval(renderAll, 5000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
