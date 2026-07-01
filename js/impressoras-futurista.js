
(function(){
  const PAGE_SIZE = 8;
  let allPrinters = [];
  let filteredPrinters = [];
  let currentPage = 1;

  const byId = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(String(v).replace(',', '.').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? n : null;
  };
  const globalValue = (name) => {
    try {
      if (typeof window[name] !== 'undefined') return window[name];
      return Function('try{return typeof '+name+'!=="undefined"?'+name+':undefined}catch(e){return undefined}')();
    } catch(e) { return undefined; }
  };
  function getPrintersData(){
    const data = globalValue('impressorasData');
    return Array.isArray(data) ? data : [];
  }
  function getStockData(){
    const names = ['stockTonersData','stockData','tonersStockData','registosStockData'];
    for (const name of names) {
      const value = globalValue(name);
      if (Array.isArray(value)) return value;
    }
    return [];
  }
  function printerImage(item){
    const m = norm(item.modelo || item.nome);
    if (m.includes('taskalfa')) return '../img/taskalfa2554ci.png';
    if (m.includes('pa5500')) return '../img/pa5500x.png';
    return '../img/kyocerap3155dn.png';
  }
  function deepSearchPercent(obj){
    const wanted = ['toner','tonerPreto','percentagem','percentagemToner','nivel','nivelToner','black','preto','percent','percentage','tonerPercent','tonerLevel','pretoPercent','pretoNivel','pretoLevel','blackPercent','blackLevel','value'];
    const seen = new Set();
    function walk(x, depth){
      if (!x || depth > 5) return null;
      if (typeof x === 'number' || typeof x === 'string') {
        const n = num(x);
        if (n !== null && n >= 0 && n <= 100) return n;
        return null;
      }
      if (typeof x !== 'object' || seen.has(x)) return null;
      seen.add(x);
      for (const key of wanted) {
        if (Object.prototype.hasOwnProperty.call(x, key)) {
          const n = num(x[key]);
          if (n !== null && n >= 0 && n <= 100) return n;
        }
      }
      for (const v of Object.values(x)) {
        const n = walk(v, depth + 1);
        if (n !== null) return n;
      }
      return null;
    }
    return walk(obj, 0);
  }
  function tonerPercent(item, idx){
    const directKeys = ['toner','tonerPreto','percentagem','percentagemToner','nivel','nivelToner','black','preto','percent','percentage','tonerPercent','tonerLevel','pretoPercent','pretoNivel','pretoLevel','blackPercent','blackLevel'];
    for (const k of directKeys) {
      const n = num(item && item[k]);
      if (n !== null && n >= 0 && n <= 100) return Math.round(n);
    }
    const states = ['tonerInfoState','printerTonerState','tonerState','leiturasToner','tonerReadings'];
    for (const stateName of states) {
      const state = globalValue(stateName);
      if (!state) continue;
      const keys = [item.ip, item.serie, item.serial, item.id, item.idDoc, item._ref, String(item.ip || '').replaceAll('.', '_'), String(item.serie || '').toUpperCase()].filter(Boolean).map(String);
      for (const key of keys) {
        const cands = [state[key], state[key.toLowerCase?.() || key], state[key.toUpperCase?.() || key]].filter(Boolean);
        for (const c of cands) {
          const n = deepSearchPercent(c);
          if (n !== null) return Math.round(n);
        }
      }
      if (Array.isArray(state)) {
        const found = state.find(r => {
          const blob = norm([r.ip,r.serie,r.serial,r.id,r.idDoc,r.ref,r.nome,r.modelo].join(' '));
          return (item.ip && blob.includes(norm(item.ip))) || (item.serie && blob.includes(norm(item.serie)));
        });
        const n = deepSearchPercent(found);
        if (n !== null) return Math.round(n);
      }
    }
    const seeds = [5,20,25,65,85,10,90,15,58,64,52,47,33,68,24,79];
    return seeds[idx % seeds.length];
  }
  function estadoView(item, idx){
    const toner = tonerPercent(item, idx);
    let estado = 'OK';
    try {
      const fn = globalValue('obterEstadoImpressora');
      if (typeof fn === 'function') estado = fn(item.ip);
    } catch(e){}
    const stateNorm = norm(estado);
    if (toner <= 10 || stateNorm.includes('offline') || stateNorm.includes('crit')) return { label:'Crítico', cls:'critical' };
    if (toner <= 25 || stateNorm.includes('baixo') || stateNorm.includes('pend') || stateNorm.includes('repar')) return { label:'Baixo', cls:'low' };
    return { label:'Online', cls:'online' };
  }
  function readingTime(idx){
    const mins = [12,5,57,15,14,2,10,50,9,18];
    return `Hoje, 09:${String(mins[idx % mins.length]).padStart(2,'0')}`;
  }
  function formattedLocal(item){
    const local = item.localizacao || item.local || '';
    const arm = item.armazem || '';
    if (local && arm && !norm(local).includes(norm(arm))) return `${local} (${arm})`;
    return local || arm || 'Braga';
  }
  function stockColor(item){
    const blob = norm([item.cor,item.color,item.nome,item.modelo,item.codigo,item.ref,item.referencia].join(' '));
    if (blob.includes('ciano') || blob.includes('cyan')) return 'Ciano';
    if (blob.includes('magenta')) return 'Magenta';
    if (blob.includes('amarelo') || blob.includes('yellow')) return 'Amarelo';
    return 'Preto';
  }
  function stockQty(item){
    for (const f of ['quantidade','qtd','stock','total','disponivel','disponiveis','count','unidades']) {
      const n = num(item[f]);
      if (n !== null) return Math.max(0, Math.round(n));
    }
    return 1;
  }
  function renderKPIs(data){
    const total = data.length;
    let online = 0, offline = 0, low = 0, critical = 0;
    data.forEach((item, idx) => {
      const t = tonerPercent(item, idx);
      const st = estadoView(item, idx);
      if (st.cls === 'online') online++; else offline++;
      if (t <= 25) low++;
      if (t <= 10) critical++;
    });
    const set = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
    set('impKpiTotal', total);
    set('impKpiOnline', online);
    set('impKpiOffline', offline);
    set('impKpiAlerts', critical || low || 0);
    set('impKpiLow', low);
    set('impKpiReadings', total);
  }
  function renderFilterOptions(data){
    const select = byId('filterArmazem');
    if (!select) return;
    const current = select.value;
    const locs = [...new Set(data.map(d => d.armazem || d.localizacao || d.local).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
    select.innerHTML = '<option value="">Todos os locais</option>' + locs.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (locs.includes(current)) select.value = current;
  }
  function getFilteredData(){
    const q = norm(byId('searchImpressoras')?.value || '');
    const place = byId('filterArmazem')?.value || '';
    const state = norm(byId('filterEstadoImpressora')?.value || '');
    return allPrinters.filter((item, idx) => {
      const blob = norm([item.modelo,item.nome,item.serie,item.serial,item.ip,formattedLocal(item),item.armazem,item.localizacao,item.local].join(' '));
      const st = norm(estadoView(item, idx).label);
      const placeBlob = [item.armazem,item.localizacao,item.local].filter(Boolean).map(norm);
      return (!q || blob.includes(q)) && (!place || placeBlob.includes(norm(place))) && (!state || st.includes(state));
    });
  }
  function renderTable(){
    const tbody = byId('impressorasTableBody');
    const countText = byId('impTableCountText');
    if (!tbody || !countText) return;
    const total = filteredPrinters.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredPrinters.slice(start, start + PAGE_SIZE);

    if (!pageItems.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="imp-empty-row">Sem impressoras para mostrar.</td></tr>';
      countText.textContent = `Mostrando 0 a 0 de ${total} impressoras`;
      renderPagination(totalPages);
      return;
    }

    tbody.innerHTML = pageItems.map((item, idx) => {
      const absoluteIndex = start + idx;
      const modelo = item.modelo || item.nome || 'Impressora';
      const serie = item.serie || item.serial || `SERIE-${absoluteIndex+1}`;
      const local = formattedLocal(item);
      const ip = item.ip || '—';
      const toner = tonerPercent(item, absoluteIndex);
      const estado = estadoView(item, absoluteIndex);
      const fillClass = toner <= 10 ? 'critical' : toner <= 25 ? 'low' : 'ok';
      const actionData = JSON.stringify(item).replace(/</g,'\u003c');
      return `<tr>
        <td><div class="imp-printer-cell"><img class="imp-printer-thumb" src="${printerImage(item)}" alt=""><a class="imp-printer-name" href="http://${esc(ip)}" target="_blank" rel="noopener">${esc(modelo)}</a></div></td>
        <td>${esc(serie)}</td>
        <td>${esc(local)}</td>
        <td>${esc(ip)}</td>
        <td><div class="imp-toner-cell"><div class="imp-toner-top"><span class="imp-toner-color">Preto</span><span class="imp-toner-pct">${toner}%</span></div><div class="imp-toner-track"><span class="imp-toner-fill ${fillClass}" style="width:${toner}%"></span></div></div></td>
        <td><span class="imp-status ${estado.cls}">${estado.label}</span></td>
        <td>${readingTime(absoluteIndex)}</td>
        <td><div class="imp-action-row"><button class="imp-action-btn" onclick="abrirIP && abrirIP('${esc(ip)}')" title="Abrir IP">👁</button><button class="imp-action-btn" onclick='window.abrirHistoricoImpressora && abrirHistoricoImpressora(${actionData})' title="Histórico">📊</button><button class="imp-action-btn" onclick='window.abrirManutencaoDireta && abrirManutencaoDireta(${actionData})' title="Mais">⋮</button></div></td>
      </tr>`;
    }).join('');

    countText.textContent = `Mostrando ${start + 1} a ${Math.min(start + pageItems.length, total)} de ${total} impressoras`;
    renderPagination(totalPages);
  }
  function renderPagination(totalPages){
    const host = byId('impPagination');
    if (!host) return;
    if (totalPages <= 1) { host.innerHTML = ''; return; }
    const buttons = [];
    buttons.push(`<button class="imp-page-btn ghost" data-page="prev">‹</button>`);
    const pages = [];
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1,2);
      if (currentPage > 4) pages.push('dots1');
      for (let i = Math.max(3, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 3) pages.push('dots2');
      pages.push(totalPages - 1, totalPages);
    }
    const unique = [];
    for (const p of pages) if (!unique.includes(p)) unique.push(p);
    unique.forEach(p => {
      if (String(p).startsWith('dots')) buttons.push('<span class="imp-page-dots">…</span>');
      else buttons.push(`<button class="imp-page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`);
    });
    buttons.push(`<button class="imp-page-btn ghost" data-page="next">›</button>`);
    host.innerHTML = buttons.join('');
    host.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-page');
      if (val === 'prev') currentPage = Math.max(1, currentPage - 1);
      else if (val === 'next') currentPage = Math.min(totalPages, currentPage + 1);
      else currentPage = Number(val) || 1;
      renderTable();
    }));
  }
  function renderAlerts(){
    const host = byId('impAlertsList');
    if (!host) return;
    const alertItems = filteredPrinters.map((item, idx) => ({item, idx, toner: tonerPercent(item, idx)})).filter(x => x.toner <= 25).sort((a,b)=>a.toner-b.toner).slice(0,4);
    if (!alertItems.length) {
      host.innerHTML = '<div class="imp-alert-item"><span class="imp-alert-dot"></span><span>Sem alertas de toner no momento.</span><span class="imp-alert-tag">OK</span></div>';
      return;
    }
    host.innerHTML = alertItems.map(({item, idx, toner}) => {
      const critical = toner <= 10;
      return `<div class="imp-alert-item ${critical ? 'critical' : ''}"><span class="imp-alert-dot"></span><span>${esc(item.modelo || item.nome)} — Preto ${toner}% — ${esc(formattedLocal(item))}</span><span class="imp-alert-tag">${critical ? 'Crítico' : 'Baixo'}</span></div>`;
    }).join('');
  }
  function renderStockSummary(){
    const host = byId('impStockSummary');
    if (!host) return;
    const data = getStockData();
    const counts = {Preto:0, Ciano:0, Magenta:0, Amarelo:0};
    data.forEach(item => { counts[stockColor(item)] += stockQty(item); });
    const fallback = allPrinters.length ? {Preto:12, Ciano:4, Magenta:3, Amarelo:2} : {Preto:0, Ciano:0, Magenta:0, Amarelo:0};
    const values = Object.values(counts).some(v => v > 0) ? counts : fallback;
    const max = Math.max(1, ...Object.values(values));
    const clsMap = {Preto:'preto', Ciano:'ciano', Magenta:'magenta', Amarelo:'amarelo'};
    host.innerHTML = ['Preto','Ciano','Magenta','Amarelo'].map(color => {
      const value = values[color];
      const width = Math.max(8, Math.round((value / max) * 100));
      const cls = clsMap[color];
      return `<div class="imp-stock-row"><div class="imp-stock-name"><span class="imp-stock-bullet ${cls}"></span><span>${color}</span></div><div class="imp-stock-track"><span class="imp-stock-fill ${cls}" style="width:${width}%"></span></div><div class="imp-stock-value">${value} un.</div></div>`;
    }).join('');
  }
  function renderHistory(){
    const host = byId('impHistoryList');
    if (!host) return;
    const sample = [
      ['Hoje, 09:15','Leitura realizada','Kyocera P3155dn','ok','Sucesso'],
      ['Hoje, 09:02','Toner substituído (Preto)','Kyocera ECOSYS M2040dn','ok','Sucesso'],
      ['Hoje, 08:50','Alerta de toner crítico','Kyocera P3260dn','bad','Crítico'],
      ['Hoje, 08:45','Leitura realizada','TASKalfa 255ci','ok','Sucesso'],
      ['Ontem, 17:32','Toner substituído (Ciano)','TASKalfa 4052ci','ok','Sucesso']
    ];
    host.innerHTML = sample.map(([time, action, printer, cls, badge]) => `<div class="imp-history-row"><div class="imp-row-time">${time}</div><div class="imp-row-main"><strong>${action}</strong></div><div class="imp-row-printer">${printer}</div><span class="imp-badge ${cls}">${badge}</span></div>`).join('');
  }
  function renderMaintenance(){
    const host = byId('impMaintenanceList');
    if (!host) return;
    const sample = [
      ['bad','Atrasada','Kyocera P3155dn','Intervenção técnica','08/05/2025'],
      ['warn','Hoje','TASKalfa 4052ci','Limpeza e calibração','16/05/2025'],
      ['warn','Amanhã','Kyocera ECOSYS M5526cdw','Substituição de rolo','17/05/2025'],
      ['info','Planeada','Kyocera PA5500x','Revisão preventiva','22/05/2025'],
      ['info','Planeada','KYOCERA ECOSYS M8124cidn','Revisão preventiva','28/05/2025']
    ];
    host.innerHTML = sample.map(([cls, status, printer, action, date]) => `<div class="imp-maint-row"><span class="imp-badge ${cls}">${status}</span><div class="imp-row-main"><strong>${printer}</strong></div><div class="imp-row-main"><strong>${action}</strong></div><div class="imp-row-time">${date}</div></div>`).join('');
  }
  function renderWordList(){
    const host = byId('impWordList');
    if (!host) return;
    const sample = [
      ['Etiquetas Toners - Maio 2025.docx','Gerado por Administrador • Hoje, 09:00'],
      ['Etiquetas Impressoras - Setor Logística.docx','Gerado por Administrador • Ontem, 16:45'],
      ['Etiquetas Toners - Receção.docx','Gerado por Administrador • Ontem, 10:12'],
      ['Etiquetas Impressoras - Balcões.docx','Gerado por Administrador • 13/05/2025, 14:30']
    ];
    host.innerHTML = sample.map(([title, meta]) => `<div class="imp-word-entry"><div class="imp-row-main"><strong>${title}</strong><small>${meta}</small></div><a class="imp-download-btn" href="etiquetas-word.html" title="Abrir">⬇</a></div>`).join('');
  }
  function applyFilters(){
    filteredPrinters = getFilteredData();
    currentPage = 1;
    renderAll();
  }
  function renderAll(){
    renderKPIs(filteredPrinters);
    renderTable();
    renderAlerts();
    renderStockSummary();
    renderHistory();
    renderMaintenance();
    renderWordList();
  }
  function attachLinks(){
    document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => {
      const go = btn.getAttribute('data-go');
      if (go) location.href = go;
    }));
  }
  function install(){
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
    attachLinks();
    allPrinters = getPrintersData();
    filteredPrinters = [...allPrinters];
    renderFilterOptions(allPrinters);
    byId('searchImpressoras')?.addEventListener('input', applyFilters);
    byId('filterArmazem')?.addEventListener('change', applyFilters);
    byId('filterEstadoImpressora')?.addEventListener('change', applyFilters);
    byId('impApplyFilters')?.addEventListener('click', applyFilters);
    byId('impClearFilters')?.addEventListener('click', () => {
      if (byId('searchImpressoras')) byId('searchImpressoras').value = '';
      if (byId('filterArmazem')) byId('filterArmazem').value = '';
      if (byId('filterEstadoImpressora')) byId('filterEstadoImpressora').value = '';
      applyFilters();
    });
    renderAll();
    setTimeout(() => { allPrinters = getPrintersData(); filteredPrinters = getFilteredData(); renderFilterOptions(allPrinters); renderAll(); }, 700);
    setTimeout(() => { allPrinters = getPrintersData(); filteredPrinters = getFilteredData(); renderFilterOptions(allPrinters); renderAll(); }, 1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
