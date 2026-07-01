(function(){
  'use strict';
  const VERSION='1.58.28';
  const LS_KEY='appBragaDashboardLayout.v2';
  const widgetDefs={
    metrics:{title:'Contadores',emoji:'📊',subtitle:'Resumo rápido da app',w:12,h:2},
    featured:{title:'Equipamentos em Destaque',emoji:'⭐',subtitle:'Equipamentos que queres sempre visíveis',w:12,h:4},
    priorities:{title:'Prioridade operacional',emoji:'🚨',subtitle:'Toners, impressoras e tarefas que pedem atenção',w:12,h:2},
    tasks:{title:'Tarefas em aberto',emoji:'✅',subtitle:'Prioridades do dia sincronizadas',w:6,h:3},
    team:{title:'Equipa da Semana',emoji:'👥',subtitle:'Rotação semanal atual',w:6,h:2},
    status:{title:'Estado da APP',emoji:'🟢',subtitle:'Firebase, rede, push e scanner',w:6,h:2},
    alerts:{title:'Alertas recentes',emoji:'🔔',subtitle:'Últimos avisos internos',w:6,h:2},
    quick:{title:'Acesso Rápido',emoji:'🚀',subtitle:'Atalhos úteis',w:6,h:2}
  };
  const defaultLayout=[
    {id:'featured',type:'featured',enabled:true,order:1,w:12,h:4,pinned:true},
    {id:'metrics',type:'metrics',enabled:true,order:2,w:12,h:2,pinned:false},
    {id:'priorities',type:'priorities',enabled:true,order:3,w:12,h:2,pinned:false},
    {id:'tasks',type:'tasks',enabled:true,order:4,w:6,h:3,pinned:false},
    {id:'team',type:'team',enabled:true,order:5,w:6,h:2,pinned:false},
    {id:'status',type:'status',enabled:true,order:6,w:6,h:2,pinned:false},
    {id:'alerts',type:'alerts',enabled:true,order:7,w:6,h:2,pinned:false},
    {id:'quick',type:'quick',enabled:true,order:8,w:6,h:2,pinned:false}
  ];
  const templates={
    operacional:['featured','priorities','tasks','team','quick','status'],
    equipamentos:['featured','metrics','priorities','quick','alerts','status'],
    tarefas:['tasks','team','alerts','quick','status','featured'],
    minimalista:['featured','tasks','team','status']
  };
  let layout=clone(defaultLayout);
  let editMode=false;
  let saving=false;

  function clone(v){return JSON.parse(JSON.stringify(v));}
  function getDb(){try{return window.firebase&&firebase.apps&&firebase.apps.length&&firebase.firestore?firebase.firestore():null;}catch(e){return null;}}
  function escapeHtml(v){return String(v||'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function toast(msg){
    try{
      let t=document.querySelector('.dashboard-widget-toast');
      if(!t){t=document.createElement('div');t.className='dashboard-widget-toast';document.body.appendChild(t);}
      t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2600);
    }catch(e){console.log(msg);}
  }
  function normalizeLayout(value){
    const byId=new Map();
    (Array.isArray(value)?value:[]).forEach((item,idx)=>{
      if(!item)return;
      const type=item.type||item.id;
      if(!widgetDefs[type])return;
      const def=widgetDefs[type];
      byId.set(item.id||type,{
        id:item.id||type,
        type,
        enabled:item.enabled!==false,
        order:Number(item.order||idx+1),
        w:Math.max(3,Math.min(12,Number(item.w||def.w))),
        h:Math.max(1,Math.min(6,Number(item.h||def.h))),
        pinned:!!item.pinned
      });
    });
    defaultLayout.forEach(d=>{if(!byId.has(d.id))byId.set(d.id,clone(d));});
    return Array.from(byId.values()).sort((a,b)=>(a.order||0)-(b.order||0)).map((x,i)=>Object.assign(x,{order:i+1}));
  }
  async function loadLayout(){
    let local=null;try{local=JSON.parse(localStorage.getItem(LS_KEY)||localStorage.getItem('appBragaDashboardLayout.v1')||'null');}catch(e){}
    layout=normalizeLayout(local||defaultLayout);
    const db=getDb();
    if(db){
      try{
        const snap=await db.collection('config').doc('dashboardLayout').get();
        if(snap.exists){layout=normalizeLayout((snap.data()||{}).widgets);localStorage.setItem(LS_KEY,JSON.stringify(layout));}
      }catch(e){console.warn('[DashboardWidgets] Firebase layout fallback local',e);}
    }
    return layout;
  }
  async function saveLayout(silent){
    if(saving)return;
    saving=true;
    layout=normalizeLayout(layout);
    localStorage.setItem(LS_KEY,JSON.stringify(layout));
    const db=getDb();
    if(db){
      try{
        const ref=db.collection('config').doc('dashboardLayout');
        const old=await ref.get().catch(()=>null);
        if(old&&old.exists){await db.collection('config').doc('dashboardLayoutBackup').set({widgets:(old.data()||{}).widgets||[],updatedAt:firebase.firestore.FieldValue.serverTimestamp(),source:'auto-backup',version:VERSION},{merge:true});}
        await ref.set({widgets:layout,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),version:VERSION},{merge:true});
        if(!silent)toast('Dashboard guardado na Firebase.');
      }catch(e){console.error('[DashboardWidgets] Erro guardar Firebase',e);if(!silent)toast('Guardado localmente. Firebase falhou.');}
    }else if(!silent){toast('Dashboard guardado localmente.');}
    saving=false;
    renderDashboard();renderConfigEditor();
  }
  function move(id,delta){
    const item=layout.find(w=>w.id===id); if(item&&item.pinned){toast('Widget fixado. Desfixa para mover.');return;}
    const i=layout.findIndex(w=>w.id===id); let j=i+delta;
    while(j>=0&&j<layout.length&&layout[j].pinned){j+=delta;}
    if(i<0||j<0||j>=layout.length)return;
    [layout[i],layout[j]]=[layout[j],layout[i]]; layout.forEach((w,k)=>w.order=k+1); saveLayout(true);
  }
  function resize(id,field,delta){const w=layout.find(x=>x.id===id);if(!w)return;const max=field==='w'?12:6;const min=field==='w'?3:1;w[field]=Math.max(min,Math.min(max,Number(w[field]||widgetDefs[w.type][field])+delta));saveLayout(true);}
  function setEnabled(id,on){const w=layout.find(x=>x.id===id);if(w){if(w.pinned&&!on){toast('Widget fixado. Desfixa para ocultar.');return;}w.enabled=!!on;saveLayout(true);}}
  function setPinned(id,on){const w=layout.find(x=>x.id===id);if(w){w.pinned=!!on;saveLayout(true);}}
  function setSize(id,w,h){const item=layout.find(x=>x.id===id);if(item){item.w=Math.max(3,Math.min(12,Number(w)||item.w));item.h=Math.max(1,Math.min(6,Number(h)||item.h));saveLayout(true);}}
  function applyTemplate(name){
    const order=templates[name]||templates.operacional;
    const map=new Map(normalizeLayout(layout).map(w=>[w.id,w]));
    const next=[];
    order.forEach((id,idx)=>{const item=map.get(id)||defaultLayout.find(w=>w.id===id);if(item)next.push(Object.assign(clone(item),{enabled:true,order:idx+1,pinned:id==='featured'}));});
    defaultLayout.forEach(d=>{if(!next.some(x=>x.id===d.id))next.push(Object.assign(clone(d),{enabled:false,order:next.length+1,pinned:false}));});
    layout=normalizeLayout(next);saveLayout();
  }

  function widgetFrame(item){
    const def=widgetDefs[item.type];
    const el=document.createElement('section');
    el.className='dashboard-widget'+(editMode?' is-editing':'')+(item.pinned?' is-pinned':'');
    el.dataset.widgetId=item.id; el.style.setProperty('--widget-w',item.w||def.w); el.style.setProperty('--widget-h',item.h||def.h);
    el.innerHTML=`<div class="dashboard-widget-head"><div><div class="dashboard-widget-title"><span class="widget-emoji">${def.emoji}</span><span>${def.title}</span>${item.pinned?'<span class="widget-pin-pill">Fixado</span>':''}</div><p class="dashboard-widget-subtitle">${def.subtitle}</p></div><div class="widget-edit-controls"><button type="button" data-act="pin">${item.pinned?'Soltar':'Fixar'}</button><button type="button" data-act="up">↑</button><button type="button" data-act="down">↓</button><button type="button" data-act="wide">↔</button><button type="button" data-act="tall">↕</button><button type="button" data-act="hide">Ocultar</button></div></div><div class="dashboard-widget-body"></div>`;
    el.addEventListener('click',ev=>{const b=ev.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;if(act==='pin')setPinned(item.id,!item.pinned);if(act==='up')move(item.id,-1);if(act==='down')move(item.id,1);if(act==='wide')resize(item.id,'w',item.w>=12?-3:3);if(act==='tall')resize(item.id,'h',item.h>=6?-1:1);if(act==='hide')setEnabled(item.id,false);});
    return el;
  }
  function renderWidget(item){
    const el=widgetFrame(item); const body=el.querySelector('.dashboard-widget-body');
    if(item.type==='metrics')body.innerHTML=`<div class="widget-metric-grid"><div class="widget-mini-metric"><span>Total de Equipamentos</span><strong id="dashTotalEquipamentos">0</strong></div><div class="widget-mini-metric"><span>Stock Total Toners</span><strong id="dashStockTotal">0</strong></div><div class="widget-mini-metric"><span>Manutenções a Decorrer</span><strong id="dashTicketsAbertos">0</strong></div><div class="widget-mini-metric"><span>Impressoras OK</span><strong id="dashImpressorasOk">0</strong></div></div>`;
    if(item.type==='featured')body.innerHTML=`<div id="listaDashboardStock" class="equipment-grid"></div>`;
    if(item.type==='priorities')body.innerHTML=`<div id="dashboardPriorities" class="widget-priority-list"><div class="widget-empty">Sem prioridades críticas neste momento.</div></div>`;
    if(item.type==='tasks')body.innerHTML=`<div class="personal-dashboard dashboard-tasks-only"><section class="personal-panel dashboard-task-panel"><div class="personal-panel-head"><div><h2>Tarefas em aberto</h2><p>Prioridades do dia.</p></div><a href="tarefas.html" class="secondary-btn">Ver todas</a></div><div id="personalTaskList" class="personal-list personal-task-list dashboard-task-list"></div></section></div>`;
    if(item.type==='team')body.innerHTML=`<div id="dashboardWeeklyTeamWidget" class="widget-team-current"><div class="widget-team-card"><strong>A carregar equipa...</strong><p>Usa a página Equipas Semanais para configurar a rotação.</p></div></div>`;
    if(item.type==='status')body.innerHTML=`<div class="widget-status-grid"><div><span>Rede</span><strong>${navigator.onLine?'Online':'Offline'}</strong></div><div><span>Firebase</span><strong>${getDb()?'OK':'Indisponível'}</strong></div><div><span>Push</span><strong>${('PushManager' in window)?(Notification&&Notification.permission==='granted'?'Ativo':'Disponível'):'Não suportado'}</strong></div><div><span>Scanner</span><strong>${navigator.mediaDevices?'OK':'Limitado'}</strong></div></div>`;
    if(item.type==='alerts')body.innerHTML=`<div class="widget-alert-list"><div class="widget-alert ok">✅ Sistema pronto</div><div class="widget-alert info">ℹ️ Usa Notificações para testar Web Push</div><div class="widget-alert info">📌 Personaliza este painel nas Configurações</div></div>`;
    if(item.type==='quick')body.innerHTML=`<div class="widget-quick-grid"><a class="widget-quick-link" href="add-toner.html">➕ Adicionar Toner</a><a class="widget-quick-link" href="tarefas.html">✅ Criar tarefa</a><a class="widget-quick-link" href="stock.html">📦 Stock</a><a class="widget-quick-link" href="diretorio.html">☎️ Diretório</a><a class="widget-quick-link" href="notificacoes.html">🔔 Notificações</a></div>`;
    return el;
  }
  function renderDashboard(){
    const grid=document.getElementById('dashboardWidgetGrid');if(!grid)return;
    grid.classList.toggle('dashboard-edit-mode',editMode);grid.innerHTML='';
    normalizeLayout(layout).filter(w=>w.enabled!==false).forEach(w=>grid.appendChild(renderWidget(w)));
    renderWeeklyTeamWidget();
  }
  function dashboardMondayOf(value){
    const d = value instanceof Date ? new Date(value) : new Date(String(value || '').includes('T') ? value : String(value || '') + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return dashboardMondayOf(new Date());
    d.setHours(0,0,0,0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }
  function dashboardAddDays(date, days){ const d = new Date(date); d.setDate(d.getDate()+days); return d; }
  function dashboardFmtDate(date){
    try { return new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date); }
    catch { return new Date(date).toISOString().slice(0,10); }
  }
  function dashboardTeamId(team){ return String(team?.id || team?.idDoc || team?.docId || team?._id || ''); }
  function dashboardTeamName(team){ return String(team?.nome || team?.name || team?.titulo || 'Equipa'); }
  function dashboardMembers(team){
    return Array.isArray(team?.members) ? team.members :
      (Array.isArray(team?.users) ? team.users :
      (Array.isArray(team?.membros) ? team.membros : []));
  }
  function dashboardCurrentTeam(teams, cfg){
    const ordered=[...teams].sort((a,b)=>(Number(a.ordem||a.order||9999)-Number(b.ordem||b.order||9999))||dashboardTeamName(a).localeCompare(dashboardTeamName(b),'pt'));
    if(!ordered.length) return {ordered,current:null,next:null,weekStart:dashboardMondayOf(new Date()),weekEnd:dashboardAddDays(dashboardMondayOf(new Date()),6),source:'empty'};

    const explicitId = String(cfg.equipaAtualId || cfg.currentTeamId || '').trim();
    if (explicitId) {
      const explicitIndex = ordered.findIndex(t => dashboardTeamId(t) === explicitId);
      if (explicitIndex >= 0) {
        const weekStart = dashboardMondayOf(cfg.rotationStart || cfg.dataInicio || cfg.startDate || new Date());
        return {ordered,current:ordered[explicitIndex],next:ordered[(explicitIndex+1)%ordered.length],weekStart,weekEnd:dashboardAddDays(weekStart,6),source:'explicit'};
      }
    }

    const firstId = String(cfg.firstTeamId || cfg.primeiraEquipaId || '').trim();
    let firstIndex = firstId ? ordered.findIndex(t => dashboardTeamId(t) === firstId) : 0;
    if(firstIndex < 0) firstIndex = 0;
    const rotationStart = dashboardMondayOf(cfg.rotationStart || cfg.dataInicio || cfg.startDate || new Date());
    const nowWeek = dashboardMondayOf(new Date());
    const diffWeeks = Math.floor((nowWeek - rotationStart) / (7*24*60*60*1000));
    const safeWeeks = Math.max(0, diffWeeks);
    const currentIndex = (firstIndex + safeWeeks) % ordered.length;
    return {ordered,current:ordered[currentIndex],next:ordered[(currentIndex+1)%ordered.length],weekStart:nowWeek,weekEnd:dashboardAddDays(nowWeek,6),source:'rotation'};
  }
  async function renderWeeklyTeamWidget(){
    const mount=document.getElementById('dashboardWeeklyTeamWidget');if(!mount)return;
    const db=getDb();if(!db){mount.innerHTML='<div class="widget-team-card"><strong>Firebase indisponível</strong><p>Não foi possível carregar a equipa.</p></div>';return;}
    try{
      const [teamsSnap,cfgSnap]=await Promise.all([db.collection('equipasSemanais').get(),db.collection('config').doc('equipasSemanais').get()]);
      const teams=[];teamsSnap.forEach(d=>teams.push(Object.assign({id:d.id,idDoc:d.id},d.data())));
      if(!teams.length){mount.innerHTML='<div class="widget-team-card"><strong>Sem equipas</strong><p>Cria equipas na página Equipas Semanais.</p></div>';return;}
      const cfg=(cfgSnap.exists?cfgSnap.data():{})||{};
      const info=dashboardCurrentTeam(teams,cfg);
      const cur=info.current||teams[0];
      const next=info.next||teams[0];
      const members=dashboardMembers(cur);
      mount.innerHTML=`<div class="widget-team-card is-current"><div class="widget-team-top"><span>⭐ Equipa desta semana</span><small>${escapeHtml(dashboardFmtDate(info.weekStart))} a ${escapeHtml(dashboardFmtDate(info.weekEnd))}</small></div><strong>${escapeHtml(dashboardTeamName(cur))}</strong><p>Próxima: <b>${escapeHtml(dashboardTeamName(next))}</b></p><div class="widget-team-members">${members.length ? members.map(m=>`<span>${escapeHtml(typeof m==='string'?m:(m.nome||m.name||m.email||'User'))}</span>`).join(''):'<span>Sem membros</span>'}</div></div>`;
    }catch(e){mount.innerHTML='<div class="widget-team-card"><strong>Erro ao carregar</strong><p>'+escapeHtml(e.message||String(e))+'</p></div>';}
  }
  function templateButtons(){return `<div class="dashboard-template-bar"><button type="button" data-template="operacional">⚡ Operacional</button><button type="button" data-template="equipamentos">🖨️ Equipamentos</button><button type="button" data-template="tarefas">✅ Tarefas</button><button type="button" data-template="minimalista">✨ Minimalista</button></div>`;}
  function renderConfigEditor(){
    const mount=document.getElementById('dashboardWidgetEditorMount');if(!mount)return;
    layout=normalizeLayout(layout);
    mount.innerHTML=`<div class="dashboard-config-panel"><div class="dashboard-config-intro"><strong>Templates rápidos</strong><p>Escolhe uma base e depois ajusta ordem/tamanho.</p>${templateButtons()}</div>${layout.map(item=>{const def=widgetDefs[item.type];return `<div class="dashboard-config-row" data-widget-id="${item.id}"><input type="checkbox" ${item.enabled!==false?'checked':''} data-field="enabled"><div><div class="dashboard-config-row-title">${def.emoji} ${def.title} ${item.pinned?'📌':''}</div><small>${def.subtitle}</small></div><select data-field="w"><option value="3">Pequeno</option><option value="6">Médio</option><option value="9">Grande</option><option value="12">Largura total</option></select><input type="number" min="1" max="6" value="${item.h||def.h}" data-field="h" title="Altura"><input type="number" min="1" max="20" value="${item.order}" data-field="order" title="Ordem"><label class="dashboard-pin-check"><input type="checkbox" ${item.pinned?'checked':''} data-field="pinned"> Fixar</label><div class="dashboard-config-buttons"><button type="button" data-act="up">↑</button><button type="button" data-act="down">↓</button></div></div>`}).join('')}<div class="dashboard-config-footer"><button class="primary-btn" type="button" id="saveDashboardLayoutBtn">Guardar na Firebase</button><button class="secondary-btn" type="button" id="reloadDashboardLayoutBtn">Recarregar</button><button class="secondary-btn" type="button" id="resetDashboardLayoutBtn">Restaurar padrão</button></div></div>`;
    mount.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>applyTemplate(b.dataset.template));
    mount.querySelectorAll('.dashboard-config-row').forEach(row=>{const id=row.dataset.widgetId;const item=layout.find(w=>w.id===id);const wsel=row.querySelector('[data-field="w"]');if(wsel)wsel.value=String(item.w||widgetDefs[item.type].w);row.addEventListener('change',ev=>{const field=ev.target.dataset.field;const it=layout.find(w=>w.id===id);if(!field||!it)return;if(field==='enabled'){if(it.pinned&&!ev.target.checked){ev.target.checked=true;toast('Widget fixado. Desfixa antes de ocultar.');return;}it.enabled=ev.target.checked;}if(field==='w')it.w=Number(ev.target.value);if(field==='h')it.h=Number(ev.target.value);if(field==='order')it.order=Number(ev.target.value);if(field==='pinned')it.pinned=ev.target.checked;layout.sort((a,b)=>(Number(a.order||0)-Number(b.order||0)));layout.forEach((w,k)=>w.order=k+1);saveLayout(true);});row.addEventListener('click',ev=>{const b=ev.target.closest('[data-act]');if(!b)return;move(id,b.dataset.act==='up'?-1:1);});});
    const save=document.getElementById('saveDashboardLayoutBtn');if(save)save.onclick=()=>saveLayout();
    const reload=document.getElementById('reloadDashboardLayoutBtn');if(reload)reload.onclick=async()=>{await loadLayout();renderConfigEditor();toast('Layout do Dashboard recarregado.');};
    const reset=document.getElementById('resetDashboardLayoutBtn');if(reset)reset.onclick=()=>{if(confirm('Restaurar layout padrão do Dashboard?')){layout=clone(defaultLayout);saveLayout();}};
  }
  function bindToolbar(){
    const btn=document.getElementById('dashboardEditModeBtn');if(btn)btn.onclick=()=>{editMode=!editMode;btn.textContent=editMode?'✓ Terminar edição':'⚙️ Editar Dashboard';renderDashboard();};
    const reload=document.getElementById('dashboardReloadLayoutBtn');if(reload)reload.onclick=async()=>{await loadLayout();renderDashboard();toast('Layout recarregado.');};
    document.querySelectorAll('[data-dashboard-template]').forEach(b=>b.onclick=()=>applyTemplate(b.dataset.dashboardTemplate));
  }
  document.addEventListener('DOMContentLoaded',async()=>{await loadLayout();bindToolbar();renderDashboard();renderConfigEditor();});
  window.AppBragaDashboardWidgets={loadLayout,saveLayout,renderDashboard,renderConfigEditor,applyTemplate,get layout(){return layout;}};
})();
