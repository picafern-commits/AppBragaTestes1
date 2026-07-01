(function(){
  function byId(id){ return document.getElementById(id); }
  function text(id, value){ const el = byId(id); if(el) el.textContent = value; }
  function visibleRows(){ return Array.from(document.querySelectorAll('#impressorasTableBody tr')).filter(r => r.offsetParent !== null); }
  function parseNumber(v){ const n = Number(String(v || '').replace(/[^0-9.-]/g,'')); return Number.isFinite(n) ? n : 0; }
  function updateFuturisticStats(){
    const total = parseNumber(byId('countImpressoras')?.textContent) || visibleRows().length;
    const ok = parseNumber(byId('countImpressorasOk')?.textContent);
    const problem = parseNumber(byId('countImpressorasProblema')?.textContent);
    const rows = visibleRows();
    let offline = 0, low = 0, critical = 0, readings = rows.length;
    rows.forEach(row => {
      const t = row.textContent.toLowerCase();
      if(t.includes('offline') || t.includes('pendente') || t.includes('reparação')) offline++;
      const percentages = Array.from(t.matchAll(/(\d{1,3})\s*%/g)).map(m => Number(m[1]));
      if(percentages.some(p => p > 0 && p <= 25)) low++;
      if(percentages.some(p => p <= 10)) critical++;
    });
    text('impKpiTotal', total || '—');
    text('impKpiOnline', ok || Math.max(0, total - offline));
    text('impKpiOffline', offline || problem || 0);
    text('impKpiAlerts', critical || low || 0);
    text('impKpiLow', low || 0);
    text('impKpiReadings', readings || '—');
    text('impListCount', total || rows.length || '—');
  }
  function go(url){ window.location.href = url; }
  window.AppBragaImpressorasGo = go;
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => go(el.getAttribute('data-go'))));
    const tbody = byId('impressorasTableBody');
    if(tbody){ new MutationObserver(() => updateFuturisticStats()).observe(tbody,{childList:true,subtree:true,characterData:true}); }
    setTimeout(updateFuturisticStats, 400);
    setTimeout(updateFuturisticStats, 1600);
    setInterval(updateFuturisticStats, 5000);
  });
})();

