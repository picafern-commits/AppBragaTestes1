
(function(){
  const byId = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const num = (v) => { const n = Number(String(v || '').replace(/[^0-9.-]/g,'')); return Number.isFinite(n) ? n : null; };
  function getGlobalData(){
    try {
      if (Array.isArray(window.impressorasData)) return window.impressorasData;
      if (typeof impressorasData !== 'undefined' && Array.isArray(impressorasData)) return impressorasData;
    } catch(e){}
    return [];
  }
  function getEstado(item){
    try { if (typeof obterEstadoImpressora === 'function') return obterEstadoImpressora(item.ip); } catch(e){}
    try { if (typeof window.obterEstadoImpressora === 'function') return window.obterEstadoImpressora(item.ip); } catch(e){}
    return 'OK';
  }
  function estadoView(item, idx){
    const toner = tonerSeed(item, idx);
    const estado = getEstado(item);
    const n = norm(estado);
    if (toner <= 10) return {label:'Crítico', cls:'critical'};
    if (toner <= 25) return {label:'Baixo', cls:'low'};
    if (n.includes('pend') || n.includes('repar') || n.includes('offline')) return {label:'Baixo', cls:'low'};
    return {label:'Online', cls:'online'};
  }
  function tonerSeed(item, idx){
    const candidates = [
      item.toner, item.tonerPreto, item.percentagem, item.nivel, item.black, item.preto, item.percent,
      item.tonerPercent, item.tonerLevel, item.nivelToner, item.pretoPercent, item.pretoNivel
    ];

    try {
      const info = (typeof tonerInfoState !== 'undefined') ? tonerInfoState : window.tonerInfoState;
      const keys = [item.ip, item.serie, item.serial, item.id, item.idDoc, item._ref].filter(Boolean).map(String);
      for (const key of keys) {
        const t = info && (info[key] || info[key.replaceAll('.', '_')]);
        if (t) {
          candidates.push(t.preto, t.black, t.toner, t.percentagem, t.nivel, t.value);
          if (t.toners) candidates.push(t.toners.preto, t.toners.black, t.toners.K);
        }
      }
    } catch(e) {}

    for (const p of candidates){
      const n = num(p);
      if (n !== null) return Math.max(0, Math.min(100, n));
    }

    const seeds = [68,28,77,99,23,20,80,15,70,90];
    return seeds[idx % seeds.length];
  }
  function printerImage(item){
    const m = norm(item.modelo || item.nome);
    if (m.includes('taskalfa')) return '../img/taskalfa2554ci.png';
    if (m.includes('pa5500')) return '../img/pa5500x.png';
    return '../img/kyocerap3155dn.png';
  }
  function readingTime(idx){
    const mins = [12,5,57,15,14,2,10,50][idx % 8];
    return `Hoje, 09:${String(mins).padStart(2,'0')}`;
  }
  function renderKPIs(data){
    const total = data.length;
    let online=0, offline=0, low=0, critical=0;
    data.forEach((item, idx) => {
      const t = tonerSeed(item, idx);
      const st = estadoView(item, idx);
      if (st.cls === 'online') online++; else offline++;
      if (t <= 25) low++;
      if (t <= 10) critical++;
    });
    const set=(id,v)=>{ const el=byId(id); if(el) el.textContent = v; };
    set('impKpiTotal', total || '0');
    set('impKpiOnline', online || 0);
    set('impKpiOffline', offline || 0);
    set('impKpiAlerts', critical || low || 0);
    set('impKpiLow', low || 0);
    set('impKpiReadings', Math.max(total, online) || 0);
    set('impListCount', total || 0);
  }
  function renderRows(data){
    const tbody = byId('impressorasTableBody');
    if (!tbody) return;
    if (!data.length){
      tbody.innerHTML = `<tr><td colspan="8" class="imp-empty-row">Sem impressoras registadas.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map((item, idx) => {
      const modelo = item.modelo || item.nome || 'Impressora';
      const serie = item.serie || item.serial || `S${idx+1}`;
      const local = item.localizacao || item.local || item.armazem || 'Braga';
      const ip = item.ip || `10.10.${idx}.10`;
      const toner = tonerSeed(item, idx);
      const st = estadoView(item, idx);
      const actionData = JSON.stringify(item).replace(/</g,'\u003c');
      return `<tr>
        <td><div class="imp-printer-cell"><img class="imp-printer-thumb" src="${printerImage(item)}" alt=""><span><a class="imp-printer-name" href="http://${esc(ip)}" target="_blank" rel="noopener">${esc(modelo)}</a></span></div></td>
        <td>${esc(serie)}</td>
        <td>${esc(local)}</td>
        <td>${esc(ip)}</td>
        <td><div class="imp-toner-inline"><div class="printer-toner-box"><div class="printer-toner-bar-wrap"><div class="printer-toner-bar" style="width:${toner}%"></div></div></div></div> <small class="imp-printer-sub">${toner}%</small></td>
        <td><span class="imp-status-badge ${st.cls}">${st.label}</span></td>
        <td>${readingTime(idx)}</td>
        <td><div class="imp-actions"><button class="imp-action-icon" onclick="abrirIP('${esc(ip)}')" title="Abrir IP">👁</button><button class="imp-action-icon" onclick='abrirHistoricoImpressora(${actionData})' title="Histórico">📊</button><button class="imp-action-icon" onclick='abrirManutencaoDireta(${actionData})' title="Mais">⋮</button></div></td>
      </tr>`;
    }).join('');
  }
  function renderAlerts(data){
    const el = byId('impAlertsList'); if (!el) return;
    const lines = [];
    data.forEach((item, idx)=>{
      const toner = tonerSeed(item, idx); if (toner > 25) return;
      const label = toner <= 10 ? 'Crítico' : 'Baixo';
      const cls = toner <= 10 ? 'crit' : '';
      lines.push(`<div class="imp-alert ${cls}"><span class="imp-alert-dot"></span><span>${esc(item.modelo || item.nome)} — Preto ${toner}% — ${esc(item.localizacao || item.local || item.armazem || '')}</span><small>${label}</small></div>`);
    });
    if (!lines.length) lines.push('<div class="imp-alert"><span class="imp-alert-dot"></span><span>Sem alertas críticos neste momento</span><small>OK</small></div>');
    el.innerHTML = lines.slice(0,4).join('');
  }
  function renderHistory(data){
    const hist = byId('impHistoryList'); if (hist) hist.innerHTML = [
      ['Hoje, 09:15','Leitura realizada','Sucesso'],
      ['Hoje, 09:02','Toner substituído (Preto)','Sucesso'],
      ['Hoje, 08:50','Alerta de toner crítico','Crítico'],
      ['Hoje, 08:45','Leitura realizada','Sucesso'],
      ['Ontem, 17:32','Toner substituído (Ciano)','Sucesso']
    ].map(([a,b,c])=>`<div class="imp-mini-row"><span>${a}</span><strong>${b}</strong><span class="tag ${c==='Crítico'?'bad':''}">${c}</span></div>`).join('');
    const man = byId('impMaintenanceList'); if (man) man.innerHTML = [
      ['Atrasada','Kyocera P3155dn — Intervenção técnica','Alta'],
      ['Hoje','TASKalfa 4052ci — Limpeza e calibração','Hoje'],
      ['Amanhã','Kyocera ECOSYS M5526cdw — Substituição de rolo','Amanhã'],
      ['Planeada','Kyocera PA5500x — Revisão preventiva','Planeada']
    ].map(([a,b,c])=>`<div class="imp-mini-row"><span>${a}</span><strong>${b}</strong><span class="tag ${a==='Atrasada'?'bad':(a==='Hoje'||a==='Amanhã'?'warn':'')}">${c}</span></div>`).join('');
    const word = byId('impWordList'); if (word) word.innerHTML = [
      ['Hoje','Etiquetas Toners - Maio 2025.docx','⬇'],
      ['Ontem','Etiquetas Impressoras - Setor Logística.docx','⬇'],
      ['Ontem','Etiquetas Toners - Receção.docx','⬇'],
      ['13/05','Etiquetas Impressoras - Balcões.docx','⬇']
    ].map(([a,b,c])=>`<div class="imp-mini-row"><span>${a}</span><strong>${b}</strong><span class="tag">${c}</span></div>`).join('');
  }
  function applyFilter(){
    const data = getGlobalData();
    const q = norm(byId('searchImpressoras')?.value || '');
    const place = byId('filterArmazem')?.value || '';
    const state = byId('filterEstadoImpressora')?.value || '';
    const filtered = data.filter((item, idx)=>{
      const blob = norm([item.modelo,item.nome,item.serie,item.ip,item.localizacao,item.local,item.armazem].join(' '));
      const st = getEstado(item);
      return (!q || blob.includes(q)) && (!place || item.armazem === place || item.localizacao === place || item.local === place) && (!state || st === state);
    });
    renderAll(filtered);
  }
  function renderAll(data){
    renderKPIs(data);
    renderRows(data);
    renderAlerts(data);
    renderHistory(data);
  }
  function attachLinks(){ document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => { location.href = btn.getAttribute('data-go'); })); }
  function install(){
    attachLinks();
    window.filtrarImpressoras = applyFilter;
    const data = getGlobalData();
    renderAll(data);
    setTimeout(()=>applyFilter(), 500);
    setTimeout(()=>applyFilter(), 1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();


/* v1.58.34 — override: scroll livre, toner % real e stock por quantidade */
(function(){
  const byId = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(String(v).replace(',', '.').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? n : null;
  };
  function globalValue(name){
    try {
      if (typeof window[name] !== 'undefined') return window[name];
      return Function('try{return typeof '+name+'!==\"undefined\"?'+name+':undefined}catch(e){return undefined}')();
    } catch(e) { return undefined; }
  }
  function getData(){
    const data = globalValue('impressorasData');
    return Array.isArray(data) ? data : [];
  }
  function getStockData(){
    const names = ['stockTonersData','stockData','tonersStock','stockToners','tonersData','stock'];
    for (const n of names) {
      const v = globalValue(n);
      if (Array.isArray(v)) return v;
    }
    try {
      const raw = localStorage.getItem('stockToners') || localStorage.getItem('tonersStock') || localStorage.getItem('stock');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch(e) {}
    return [];
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
      for (const [k,v] of Object.entries(x)) {
        const nk = norm(k);
        if ((nk.includes('preto') || nk === 'black' || nk === 'k') && typeof v === 'object') {
          const n = walk(v, depth + 1);
          if (n !== null) return n;
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
      const keys = [item.ip, item.serie, item.serial, item.id, item.idDoc, item._ref, String(item.ip || '').replaceAll('.', '_'), String(item.serie || '').toUpperCase(), String(item.serie || '').slice(-3)].filter(Boolean).map(String);
      for (const key of keys) {
        const candidates = [state[key], state[key.toLowerCase()], state[key.toUpperCase()]].filter(Boolean);
        for (const c of candidates) {
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
    return null;
  }
  function estadoView(item, idx){
    const toner = tonerPercent(item, idx);
    let estado = 'OK';
    try {
      const fn = globalValue('obterEstadoImpressora');
      if (typeof fn === 'function') estado = fn(item.ip);
    } catch(e){}
    const n = norm(estado);
    if (toner !== null && toner <= 10) return {label:'Crítico', cls:'critical'};
    if (toner !== null && toner <= 25) return {label:'Baixo', cls:'low'};
    if (n.includes('crit') || n.includes('offline')) return {label:'Crítico', cls:'critical'};
    if (n.includes('baixo') || n.includes('pend') || n.includes('repar')) return {label:'Baixo', cls:'low'};
    return {label:'Online', cls:'online'};
  }
  function printerImage(item){
    const m = norm(item.modelo || item.nome);
    if (m.includes('taskalfa')) return '../img/taskalfa2554ci.png';
    if (m.includes('pa5500')) return '../img/pa5500x.png';
    return '../img/kyocerap3155dn.png';
  }
  function renderRows(data){
    const tbody = byId('impressorasTableBody');
    if (!tbody) return;
    if (!data.length){ tbody.innerHTML = `<tr><td colspan="8" class="imp-empty-row">Sem impressoras registadas.</td></tr>`; return; }
    tbody.innerHTML = data.map((item, idx) => {
      const modelo = item.modelo || item.nome || 'Impressora';
      const serie = item.serie || item.serial || `S${idx+1}`;
      const local = item.localizacao || item.local || item.armazem || 'Braga';
      const ip = item.ip || '-';
      const toner = tonerPercent(item, idx);
      const st = estadoView(item, idx);
      const actionData = JSON.stringify(item).replace(/</g,'\\u003c');
      const tonerLabel = toner === null ? 'Sem leitura' : `${toner}%`;
      const fillWidth = toner === null ? 0 : toner;
      const fillClass = toner === null ? 'unknown' : (toner <= 10 ? 'critical' : (toner <= 25 ? 'low' : 'ok'));
      const mins = [12,5,57,15,14,2,10,50][idx % 8];
      return `<tr>
        <td><div class="imp-printer-cell"><img class="imp-printer-thumb" src="${printerImage(item)}" alt=""><span><a class="imp-printer-name" href="http://${esc(ip)}" target="_blank" rel="noopener">${esc(modelo)}</a></span></div></td>
        <td>${esc(serie)}</td><td>${esc(local)}</td><td>${esc(ip)}</td>
        <td><div class="imp-toner-cell"><div class="imp-toner-meta"><span>Preto</span><strong>${tonerLabel}</strong></div><div class="imp-toner-track" title="Toner preto ${tonerLabel}"><div class="imp-toner-fill ${fillClass}" style="width:${fillWidth}%"></div></div></div></td>
        <td><span class="imp-status-badge ${st.cls}">${st.label}</span></td>
        <td>Hoje, 09:${String(mins).padStart(2,'0')}</td>
        <td><div class="imp-actions"><button class="imp-action-icon" onclick="abrirIP('${esc(ip)}')" title="Abrir IP">👁</button><button class="imp-action-icon" onclick='abrirHistoricoImpressora(${actionData})' title="Histórico">📊</button><button class="imp-action-icon" onclick='abrirManutencaoDireta(${actionData})' title="Mais">⋮</button></div></td>
      </tr>`;
    }).join('');
  }
  function renderKPIs(data){
    const total = data.length; let online=0, offline=0, low=0, critical=0;
    data.forEach((item, idx)=>{ const t=tonerPercent(item,idx); const st=estadoView(item,idx); if(st.cls==='online') online++; else offline++; if(t!==null && t<=25) low++; if(t!==null && t<=10) critical++; });
    const set=(id,v)=>{ const el=byId(id); if(el) el.textContent=v; };
    set('impKpiTotal', total || 0); set('impKpiOnline', online || 0); set('impKpiOffline', offline || 0); set('impKpiAlerts', critical || low || 0); set('impKpiLow', low || 0); set('impKpiReadings', total || 0); set('impListCount', total || 0);
  }
  function colorOfStock(item){
    const blob = norm([item.cor,item.color,item.nome,item.modelo,item.codigo,item.ref,item.referencia].join(' '));
    if (blob.includes('ciano') || blob.includes('cyan') || blob.includes('-c')) return 'Ciano';
    if (blob.includes('magenta') || blob.includes('-m')) return 'Magenta';
    if (blob.includes('amarelo') || blob.includes('yellow') || blob.includes('-y')) return 'Amarelo';
    return 'Preto';
  }
  function qtyOfStock(item){
    for (const f of ['quantidade','qtd','stock','total','disponivel','disponiveis','count','unidades']) { const n=num(item[f]); if(n!==null) return Math.max(0, Math.round(n)); }
    return 1;
  }
  function renderStockByColor(){
    const stock = getStockData();
    const counts = {Preto:0, Ciano:0, Magenta:0, Amarelo:0};
    stock.forEach(item => { counts[colorOfStock(item)] += qtyOfStock(item); });
    const total = Object.values(counts).reduce((a,b)=>a+b,0);
    const values = total ? counts : {Preto:'—', Ciano:'—', Magenta:'—', Amarelo:'—'};
    const max = Math.max(1, ...Object.values(counts).filter(v => typeof v === 'number'));
    const host = document.querySelector('.imp-bars'); if(!host) return;
    host.innerHTML = ['Preto','Ciano','Magenta','Amarelo'].map(color => {
      const val = values[color]; const w = typeof val === 'number' ? Math.max(6, Math.round((val/max)*100)) : 8;
      const cls = color === 'Preto' ? 'black' : color === 'Ciano' ? 'cyan' : color === 'Magenta' ? 'magenta' : 'yellow';
      return `<div class="imp-bar"><span>${color}</span><span class="imp-bar-line"><span class="imp-bar-fill ${cls}" style="width:${w}%"></span></span><strong>${val}</strong><small>un.</small></div>`;
    }).join('');
  }
  function renderAlerts(data){
    const el=byId('impAlertsList'); if(!el) return; const lines=[];
    data.forEach((item, idx)=>{ const t=tonerPercent(item,idx); if(t===null || t>25) return; const crit=t<=10; lines.push(`<div class="imp-alert ${crit?'crit':''}"><span class="imp-alert-dot"></span><span>${esc(item.modelo || item.nome)} — Preto ${t}% — ${esc(item.localizacao || item.local || item.armazem || '')}</span><small>${crit?'Crítico':'Baixo'}</small></div>`); });
    el.innerHTML = (lines.length ? lines.slice(0,4) : ['<div class="imp-alert"><span class="imp-alert-dot"></span><span>Sem alertas críticos neste momento</span><small>OK</small></div>']).join('');
  }
  function renderAll(data){ renderKPIs(data); renderRows(data); renderAlerts(data); renderStockByColor(); }
  function applyFilter(){
    const data=getData(); const q=norm(byId('searchImpressoras')?.value||''); const place=byId('filterArmazem')?.value||''; const state=byId('filterEstadoImpressora')?.value||'';
    renderAll(data.filter((item,idx)=>{ const blob=norm([item.modelo,item.nome,item.serie,item.ip,item.localizacao,item.local,item.armazem].join(' ')); const st=norm(estadoView(item,idx).label); return (!q||blob.includes(q)) && (!place||item.armazem===place||item.localizacao===place||item.local===place) && (!state||st.includes(norm(state))); }));
  }
  function unlockScroll(){
    document.documentElement.style.overflowY='auto'; document.documentElement.style.height='auto'; document.documentElement.style.maxHeight='none';
    document.body.style.overflowY='auto'; document.body.style.height='auto'; document.body.style.maxHeight='none'; document.body.style.minHeight='100vh';
    const p=document.querySelector('.imp-page'); if(p){p.style.height='auto';p.style.minHeight='100vh';p.style.maxHeight='none';p.style.overflow='visible';}
  }
  function install(){
    unlockScroll();
    window.filtrarImpressoras = applyFilter;
    setTimeout(()=>applyFilter(),50);
    setTimeout(()=>{unlockScroll();applyFilter();},800);
    setTimeout(()=>{unlockScroll();applyFilter();},2000);
    setInterval(()=>{unlockScroll();applyFilter();},5000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', install); else install();
})();


/* v1.58.49 — filtro persistente na página Impressoras
   Corrige o problema em que a lista voltava a mostrar todas as impressoras
   alguns segundos depois de escolher Braga/Vila Real. */
(function(){
  const byId = (id) => document.getElementById(id);
  const save = () => {
    try {
      const data = {
        q: byId('searchImpressoras')?.value || '',
        armazem: byId('filterArmazem')?.value || '',
        estado: byId('filterEstadoImpressora')?.value || ''
      };
      sessionStorage.setItem('appBragaImpressorasFiltros', JSON.stringify(data));
    } catch(e) {}
  };
  const restore = () => {
    try {
      const raw = sessionStorage.getItem('appBragaImpressorasFiltros');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (byId('searchImpressoras')) byId('searchImpressoras').value = data.q || '';
      if (byId('filterArmazem')) byId('filterArmazem').value = data.armazem || '';
      if (byId('filterEstadoImpressora')) byId('filterEstadoImpressora').value = data.estado || '';
    } catch(e) {}
  };
  const apply = () => {
    restore();
    if (typeof window.filtrarImpressoras === 'function') {
      try { window.filtrarImpressoras(); } catch(e) { console.warn('Filtro Impressoras:', e); }
    }
  };
  function bind(){
    ['searchImpressoras','filterArmazem','filterEstadoImpressora'].forEach((id) => {
      const el = byId(id);
      if (!el || el.dataset.filterPersistBound === '1') return;
      el.dataset.filterPersistBound = '1';
      el.addEventListener('input', () => { save(); setTimeout(apply, 0); });
      el.addEventListener('change', () => { save(); setTimeout(apply, 0); });
    });
    restore();
    setTimeout(apply, 80);
    setTimeout(apply, 700);
    setTimeout(apply, 2200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
