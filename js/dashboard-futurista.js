(function(){
  'use strict';
  function $(id){return document.getElementById(id)}
  function text(id,v){const el=$(id); if(el) el.textContent = v}
  function num(v){const n=Number(v||0); return Number.isFinite(n)?n:0}
  function readInt(id){const el=$(id); return el?num(String(el.textContent).replace(/[^0-9.-]/g,'')):0}

  function navigateTo(href){
    if (!href) return;
    window.location.href = href;
  }
  function bindNavigation(){
    document.querySelectorAll('[data-href]').forEach((node) => {
      if (node.dataset.dashNavBound === '1') return;
      node.dataset.dashNavBound = '1';
      node.addEventListener('click', (event) => {
        if (event.target.closest('a,button,input,select,textarea')) return;
        navigateTo(node.dataset.href);
      });
      node.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        navigateTo(node.dataset.href);
      });
    });
    document.querySelectorAll('.dash-panel-footer a').forEach((link)=>{
      if (link.dataset.dashStopBound === '1') return;
      link.dataset.dashStopBound = '1';
      link.addEventListener('click', (event)=>event.stopPropagation());
    });
  }
  function cleanupInjectedDashboardChrome(){
    const selectors = [
      '.app-pro-commandbar', '.app-mobile-action-dock', '.pro-commandbar', '.mockup-topbar',
      '.page-shell-header', '.dashboard-header', '.sidebar', 'aside.sidebar-pro-groups',
      '#personalToolsDashboard', '#personalDashboardOverview', '#personalInternalAlerts',
      '.personal-dashboard:not(.dash-allow-personal)', '.personal-alert-strip', '.personal-task-metrics',
      '.personal-task-layout', '.personal-dashboard-actions', '.personal-priority-panel', '.dashboard-task-panel',
      '#dashboardWidgetGrid', '.dashboard-widget-grid', '.dashboard-widget', '.enterprise-metrics',
      '.enterprise-header', '.dashboard-personalize-card', '.app-pro-header', '.app-pro-dashboard-tabs'
    ];
    document.querySelectorAll(selectors.join(',')).forEach((node)=>{
      if (node.closest('.dashboard-futurista')) return;
      node.remove();
    });
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100%';
  }

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
    cleanupInjectedDashboardChrome();
    bindNavigation();
    setTimeout(()=>{ cleanupInjectedDashboardChrome(); bindNavigation(); tick(); },300);
    setTimeout(()=>{ cleanupInjectedDashboardChrome(); bindNavigation(); tick(); },1200);
    setTimeout(tick,600);
    setInterval(()=>{ cleanupInjectedDashboardChrome(); bindNavigation(); tick(); },1800);
  });
})();


// v1.58.73 — estado global para dashboard
window.addEventListener("appbraga:systems:update", function(ev){
  try { window.__appbragaSystemsDashboard = ev.detail || {}; } catch(e) {}
});
