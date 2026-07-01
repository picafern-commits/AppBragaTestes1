(function(){
  'use strict';
  function $(id){return document.getElementById(id)}
  function text(id,v){const el=$(id); if(el) el.textContent = v}
  function num(v){const n=Number(v||0); return Number.isFinite(n)?n:0}
  function readInt(id){const el=$(id); return el?num(String(el.textContent).replace(/[^0-9.-]/g,'')):0}
  function updateDerived(){
    const totalEq = readInt('dashTotalEquipamentos');
    const stock = readInt('dashStockTotal');
    const manut = readInt('dashTicketsAbertos');
    const impOk = readInt('dashImpressorasOk');
    text('dashKpiEquipamentos', totalEq || '—');
    text('dashKpiStock', stock || '—');
    text('dashKpiTarefas', manut || '0');
    text('dashKpiImpressorasOk', impOk || '—');
    const impTotal = readInt('dashKpiImpressoras');
    if(impTotal && impOk){ text('dashKpiImpressorasSub', 'Online: ' + impOk); }
    const sistema = $('dashSistemaDisponibilidade');
    if(sistema){ sistema.textContent = navigator.onLine ? '99.7%' : 'Offline'; }
  }
  function copyActivity(){
    const old = $('dashboardActivityLog');
    const target = $('dashActivityClone');
    if(!old || !target) return;
    if(old.innerHTML.trim()) target.innerHTML = old.innerHTML;
  }
  function enhanceCriticalCards(){
    document.querySelectorAll('#listaDashboardStock .dashboard-critical-card').forEach((card,idx)=>{
      card.classList.add('dash-critical-mini');
      if(idx>2) card.style.display='none';
    });
  }
  function tick(){
    updateDerived();
    copyActivity();
    enhanceCriticalCards();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const hidden = document.createElement('div');
    hidden.className = 'dash-hidden-metrics';
    hidden.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;';
    hidden.innerHTML = '<span id="dashTotalEquipamentos">0</span><span id="dashStockTotal">0</span><span id="dashTicketsAbertos">0</span><span id="dashImpressorasOk">0</span><div id="dashboardActivityLog"></div>';
    document.body.appendChild(hidden);
    setTimeout(tick,600);
    setInterval(tick,1800);
  });
})();
