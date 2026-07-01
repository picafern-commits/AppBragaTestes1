(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=(v)=>String(v ?? '').replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const db=()=>{try{return window.db || (window.firebase?.apps?.length ? firebase.firestore() : null);}catch{return null;}};

  function isPage(name){return (location.pathname||'').toLowerCase().endsWith('/'+name.toLowerCase()) || (location.pathname||'').toLowerCase().endsWith(name.toLowerCase());}

  function enhanceNotifications(){
    if(!isPage('notificacoes.html')) return;
    const panel=$('.config-section');
    if(!panel || $('#notificationQuickActions')) return;
    const wrap=document.createElement('div');
    wrap.id='notificationQuickActions';
    wrap.className='notification-quick-actions';
    const items=[
      ['🚨','Alerta Geral','Atenção geral para todos os dispositivos.','🚨 Alerta geral: atenção por favor.'],
      ['📞','Preciso de Ajuda','Pede apoio imediato à equipa.','📞 Preciso de ajuda assim que possível.'],
      ['📦','Armazém','Chama a equipa ao armazém.','📦 Precisamos de apoio no armazém.'],
      ['🖨️','Impressoras','Aviso relacionado com impressoras.','🖨️ Atenção: precisamos de apoio nas impressoras.'],
      ['🚚','Logística','Aviso rápido para logística.','🚚 Atenção logística: verificar situação.']
    ];
    wrap.innerHTML=items.map(([emoji,title,desc,msg])=>`<button type="button" class="notification-quick-action" data-quick-alert="${esc(msg)}"><span class="quick-emoji">${emoji}</span><span><strong>${esc(title)}</strong><small>${esc(desc)}</small></span></button>`).join('');
    const actions=panel.querySelector('.toolbar-actions') || panel.querySelector('.task-actions') || panel;
    actions.parentNode.insertBefore(wrap, actions.nextSibling);
    wrap.addEventListener('click',async(ev)=>{
      const btn=ev.target.closest('[data-quick-alert]'); if(!btn) return;
      const input=$('#firebaseNotifyMessage'); if(input) input.value=btn.dataset.quickAlert||'';
      const alertBtn=$('[data-firebase-notify-alert]');
      if(alertBtn) alertBtn.click();
    });
  }

  function markTaskRows(){
    const today=new Date().toISOString().slice(0,10);
    $$('.personal-task-row').forEach(row=>{
      const txt=row.textContent||'';
      const m=txt.match(/Prazo\s+(\d{4}-\d{2}-\d{2})/i);
      if(m && m[1] < today && !row.classList.contains('is-done')) row.classList.add('is-overdue');
    });
  }

  function enhanceTasks(){
    if(!isPage('tarefas.html') && !$('#personalTasksPage')) return;
    setInterval(markTaskRows,1200);
    document.addEventListener('click',async(ev)=>{
      const edit=ev.target.closest('[data-task-edit]');
      const del=ev.target.closest('[data-task-delete]');
      if(!edit && !del) return;
      const id=(edit||del).dataset.taskEdit || (edit||del).dataset.taskDelete;
      const database=db(); if(!database||!id) return;
      if(del){ if(confirm('Apagar esta tarefa?')) await database.collection('personalTasks').doc(id).delete(); return; }
      try{
        const snap=await database.collection('personalTasks').doc(id).get();
        const t=snap.data()||{};
        const title=prompt('Título da tarefa',t.title||''); if(title===null) return;
        const owner=prompt('Responsável',t.owner||''); if(owner===null) return;
        const dueDate=prompt('Data limite (AAAA-MM-DD)',t.dueDate||''); if(dueDate===null) return;
        const priority=prompt('Prioridade: urgente, alta, normal, baixa',t.priority||'normal') || 'normal';
        await database.collection('personalTasks').doc(id).set({title:title.trim(),owner:String(owner).trim(),dueDate:String(dueDate).trim(),priority:String(priority).trim(),updatedAt:Date.now()},{merge:true});
      }catch(e){console.error(e); alert('Não consegui editar a tarefa: '+(e.message||e));}
    });
  }

  function addTaskActionButtons(){
    // Complementa os botões do sistema atual sem reescrever a página.
    const host=$('#personalTaskList'); if(!host) return;
    $$('.personal-task-row',host).forEach(row=>{
      const done=row.querySelector('[data-task-done],[data-task-reopen]');
      if(!done) return;
      const id=done.getAttribute('data-task-done') || done.getAttribute('data-task-reopen');
      const actions=row.querySelector('.personal-task-actions');
      if(!actions || actions.querySelector('[data-task-edit]')) return;
      actions.insertAdjacentHTML('beforeend',`<button type="button" class="secondary-btn" data-task-edit="${esc(id)}">Editar</button><button type="button" class="secondary-btn danger-btn" data-task-delete="${esc(id)}">Apagar</button>`);
    });
  }

  function enhanceTaskMutation(){
    const host=$('#personalTaskList'); if(!host) return;
    const run=()=>{addTaskActionButtons();markTaskRows();};
    run();
    new MutationObserver(run).observe(host,{childList:true,subtree:true});
  }

  function mondayOf(date){const d=new Date(date);d.setHours(0,0,0,0);const day=d.getDay();const diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);return d;}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
  function fmt(d){try{return new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);}catch{return d.toISOString().slice(0,10);}}
  function teamName(t){return String(t?.nome||t?.name||'Equipa');}
  function teamId(t){return String(t?.idDoc||t?.id||'');}

  async function loadTeamData(){
    const database=db(); if(!database) return {teams:[],cfg:{}};
    const [teamsSnap,cfgSnap]=await Promise.all([database.collection('equipasSemanais').get(),database.collection('config').doc('equipasSemanais').get()]);
    const teams=[]; teamsSnap.forEach(doc=>teams.push({idDoc:doc.id,id:doc.id,...doc.data()}));
    const cfg=cfgSnap.exists?cfgSnap.data()||{}:{};
    teams.sort((a,b)=>(Number(a.ordem||9999)-Number(b.ordem||9999))||teamName(a).localeCompare(teamName(b),'pt'));
    return {teams,cfg};
  }

  function buildRotation(teams,cfg,weeks=8){
    if(!teams.length) return [];
    const ordered=[...teams];
    const firstId=String(cfg.firstTeamId||cfg.primeiraEquipaId||'');
    const firstIdx=firstId?ordered.findIndex(t=>teamId(t)===firstId):0;
    const start=mondayOf(cfg.rotationStart||cfg.dataInicio||new Date());
    const thisWeek=mondayOf(new Date());
    const elapsed=Math.floor((thisWeek-start)/(7*24*60*60*1000));
    const offset=((elapsed % ordered.length)+ordered.length)%ordered.length;
    const base=(firstIdx>=0?firstIdx:0)+offset;
    return Array.from({length:weeks}).map((_,i)=>{
      const weekStart=addDays(thisWeek,i*7);
      const team=ordered[(base+i)%ordered.length];
      return {weekStart,weekEnd:addDays(weekStart,6),team,current:i===0};
    });
  }

  async function renderTeamsCalendar(){
    if(!isPage('equipas-semanais.html')) return;
    const anchor=$('#equipasCards')?.closest('section') || $('#equipasCards') || $('.main');
    if(!anchor || $('#equipasCalendarPanel')) return;
    const panel=document.createElement('section');
    panel.id='equipasCalendarPanel';
    panel.className='panel equipas-calendar-panel';
    panel.innerHTML='<div class="section-header"><div><h3>📅 Calendário da rotação</h3><p class="section-subtitle">As próximas semanas calculadas automaticamente pela ordem definida.</p></div><button type="button" class="secondary-btn" id="refreshEquipasCalendar">Atualizar</button></div><div class="equipas-calendar-grid" id="equipasCalendarGrid"><div class="empty-state mini">A carregar calendário...</div></div>';
    anchor.parentNode.insertBefore(panel, anchor);
    async function refresh(){
      const grid=$('#equipasCalendarGrid'); if(!grid) return;
      try{
        const {teams,cfg}=await loadTeamData();
        const weeks=buildRotation(teams,cfg,8);
        grid.innerHTML=weeks.length ? weeks.map(w=>`<article class="equipas-week-card ${w.current?'is-current':''}"><span class="week-label">${w.current?'Esta semana':'Semana'}</span><strong>${esc(teamName(w.team))}</strong><small>${esc(fmt(w.weekStart))} a ${esc(fmt(w.weekEnd))}</small><span class="week-status">${w.current?'A trabalhar agora':'Rotação futura'}</span></article>`).join(''):'<div class="empty-state mini">Cria equipas para gerar o calendário.</div>';
      }catch(e){grid.innerHTML='<div class="empty-state mini">Erro ao carregar calendário: '+esc(e.message||e)+'</div>';}
    }
    $('#refreshEquipasCalendar')?.addEventListener('click',refresh);
    refresh();
  }

  function enhanceIphone(){
    const ua=navigator.userAgent||'';
    const isIphone=/iPhone/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1&&Math.min(screen.width,screen.height)<900);
    if(isIphone) document.body.classList.add('device-iphone-pro');
    if(isIphone && matchMedia('(orientation: landscape)').matches) document.body.classList.add('iphone-landscape');
    addEventListener('orientationchange',()=>setTimeout(()=>document.body.classList.toggle('iphone-landscape',matchMedia('(orientation: landscape)').matches),250));
  }

  function boot(){
    enhanceIphone();
    enhanceNotifications();
    enhanceTasks();
    enhanceTaskMutation();
    renderTeamsCalendar();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,650));
  else setTimeout(boot,650);
})();