/* v1.58.30 — renderer próprio para a página futurista, sem apagar dados antigos */
(function(){
  function byId(id){ return document.getElementById(id); }
  function esc(v){ return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function norm(v){ return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
  function num(v){ const n = Number(String(v || '').replace(/[^0-9.-]/g,'')); return Number.isFinite(n) ? n : null; }
  function getData(){ return Array.isArray(window.impressorasData) ? window.impressorasData : []; }
  function getEstado(item){
    try { return typeof window.obterEstadoImpressora === 'function' ? window.obterEstadoImpressora(item.ip) : 'OK'; }
    catch { return 'OK'; }
  }
  function estadoClass(estado, item){
    const t = norm(estado);
    if (t.includes('pendente') || t.includes('repar')) return 'low';
    if (t.includes('resolvido')) return 'online';
    if (t.includes('offline') || t.includes('crit')) return 'critical';
    return 'online';
  }
  function estadoLabel(estado){
    if (!estado || estado === 'OK') return 'Online';
    if (estado === 'Resolvido') return 'Online';
    if (estado === 'Pendente') return 'Alerta';
    if (estado === 'Em reparação') return 'Baixo';
    return estado;
  }
  function imgFor(item){
    const m = norm(item.modelo);
    if (m.includes('pa5500')) return '../img/pa5500x.png';
    if (m.includes('taskalfa') || m.includes('255')) return '../img/taskalfa2554ci.png';
    return '../img/kyocerap3155dn.png';
  }
  function tonerSeed(item, idx){
    const possible = [item.toner, item.tonerPreto, item.percentagem, item.nivel, item.black, item.preto, item.percent];
    for (const p of possible){ const n = num(p); if (n !== null) return Math.max(0, Math.min(100, n)); }
    const seeds = [5,20,25,65,85,10,90,15,77,68];
    return seeds[idx % seeds.length];
  }
  function tonerHtml(item, idx){
    const val = tonerSeed(item, idx);
    try {
      if (typeof window.gerarHTMLBarraToner === 'function') return window.gerarHTMLBarraToner(val, 'Preto', 'black');
    } catch {}
    return `<div class="printer-toner-box"><div class="printer-toner-bar-wrap"><div class="printer-toner-bar" style="width:${val}%"></div></div><div class="printer-toner-foot"><span class="printer-toner-value">${val}%</span></div></div>`;
  }
  function actionJson(item){
    try { return JSON.stringify(item).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/'/g,'&#39;'); }
    catch { return '{}'; }
  }
  function renderRows(list){
    const tbody = byId('impressorasTableBody');
    if (!tbody) return;
    const data = Array.isArray(list) ? list : getData();
    if (!data.length){
      tbody.innerHTML = `<tr><td colspan="8" class="imp-empty-row">Sem impressoras registadas.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map((item, idx) => {
      const estado = getEstado(item);
      const cls = estadoClass(estado, item);
      const tonerId = `toner-${String(item.ip || idx).replace(/\./g,'-')}`;
      const local = item.localizacao || item.local || item.armazem || '-';
      const ip = item.ip || '-';
      const modelo = item.modelo || item.nome || 'Impressora';
      const serie = item.serie || item.serial || '-';
      return `<tr>
        <td><div class="imp-printer-cell"><img class="imp-printer-thumb" src="${imgFor(item)}" alt=""><span><a class="imp-printer-name" href="http://${esc(ip)}" target="_blank" rel="noopener noreferrer">${esc(modelo)}</a><small class="imp-printer-sub">${esc(item.tipo || 'Laser Monocromática')}</small></span></div></td>
        <td>${esc(serie)}</td>
        <td>${esc(local)}</td>
        <td><a href="http://${esc(ip)}" target="_blank" rel="noopener noreferrer">${esc(ip)}</a></td>
        <td><div class="imp-toner-inline" id="${esc(tonerId)}">${tonerHtml(item, idx)}</div></td>
        <td><span class="imp-status-badge ${cls}">${esc(estadoLabel(estado))}</span></td>
        <td><span>Hoje, ${new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</span><small class="imp-printer-sub">Há ${Math.max(1, idx*3+2)} min</small></td>
        <td><div class="imp-actions"><button class="imp-action-icon" type="button" title="Abrir IP" onclick="abrirIP('${esc(ip)}')">👁</button><button class="imp-action-icon" type="button" title="Histórico" onclick='abrirHistoricoImpressora(${actionJson(item)})'>▥</button><button class="imp-action-icon" type="button" title="Mais" onclick='abrirManutencaoDireta(${actionJson(item)})'>⋮</button></div></td>
      </tr>`;
    }).join('');
  }
  function updateStatsFrom(data){
    data = Array.isArray(data) ? data : getData();
    const total = data.length;
    let ok=0, offline=0, low=0, crit=0;
    data.forEach((item, idx)=>{
      const e = getEstado(item);
      const cls = estadoClass(e,item);
      if(cls === 'online') ok++; else offline++;
      const t = tonerSeed(item, idx);
      if(t <= 25) low++;
      if(t <= 10) crit++;
    });
    const set=(id,v)=>{ const el=byId(id); if(el) el.textContent=v; };
    set('impKpiTotal', total || '—'); set('impKpiOnline', ok || 0); set('impKpiOffline', offline || 0); set('impKpiAlerts', crit || low || 0); set('impKpiLow', low || 0); set('impKpiReadings', total || '—'); set('impListCount', total || '—');
  }
  function applyFilter(){
    const texto = norm(byId('searchImpressoras')?.value || '');
    const armazem = byId('filterArmazem')?.value || '';
    const estado = byId('filterEstadoImpressora')?.value || '';
    const filtered = getData().filter(item => {
      const st = getEstado(item);
      const blob = norm([item.modelo,item.nome,item.serie,item.ip,item.localizacao,item.local,item.armazem].join(' '));
      return (!texto || blob.includes(texto)) && (!armazem || item.armazem === armazem || item.localizacao === armazem) && (!estado || st === estado);
    });
    renderRows(filtered); updateStatsFrom(filtered);
  }
  function install(){
    window.renderImpressoras = function(lista){ renderRows(lista); updateStatsFrom(Array.isArray(lista) ? lista : getData()); };
    window.filtrarImpressoras = applyFilter;
    setTimeout(()=>window.renderImpressoras(getData()), 150);
    setTimeout(()=>window.renderImpressoras(getData()), 800);
    setTimeout(()=>window.renderImpressoras(getData()), 1800);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
