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
