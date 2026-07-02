
(function(){
  const STOCK_CACHE_KEY = "appBragaStockFuturistaStock";
  const HIST_CACHE_KEY = "appBragaStockFuturistaHistorico";
  const LABEL_CACHE_KEY = "appBragaStockFuturistaEtiquetas";
  const byId = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

  function globalValue(name){
    try {
      if (Object.prototype.hasOwnProperty.call(window, name)) return window[name];
      return Function("try{return typeof " + name + " !== 'undefined' ? " + name + " : undefined}catch(e){return undefined}")();
    } catch(e) {
      return undefined;
    }
  }

  function getDb(){
    try {
      if (typeof getDbAppBraga === "function") return getDbAppBraga();
    } catch(e) {}
    return window.db || (window.firebase && firebase.firestore ? firebase.firestore() : null);
  }

  function readCache(key){
    try { return JSON.parse(localStorage.getItem(key) || "[]") || []; }
    catch(e) { return []; }
  }

  function writeCache(key, data){
    try { localStorage.setItem(key, JSON.stringify(Array.isArray(data) ? data.slice(0, 500) : [])); }
    catch(e) {}
  }

  function sortRecent(arr){
    return (Array.isArray(arr) ? arr : []).slice().sort((a,b) => dateMs(b) - dateMs(a));
  }

  function getStock(){
    const direct = window.__stockFuturistaStock;
    if (Array.isArray(direct)) return direct;
    const legacy = globalValue("stockGlobal");
    if (Array.isArray(legacy)) return legacy;
    return readCache(STOCK_CACHE_KEY);
  }

  function getHistorico(){
    const direct = window.__stockFuturistaHistorico;
    if (Array.isArray(direct)) return direct;
    const legacy = globalValue("historicoGlobal");
    if (Array.isArray(legacy)) return legacy;
    return readCache(HIST_CACHE_KEY);
  }

  function getLabels(){
    const direct = window.__stockFuturistaEtiquetas;
    if (Array.isArray(direct)) return direct;
    const legacy = globalValue("etiquetasWordGlobal");
    if (Array.isArray(legacy)) return legacy;
    return readCache(LABEL_CACHE_KEY);
  }

  function dateMs(v){
    if (!v) return 0;
    if (typeof v === "number") return v;
    if (v && typeof v.toMillis === "function") return v.toMillis();
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

  function fmtDate(v){
    if (!v) return "—";
    if (v && typeof v.toDate === "function") {
      try { return v.toDate().toLocaleDateString("pt-PT"); } catch(e) {}
    }
    if (v && v.seconds) {
      try { return new Date(v.seconds * 1000).toLocaleDateString("pt-PT"); } catch(e) {}
    }
    const raw = String(v || "").trim();
    if (!raw) return "—";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y,m,d] = raw.split("-");
      return `${d}/${m}/${y}`;
    }
    return raw;
  }

  function isToday(v){
    const ms = dateMs(v);
    if (!ms) return false;
    const a = new Date(ms);
    const b = new Date();
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function colorName(item){
    const raw = [item?.cor,item?.color,item?.nome,item?.modelo,item?.equipamento,item?.referencia,item?.codigoEtiqueta,item?.idInterno].join(" ");
    const n = norm(raw);
    if (n.includes("ciano") || n.includes("cyan") || n.includes("azul")) return "Ciano";
    if (n.includes("magenta") || n.includes("vermelho")) return "Magenta";
    if (n.includes("amarelo") || n.includes("yellow")) return "Amarelo";
    return "Preto";
  }

  function colorCls(c){
    const n = norm(c);
    if (n.includes("ciano") || n.includes("azul")) return "ciano";
    if (n.includes("magenta") || n.includes("vermelho")) return "magenta";
    if (n.includes("amarelo")) return "amarelo";
    return "preto";
  }

  function qty(item){
    const fields = ["quantidade","qtd","stock","total","unidades","disponivel","count"];
    for (const f of fields) {
      const raw = item?.[f];
      if (raw === null || typeof raw === "undefined" || raw === "") continue;
      const n = Number(String(raw).replace(",", ".").replace(/[^0-9.-]/g,""));
      if (Number.isFinite(n)) return Math.max(0, Math.round(n));
    }
    return 1;
  }

  function refOf(item){
    return item?.referencia || item?.ref || item?.sdsRef || item?.lote || item?.codigoEtiqueta || item?.idInterno || item?.idDoc || "—";
  }

  function equipOf(item){
    return item?.equipamento || item?.modelo || item?.nome || "Toner";
  }

  function localOf(item){
    return item?.localizacao || item?.local || item?.armazem || "Sem localização";
  }

  function dateOf(item){
    return item?.data || item?.dataScan || item?.dataEtiqueta || item?.dataFolha || item?.createdAt || item?.created || item?.createdAtMs || "—";
  }

  function getItemId(item){
    return item?.idDoc || item?.firebaseId || item?.id || "";
  }

  function statusFor(q){
    if (q <= 0) return ["Sem stock", "zero"];
    if (q <= 5) return ["Baixo", "low"];
    return ["Disponível", "ok"];
  }

  function stockSearchBlob(item){
    return norm([
      equipOf(item), refOf(item), localOf(item), item?.codigoEtiqueta, item?.codigoScan,
      item?.lote, item?.sdsRef, item?.idInterno, item?.serie, item?.armazem
    ].join(" "));
  }

  function filteredStock(){
    const q = norm(byId("search")?.value || "");
    const armazem = byId("stockFilterArmazem")?.value || "";
    const cor = byId("stockFilterCor")?.value || "";
    return getStock().filter(item => {
      const itemColor = colorName(item);
      return (!q || stockSearchBlob(item).includes(q)) &&
        (!armazem || localOf(item) === armazem || item?.armazem === armazem) &&
        (!cor || norm(itemColor).includes(norm(cor)) || norm(cor).includes(norm(itemColor)));
    });
  }

  function renderArmazens(items){
    const sel = byId("stockFilterArmazem");
    if (!sel) return;
    const current = sel.value;
    const locais = [...new Set((items || getStock()).map(localOf).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt"));
    const html = '<option value="">Todos os armazéns</option>' + locais.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join("");
    if (sel.dataset.stockOptionsHtml !== html) {
      sel.innerHTML = html;
      sel.dataset.stockOptionsHtml = html;
    }
    sel.value = locais.includes(current) ? current : current;
  }

  function renderKPIs(items){
    const all = getStock();
    const totalUnits = all.reduce((a,b)=>a+qty(b),0);
    const low = all.filter(i => qty(i) > 0 && qty(i) <= 5).length;
    const zero = all.filter(i => qty(i) <= 0).length;
    const entradasHoje = all.filter(i => isToday(dateOf(i))).reduce((a,b)=>a+qty(b),0);
    const hist = getHistorico();
    const saidasHoje = hist.filter(i => isToday(i?.usadoAt) || isToday(i?.created) || isToday(i?.createdAt) || isToday(dateOf(i))).length;
    const labels = getLabels();
    const etiquetas = labels.length || all.filter(i => i?.codigoEtiqueta).length;

    const set = (id, val) => { const el = byId(id); if (el) el.textContent = val; };
    set("stockKpiTotal", totalUnits);
    set("stockKpiBaixo", low);
    set("stockKpiSemStock", zero);
    set("stockKpiEntradasHoje", entradasHoje);
    set("stockKpiSaidasHoje", saidasHoje);
    set("stockKpiEtiquetas", etiquetas);
    set("countStock", String(all.length));
  }

  function renderTable(items){
    const tbody = byId("stockTableBody");
    if (!tbody) return;

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="stock-empty-row">Sem toners em stock para os filtros atuais.</td></tr>';
      const info = byId("stockTableInfo");
      if (info) info.textContent = "Mostrando 0 referências";
      return;
    }

    tbody.innerHTML = items.slice(0, 50).map(item => {
      const id = getItemId(item);
      const q = qty(item);
      const [label, cls] = statusFor(q);
      const color = colorName(item);
      return `<tr data-stock-id="${esc(id)}">
        <td><span class="stock-color-dot ${colorCls(color)}"></span>${esc(color)}</td>
        <td><strong>${esc(equipOf(item))}</strong></td>
        <td>${esc(refOf(item))}</td>
        <td>${esc(localOf(item))}</td>
        <td><strong>${q}</strong> un.</td>
        <td><span class="stock-status ${cls}">${esc(label)}</span></td>
        <td>${esc(fmtDate(dateOf(item)))}</td>
        <td>
          <div class="stock-actions">
            <button class="stock-action-icon" type="button" data-stock-action="view" data-id="${esc(id)}" title="Ver ficha">👁</button>
            <button class="stock-action-icon" type="button" data-stock-action="use" data-id="${esc(id)}" title="Marcar usado">↩</button>
            <button class="stock-action-icon" type="button" data-stock-action="edit" data-id="${esc(id)}" title="Editar">✎</button>
            <button class="stock-action-icon" type="button" data-stock-action="delete" data-id="${esc(id)}" title="Apagar">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join("");

    const info = byId("stockTableInfo");
    if (info) info.textContent = `Mostrando 1 a ${Math.min(items.length, 50)} de ${items.length} referências`;
  }

  function renderAlerts(items){
    const host = byId("stockAlertsList");
    if (!host) return;
    // v1.58.61: alertas de stock só aparecem quando a quantidade é 0.
    // Stock baixo continua visível no KPI/estado da tabela, mas não entra neste card.
    const alerts = getStock().filter(i => qty(i) <= 0).sort((a,b)=>qty(a)-qty(b)).slice(0, 5);
    if (!alerts.length) {
      host.innerHTML = '<div class="stock-alert"><span class="stock-alert-dot"></span><span>Sem artigos sem stock neste momento</span><small>OK</small></div>';
      return;
    }
    host.innerHTML = alerts.map(item => `<div class="stock-alert crit">
      <span class="stock-alert-dot"></span>
      <span>${esc(colorName(item))} — ${esc(equipOf(item))} — ${esc(localOf(item))}</span>
      <small>Sem stock</small>
    </div>`).join("");
  }

  function renderColorBars(items){
    const host = byId("stockColorBars");
    if (!host) return;
    const counts = {Preto:0, Ciano:0, Magenta:0, Amarelo:0};
    getStock().forEach(item => { counts[colorName(item)] += qty(item); });
    const max = Math.max(1, ...Object.values(counts));
    host.innerHTML = Object.entries(counts).map(([color,val]) => {
      const w = val <= 0 ? 0 : Math.max(4, Math.round((val / max) * 100));
      return `<div class="stock-bar">
        <span>${esc(color)}</span>
        <span class="stock-bar-line"><span class="stock-bar-fill ${colorCls(color)}" style="width:${w}%"></span></span>
        <strong>${val} un.</strong>
      </div>`;
    }).join("");
  }

  function movementRows(){
    const entradas = sortRecent(getStock()).slice(0, 8).map(i => ({
      data: fmtDate(dateOf(i)), tipo: "Entrada", cor: colorName(i), ref: refOf(i),
      quantidade: qty(i), local: localOf(i), user: i?.user || i?.utilizador || "Sistema"
    }));
    const saidas = sortRecent(getHistorico()).slice(0, 8).map(i => ({
      data: fmtDate(i?.usadoAt || i?.created || i?.createdAt || dateOf(i)), tipo: "Saída", cor: colorName(i), ref: refOf(i),
      quantidade: qty(i), local: localOf(i), user: i?.user || i?.utilizador || "Sistema"
    }));
    return [...entradas, ...saidas].sort((a,b)=>dateMs(b.data)-dateMs(a.data)).slice(0, 10);
  }

  function renderMovements(){
    const host = byId("stockMovementsBody");
    if (!host) return;
    const rows = movementRows();
    if (!rows.length) {
      host.innerHTML = '<tr><td colspan="7" class="stock-empty-row">Sem movimentos recentes.</td></tr>';
      return;
    }
    host.innerHTML = rows.map(m => `<tr>
      <td>${esc(m.data || "—")}</td>
      <td><span class="stock-status ${m.tipo === "Entrada" ? "ok" : "low"}">${esc(m.tipo)}</span></td>
      <td><span class="stock-color-dot ${colorCls(m.cor)}"></span>${esc(m.cor)}</td>
      <td>${esc(m.ref)}</td>
      <td>${esc(m.quantidade)} un.</td>
      <td>${esc(m.local)}</td>
      <td>${esc(m.user)}</td>
    </tr>`).join("");
  }

  function buildLabelFromStock(item){
    return {
      idDoc: getItemId(item),
      codigoEtiqueta: item?.codigoEtiqueta || refOf(item),
      codigoScan: item?.codigoScan || item?.codigoEtiqueta || "",
      localCurto: item?.localCurto || localOf(item),
      localizacao: localOf(item),
      equipamento: equipOf(item),
      cor: colorName(item),
      lote: item?.lote || "",
      sdsRef: item?.sdsRef || "",
      serie: item?.serie || "",
      armazem: item?.armazem || "",
      data: item?.data || item?.dataFolha || "",
      origem: "Stock"
    };
  }

  function renderLabels(){
    const host = byId("stockLabelsList");
    if (!host) return;
    const labels = sortRecent(getLabels());
    const fallback = sortRecent(getStock()).filter(i => i?.codigoEtiqueta || i?.sdsRef || i?.lote).map(buildLabelFromStock);
    const list = (labels.length ? labels : fallback).slice(0, 4);
    if (!list.length) {
      host.innerHTML = '<div class="stock-label-row"><strong>Sem etiquetas recentes</strong><span>—</span><span>—</span><span></span></div>';
      return;
    }

    host.innerHTML = list.map(item => {
      const id = getItemId(item);
      const code = item?.codigoEtiqueta || item?.codigoScan || item?.sdsRef || item?.lote || "Etiqueta";
      const name = item?.titulo || item?.nome || `Etiquetas Toner — ${code}.docx`;
      const date = fmtDate(item?.created || item?.createdAt || item?.createdAtMs || item?.data || item?.dataFolha);
      return `<div class="stock-label-row" data-label-id="${esc(id)}">
        <strong>${esc(name)}</strong>
        <span>${esc(code)}</span>
        <span>${esc(date)}</span>
        <span class="stock-label-actions">
          <button type="button" data-label-action="print" data-id="${esc(id)}" onclick="window.stockFuturistaImprimirEtiqueta && window.stockFuturistaImprimirEtiqueta('${esc(id)}')" title="Imprimir">🖨</button>
          <button type="button" data-label-action="open" data-id="${esc(id)}" onclick="window.stockFuturistaAbrirEtiquetas && window.stockFuturistaAbrirEtiquetas()" title="Abrir etiquetas">↗</button>
        </span>
      </div>`;
    }).join("");
  }

  function alinharEtiquetasComMovimentos(){
    const movements = document.querySelector(".stock-movements-wide");
    const labels = document.querySelector(".stock-labels-panel");
    if (!movements || !labels) return;
    const isStacked = window.matchMedia("(max-width: 1500px)").matches;
    if (isStacked) {
      labels.style.setProperty("--stock-labels-align-offset", "0px");
      return;
    }
    labels.style.setProperty("--stock-labels-align-offset", "0px");
    requestAnimationFrame(() => {
      const delta = Math.round(movements.getBoundingClientRect().top - labels.getBoundingClientRect().top);
      labels.style.setProperty("--stock-labels-align-offset", Math.max(0, delta) + "px");
    });
  }

  function renderAll(){
    const all = getStock();
    renderArmazens(all);
    const items = filteredStock();
    renderKPIs(items);
    renderTable(items);
    renderAlerts(items);
    renderColorBars(items);
    renderMovements();
    renderLabels();
    alinharEtiquetasComMovimentos();
  }

  function showMsg(msg, type){
    if (typeof mostrarMensagem === "function") return mostrarMensagem(msg, type || "sucesso");
    if (type === "erro") alert(msg);
    else console.log(msg);
  }

  async function fallbackUsar(id){
    const db = getDb();
    if (!db) return showMsg("Firebase indisponível.", "erro");
    const ref = db.collection("stock").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return showMsg("Toner não encontrado.", "erro");
    await db.collection("historico").add({
      ...snap.data(),
      estado: "usado",
      usadoAt: new Date(),
      stockDocId: id,
      created: new Date()
    });
    await ref.delete();
    showMsg("Toner movido para histórico.");
  }

  async function fallbackDelete(id){
    if (!confirm("Queres apagar este item do stock?")) return;
    const db = getDb();
    if (!db) return showMsg("Firebase indisponível.", "erro");
    await db.collection("stock").doc(id).delete();
    showMsg("Item de stock apagado.");
  }

  function fallbackEdit(id){
    const item = getStock().find(x => getItemId(x) === id);
    if (!item) return showMsg("Item de stock não encontrado.", "erro");
    try { localStorage.setItem("editarToner", JSON.stringify(item)); } catch(e) {}
    window.location.href = "add-toner.html";
  }

  function abrirFicha(id){
    const item = getStock().find(x => getItemId(x) === id);
    if (!item) return showMsg("Item de stock não encontrado.", "erro");
    const old = globalValue("equipmentFichaLinkAppBraga");
    if (typeof old === "function") {
      // Como a função antiga devolve link HTML, o fallback mais seguro é abrir edição/modal.
      if (typeof window.abrirEditarStockModal === "function") return window.abrirEditarStockModal(id);
    }
    if (typeof window.abrirEditarStockModal === "function") return window.abrirEditarStockModal(id);
    fallbackEdit(id);
  }

  function findLabelOrStock(id){
    const label = getLabels().find(x => getItemId(x) === id || x?.codigoEtiqueta === id || x?.codigoScan === id);
    if (label) return { item: label, source: "label" };
    const stock = getStock().find(x => getItemId(x) === id || x?.codigoEtiqueta === id || x?.codigoScan === id || refOf(x) === id);
    if (stock) return { item: buildLabelFromStock(stock), source: "stock" };
    return { item: null, source: "none" };
  }

  function labelRowsHtml(item){
    const rows = [
      ["Local", item?.localCurto || item?.localizacao],
      ["Série", item?.serie],
      ["Armazém", item?.armazem],
      ["Equipamento", item?.equipamento],
      ["Cor", item?.cor],
      ["Lote", item?.lote],
      ["SDS Ref", item?.sdsRef],
      ["Data", item?.dataScan || item?.dataEtiqueta || item?.data || item?.dataFolha],
      ["Origem", item?.origem || "Stock"]
    ].filter(([,v]) => String(v || "").trim());
    return rows.map(([k,v]) => `<div class="stock-print-label-row"><strong>${esc(k)}</strong><span>${esc(v)}</span></div>`).join("");
  }

  function printLabelLocal(item){
    const old = document.getElementById("stockFuturistaPrintOverlay");
    if (old) old.remove();

    const code = item?.codigoScan || item?.codigoEtiqueta || item?.sdsRef || item?.lote || item?.idDoc || "";
    const title = item?.titulo || item?.nome || item?.localCurto || item?.localizacao || "Etiqueta Toner";
    const overlay = document.createElement("div");
    overlay.id = "stockFuturistaPrintOverlay";
    overlay.innerHTML = `
      <style>
        #stockFuturistaPrintOverlay{position:fixed;inset:0;background:#fff;z-index:999999;display:flex;align-items:center;justify-content:center;color:#111;font-family:Arial,sans-serif;}
        #stockFuturistaPrintOverlay .stock-print-label{width:100mm;min-height:70mm;border:2px solid #111;border-radius:5mm;padding:8mm;position:relative;background:#fff;}
        #stockFuturistaPrintOverlay .stock-print-title{font-size:20px;font-weight:900;margin-bottom:5mm;}
        #stockFuturistaPrintOverlay .stock-print-label-row{display:grid;grid-template-columns:28mm 1fr;gap:4mm;border-bottom:1px solid #ddd;padding:2mm 0;font-size:13px;}
        #stockFuturistaPrintOverlay .stock-print-code{margin-top:5mm;font-size:11px;font-weight:900;word-break:break-all;}
        #stockFuturistaPrintOverlay .stock-print-close{position:fixed;right:18px;top:18px;border:0;border-radius:10px;background:#111;color:#fff;padding:10px 14px;font-weight:900;cursor:pointer;}
        @media print{
          @page{size:100mm 150mm;margin:0;}
          body>*:not(#stockFuturistaPrintOverlay){display:none!important;}
          #stockFuturistaPrintOverlay{position:fixed!important;inset:0!important;display:block!important;background:#fff!important;}
          #stockFuturistaPrintOverlay .stock-print-close{display:none!important;}
          #stockFuturistaPrintOverlay .stock-print-label{width:100mm;min-height:70mm;border:0;border-radius:0;margin:0;padding:8mm;box-sizing:border-box;}
        }
      </style>
      <button class="stock-print-close" type="button">Fechar</button>
      <div class="stock-print-label">
        <div class="stock-print-title">${esc(title)}</div>
        ${labelRowsHtml(item)}
        ${code ? `<div class="stock-print-code">${esc(code)}</div>` : ""}
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".stock-print-close")?.addEventListener("click", () => overlay.remove());

    setTimeout(() => {
      try { window.print(); }
      catch(e) { console.error(e); showMsg("Erro ao abrir impressão da etiqueta.", "erro"); }
      setTimeout(() => { try { overlay.remove(); } catch(e) {} }, 900);
    }, 150);
  }

  async function printLabel(id){
    const found = findLabelOrStock(id);
    if (!found.item) {
      showMsg("Etiqueta não encontrada. Vou abrir a página Etiquetas Word.", "erro");
      window.location.href = "etiquetas-word.html";
      return;
    }

    // Se o sistema antigo estiver pronto e a etiqueta estiver na lista antiga, usa-o.
    try {
      const oldLabels = globalValue("etiquetasWordGlobal");
      const existsInOld = Array.isArray(oldLabels) && oldLabels.some(x => getItemId(x) === id);
      if (existsInOld && typeof window.regerarEtiquetaWordPartilhada === "function") {
        return window.regerarEtiquetaWordPartilhada(id);
      }
    } catch(e) {}

    // Fallback próprio da página Stock: funciona mesmo sem abrir etiquetas-word.html.
    printLabelLocal(found.item);
  }

  function openLabelsPage(){
    window.location.href = "etiquetas-word.html";
  }

  window.stockFuturistaImprimirEtiqueta = printLabel;
  window.stockFuturistaAbrirEtiquetas = openLabelsPage;

  function bindActions(){
    document.addEventListener("click", async (ev) => {
      const actionBtn = ev.target.closest("[data-stock-action]");
      if (actionBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        const id = actionBtn.dataset.id || "";
        const action = actionBtn.dataset.stockAction;
        try {
          if (action === "view") return abrirFicha(id);
          if (action === "edit") {
            if (typeof window.abrirEditarStockModal === "function") return window.abrirEditarStockModal(id);
            return fallbackEdit(id);
          }
          if (action === "use") {
            if (typeof window.usar === "function") return window.usar(id);
            return fallbackUsar(id);
          }
          if (action === "delete") {
            if (typeof window.apagarStockItem === "function") return window.apagarStockItem(id);
            return fallbackDelete(id);
          }
        } catch(e) {
          console.error(e);
          showMsg("Erro ao executar ação do stock.", "erro");
        }
      }

      const labelBtn = ev.target.closest("[data-label-action]");
      if (labelBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        const id = labelBtn.dataset.id || "";
        if (labelBtn.dataset.labelAction === "print") return printLabel(id);
        return openLabelsPage();
      }
    }, true);
  }

  function bindFilters(){
    ["search","stockFilterArmazem","stockFilterCor"].forEach(id => {
      const el = byId(id);
      if (!el || el.dataset.stockFuturistaBound === "1") return;
      el.dataset.stockFuturistaBound = "1";
      el.addEventListener("input", renderAll);
      el.addEventListener("change", renderAll);
    });
  }

  function overrideLegacyRenderers(){
    const oldRenderStock = window.renderStockCards;
    window.renderStockCards = function(items){
      if (Array.isArray(items)) {
        window.__stockFuturistaStock = items;
        writeCache(STOCK_CACHE_KEY, items);
      }
      renderAll();
      // Não chamar o renderer antigo porque a página nova usa tabela própria.
      return true;
    };

    const oldFiltrar = window.filtrar;
    window.filtrar = function(){
      renderAll();
      // Só chama o antigo se houver a lista antiga visível.
      const legacy = byId("listaStock");
      if (legacy && legacy.offsetParent && typeof oldFiltrar === "function") {
        try { return oldFiltrar(); } catch(e) {}
      }
      return true;
    };
  }

  function bindRealtime(collectionName, cacheKey, globalName){
    const db = getDb();
    if (!db || !db.collection) return null;
    try {
      return db.collection(collectionName).onSnapshot((snap) => {
        const arr = [];
        snap.forEach((doc) => arr.push({ firebaseId: doc.id, idDoc: doc.id, ...doc.data() }));
        window[globalName] = sortRecent(arr);
        writeCache(cacheKey, window[globalName]);
        renderAll();
      }, (error) => {
        console.warn("Stock futurista realtime:", collectionName, error);
        window[globalName] = readCache(cacheKey);
        renderAll();
      });
    } catch(e) {
      console.warn("Stock futurista realtime bind:", collectionName, e);
      return null;
    }
  }

  function startRealtimeFallback(){
    // O listener principal de stock já existe no app.js, mas este fallback garante
    // que a página Stock continua funcional mesmo que o renderer antigo não dispare.
    if (window.__stockFuturistaRealtimeStarted) return;
    window.__stockFuturistaRealtimeStarted = true;

    setTimeout(() => {
      bindRealtime("stock", STOCK_CACHE_KEY, "__stockFuturistaStock");
      bindRealtime("historico", HIST_CACHE_KEY, "__stockFuturistaHistorico");
      bindRealtime("etiquetasWord", LABEL_CACHE_KEY, "__stockFuturistaEtiquetas");
    }, 600);
  }

  window.filtrarStockFuturista = renderAll;
  window.limparFiltrosStockFuturista = function(){
    if (byId("search")) byId("search").value = "";
    if (byId("stockFilterArmazem")) byId("stockFilterArmazem").value = "";
    if (byId("stockFilterCor")) byId("stockFilterCor").value = "";
    renderAll();
  };
  window.renderStockFuturista = renderAll;

  function bind(){
    overrideLegacyRenderers();
    bindFilters();
    bindActions();
    startRealtimeFallback();
    renderAll();
    setTimeout(renderAll, 300);
    setTimeout(renderAll, 1200);
    setTimeout(renderAll, 2600);
    setInterval(renderAll, 5000);
  }

  window.addEventListener("resize", () => {
    clearTimeout(window.__stockAlignResizeTimer);
    window.__stockAlignResizeTimer = setTimeout(alinharEtiquetasComMovimentos, 120);
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
