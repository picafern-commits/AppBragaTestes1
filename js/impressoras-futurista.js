
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
    const possible = [item.toner, item.tonerPreto, item.percentagem, item.nivel, item.black, item.preto, item.percent];
    for (const p of possible){ const n = num(p); if (n !== null) return Math.max(0, Math.min(100, n)); }
    const seeds = [5,20,25,65,85,10,90,15,77,68];
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
    setTimeout(()=>renderAll(getGlobalData()), 500);
    setTimeout(()=>renderAll(getGlobalData()), 1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
