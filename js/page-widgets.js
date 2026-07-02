(function(){
  'use strict';
  const VERSION='1.57.8';
  const PROFILE_DOC_SUFFIX={desktop:'Desktop',tablet:'Tablet',iphone:'Iphone',phone:'Phone'};
  const explicitDefs={
    stock:{title:'Stock',emoji:'📦',templates:{operacional:['stockStats','stockMain'],minimal:['stockMain'],analise:['stockStats','stockMain']},widgets:{
      stockStats:{title:'Resumo do Stock',emoji:'📊',subtitle:'Contadores principais do stock',selector:'.stats-grid',w:12,h:1},
      stockMain:{title:'Gestão de Stock',emoji:'📦',subtitle:'Pesquisa, scanner QR e lista de toners',selector:'main > .panel',w:12,h:5}
    }},
    impressoras:{title:'Impressoras',emoji:'🖨️',templates:{operacional:['printerStats','printerDiagnostics','printerList'],minimal:['printerList'],analise:['printerStats','printerDiagnostics','printerList']},widgets:{
      printerStats:{title:'Resumo das Impressoras',emoji:'📊',subtitle:'Contadores e estado geral',selector:'.stats-grid',w:12,h:1},
      printerDiagnostics:{title:'Diagnóstico de Toner',emoji:'🧪',subtitle:'Alertas e leituras importantes',selector:'.toner-diagnostics-panel',w:12,h:2},
      printerList:{title:'Lista de Impressoras',emoji:'🖨️',subtitle:'Tabela e gestão de impressoras',selector:'main > .panel:not(.toner-diagnostics-panel)',w:12,h:5}
    }},
    diretorio:{title:'Diretório',emoji:'☎️',templates:{operacional:['dirActions','dirFilters','dirStats','dirList'],minimal:['dirFilters','dirList'],analise:['dirStats','dirFilters','dirList']},widgets:{
      dirActions:{title:'Ações rápidas',emoji:'⚡',subtitle:'Inserir, importar, exportar e atualizar',selector:'.diretorio-actions',w:12,h:1},
      dirFilters:{title:'Pesquisa e Filtros',emoji:'🔎',subtitle:'Encontrar contactos por armazém, secção ou texto',selector:'.diretorio-filtros',w:12,h:2},
      dirStats:{title:'Resumo do Diretório',emoji:'📊',subtitle:'Totais por contacto, armazém e secção',selector:'.diretorio-stats',w:12,h:1},
      dirList:{title:'Contactos',emoji:'☎️',subtitle:'Lista organizada por Armazém > Secção',selector:'#diretorioLista',w:12,h:6}
    }}
  };
  const pageMeta={
    'add-toner': ['Adicionar Toner','➕'], historico:['Histórico','🧾'], tarefas:['Tarefas','✅'],
    'equipas-semanais':['Equipas Semanais','👥'], 'scanner-ia':['Scanner IA','📄'], 'etiquetas-word':['Etiquetas Word','🏷️'],
    computadores:['Computadores','💻'], 'manutencao-impressoras':['Manutenção Impressoras','🛠️'], pistolas:['Pistolas CK65','📱'],
    portas:['Portas Rede','🌐'], radios:['Rádios','📡'], informacoes:['Informações','ℹ️'], users:['Users','👥'],
    diagnostico:['Diagnóstico','🩺'], notificacoes:['Notificações','🔔']
  };
  const layouts={}; let currentPage=null; let currentEditorPage='stock'; let editMode=false;
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function getDb(){try{return window.firebase&&firebase.apps&&firebase.apps.length&&firebase.firestore?firebase.firestore():null;}catch(e){return null;}}
  function toast(msg){try{let t=document.querySelector('.page-widget-toast');if(!t){t=document.createElement('div');t.className='page-widget-toast';document.body.appendChild(t);}t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2400);}catch(e){console.log(msg);}}
  function pathPage(){return (location.pathname||'').split('/').pop().replace('.html','')||'index';}
  function detectPage(){const p=pathPage(); if(p==='index'||p==='config')return null; return p;}
  function isIphone(){return /iPhone/i.test(navigator.userAgent||'') || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1&&Math.min(innerWidth,innerHeight)<500);}
  function deviceProfile(){const w=Math.min(innerWidth||1200, screen.width||1200); if(isIphone())return 'iphone'; if(w<720)return 'phone'; if(w<1180)return 'tablet'; return 'desktop';}
  function profileLabel(){return {desktop:'💻 PC',tablet:'📟 Tablet',iphone:'📱 iPhone',phone:'📱 Telemóvel'}[deviceProfile()]||'💻 PC';}
  function docId(page,profile=deviceProfile()){const base=(page.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())+'Layout');return base+(PROFILE_DOC_SUFFIX[profile]||'Desktop');}
  function legacyDocId(page){const legacy={stock:'stockLayout',impressoras:'impressorasLayout',diretorio:'diretorioLayout'};return legacy[page]||page.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())+'Layout';}
  function titleFromElement(el,idx){const h=el.querySelector('h1,h2,h3,.card-title,.panel-title,.section-title,.page-hero-title');return (h&&h.textContent.trim())||el.getAttribute('aria-label')||el.dataset.widgetTitle||('Bloco '+(idx+1));}
  function emojiFor(idx){return ['📌','📋','⚡','🔎','📊','🧩','🛠️','📁','✅','⭐'][idx%10];}
  function autoDefinePage(page){const meta=pageMeta[page]||[page.replace(/-/g,' '),'🧩'];const main=document.querySelector('main.main');const widgets={};const ids=[]; if(main){const kids=Array.from(main.children).filter(el=>{
      if(!el||el.hidden)return false; if(el.matches('.page-hero,.page-widget-toolbar,.page-widget-grid,.page-widget-originals,.dashboard-widget-toolbar,#dashboardWidgetGrid,script,style'))return false;
      if(el.offsetParent===null && !el.textContent.trim())return false; return true;
    });
    kids.forEach((el,idx)=>{const id='auto'+idx; el.dataset.pageAutoWidget=id; widgets[id]={title:titleFromElement(el,idx),emoji:emojiFor(idx),subtitle:'Bloco configurável desta página',selector:'[data-page-auto-widget="'+id+'"]',w:12,h:idx===0?2:4}; ids.push(id);});
  }
  if(!ids.length){widgets.mainContent={title:'Conteúdo',emoji:'📋',subtitle:'Conteúdo principal da página',selector:'main.main > :not(.page-hero):not(.page-widget-toolbar):not(.page-widget-grid)',w:12,h:5};ids.push('mainContent');}
  return {title:meta[0],emoji:meta[1],templates:{operacional:ids,minimal:ids.slice(-1),analise:ids},widgets};}
  function getDef(page){return explicitDefs[page]||autoDefinePage(page);}
  function defaultLayout(page){const def=getDef(page);return Object.keys(def.widgets).map((id,idx)=>Object.assign({id,type:id,enabled:true,order:idx+1},def.widgets[id]));}
  function normalize(page,value){const defs=getDef(page).widgets;const input=Array.isArray(value)?value:[];const map=new Map();input.forEach((it,idx)=>{if(!it)return;const id=it.id||it.type;if(!defs[id])return;map.set(id,{id,type:id,enabled:it.enabled!==false,order:Number(it.order||idx+1),w:Math.max(3,Math.min(12,Number(it.w||defs[id].w))),h:Math.max(1,Math.min(8,Number(it.h||defs[id].h)))});});Object.keys(defs).forEach((id,idx)=>{if(!map.has(id))map.set(id,{id,type:id,enabled:true,order:idx+1,w:defs[id].w,h:defs[id].h});});return Array.from(map.values()).sort((a,b)=>a.order-b.order).map((x,i)=>Object.assign(x,{order:i+1}));}
  async function loadLayout(page,profile=deviceProfile()){const key='appBragaPageLayout.'+page+'.'+profile+'.v2';let data=null;try{data=JSON.parse(localStorage.getItem(key)||'null');}catch(e){}layouts[page]=normalize(page,data||defaultLayout(page));const db=getDb();if(db){try{let snap=await db.collection('config').doc(docId(page,profile)).get();if(!snap.exists){snap=await db.collection('config').doc(legacyDocId(page)).get();}if(snap.exists){layouts[page]=normalize(page,(snap.data()||{}).widgets);localStorage.setItem(key,JSON.stringify(layouts[page]));}}catch(e){console.warn('[PageWidgets] Firebase fallback',page,e);}}return layouts[page];}
  async function saveLayout(page,silent,profile=deviceProfile()){layouts[page]=normalize(page,layouts[page]);localStorage.setItem('appBragaPageLayout.'+page+'.'+profile+'.v2',JSON.stringify(layouts[page]));const db=getDb();if(db){try{const ref=db.collection('config').doc(docId(page,profile));const old=await ref.get().catch(()=>null);if(old&&old.exists){await db.collection('config').doc(docId(page,profile)+'Backup').set({widgets:(old.data()||{}).widgets||[],profile,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),version:VERSION},{merge:true});}await ref.set({widgets:layouts[page],profile,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),version:VERSION},{merge:true});if(!silent)toast('Layout guardado na Firebase para '+profileLabel()+'.');}catch(e){console.error('[PageWidgets] save failed',e);if(!silent)toast('Guardado localmente. Firebase falhou.');}}else if(!silent)toast('Layout guardado localmente.');if(page===currentPage)renderPage(page);renderConfigEditor();}
  function move(page,id,delta){const arr=layouts[page];const i=arr.findIndex(w=>w.id===id);const j=i+delta;if(i<0||j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];arr.forEach((w,k)=>w.order=k+1);saveLayout(page,true);}
  function resize(page,id,field,delta){const it=layouts[page].find(w=>w.id===id);if(!it)return;const min=field==='w'?3:1;const max=field==='w'?12:8;it[field]=Math.max(min,Math.min(max,Number(it[field])+delta));saveLayout(page,true);}
  function applyTemplate(page,name){const def=getDef(page);const order=def.templates[name]||def.templates.operacional||Object.keys(def.widgets);const defs=def.widgets;layouts[page]=Object.keys(defs).map(id=>({id,type:id,enabled:order.includes(id),order:(order.indexOf(id)>=0?order.indexOf(id)+1:99),w:defs[id].w,h:defs[id].h})).sort((a,b)=>a.order-b.order).map((x,i)=>Object.assign(x,{order:i+1}));saveLayout(page);}
  function ensureFloatingToggle(page){let btn=document.querySelector('.page-edit-floating-toggle');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='page-edit-floating-toggle';document.body.appendChild(btn);}btn.textContent=editMode?'✓ Terminar edição':'⚙️ Modo Edição';btn.onclick=()=>{editMode=!editMode;renderPage(page);};}
  function createToolbar(page){const def=getDef(page);const bar=document.createElement('section');bar.className='page-widget-toolbar'+(editMode?' is-visible':'');bar.innerHTML=`<div><strong>${def.emoji} Modo Edição — ${def.title}</strong><small>Layout deste dispositivo: ${profileLabel()}. Ajusta widgets, ordem e tamanho.</small></div><div class="page-widget-toolbar-actions"><button type="button" data-page-edit>${editMode?'✓ Terminar edição':'⚙️ Modo Edição'}</button><button type="button" data-page-template="operacional">⚡ Operacional</button><button type="button" data-page-template="minimal">✨ Minimal</button><button type="button" data-page-template="analise">📊 Análise</button><button type="button" data-page-reload>↻ Recarregar</button></div>`;bar.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;if(b.hasAttribute('data-page-edit')){editMode=!editMode;renderPage(page);}if(b.dataset.pageTemplate)applyTemplate(page,b.dataset.pageTemplate);if(b.hasAttribute('data-page-reload')){await loadLayout(page);renderPage(page);toast('Layout recarregado.');}});return bar;}
  function makeWidget(page,item,content){const def=getDef(page).widgets[item.id];const card=document.createElement('section');card.className='page-widget';card.dataset.widgetId=item.id;card.style.setProperty('--widget-w',item.w||def.w);card.style.setProperty('--widget-h',item.h||def.h);card.innerHTML=`<div class="page-widget-head"><div><div class="page-widget-title"><span class="emoji">${def.emoji}</span><span>${def.title}</span></div><p class="page-widget-subtitle">${def.subtitle}</p></div><div class="page-widget-edit-actions"><button type="button" data-act="up">↑</button><button type="button" data-act="down">↓</button><button type="button" data-act="wide">↔</button><button type="button" data-act="tall">↕</button><button type="button" data-act="hide">Ocultar</button></div></div><div class="page-widget-body"></div>`;card.querySelector('.page-widget-body').appendChild(content);card.addEventListener('click',ev=>{const b=ev.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;if(act==='up')move(page,item.id,-1);if(act==='down')move(page,item.id,1);if(act==='wide')resize(page,item.id,'w',item.w>=12?-3:3);if(act==='tall')resize(page,item.id,'h',item.h>=8?-1:1);if(act==='hide'){item.enabled=false;saveLayout(page,true);}});return card;}
  function renderPage(page){const main=document.querySelector('main.main');if(!main)return;getDef(page);let holder=main.querySelector('.page-widget-originals');if(!holder){holder=document.createElement('div');holder.className='page-widget-originals';holder.hidden=true;main.appendChild(holder);}main.querySelectorAll('.page-widget-grid,.page-widget-toolbar').forEach(n=>n.remove());ensureFloatingToggle(page);const layout=normalize(page,layouts[page]||defaultLayout(page));layouts[page]=layout;const hero=main.querySelector('.page-hero')||main.firstElementChild;const toolbar=createToolbar(page);if(hero&&hero.parentNode===main)hero.insertAdjacentElement('afterend',toolbar);else main.prepend(toolbar);const grid=document.createElement('section');grid.className='page-widget-grid'+(editMode?' page-layout-editing':'');toolbar.insertAdjacentElement('afterend',grid);layout.forEach(item=>{const def=getDef(page).widgets[item.id];let el=holder.querySelector('[data-page-widget-original="'+item.id+'"]')||main.querySelector(def.selector);if(!el)return;el.dataset.pageWidgetOriginal=item.id;if(item.enabled!==false)grid.appendChild(makeWidget(page,item,el));else holder.appendChild(el);});}
  async function initPage(){currentPage=detectPage();if(!currentPage)return;document.body.classList.add('page-widgets-ready');await loadLayout(currentPage);renderPage(currentPage);}
  async function ensureAllLoaded(){for(const p of Object.keys(explicitDefs).concat(Object.keys(pageMeta))){if(!layouts[p])await loadLayout(p);}}
  let editorRenderSeq=0;
  function editorPages(){
    return Object.keys(explicitDefs).concat(Object.keys(pageMeta)).filter((v,i,a)=>a.indexOf(v)===i);
  }
  function renderConfigEditor(){
    const mount=document.getElementById('pageWidgetsEditorMount');
    if(!mount)return;
    const seq=++editorRenderSeq;
    const pages=editorPages();
    if(!currentEditorPage||!pages.includes(currentEditorPage))currentEditorPage='stock';
    mount.innerHTML='<div class="page-layout-editor page-layout-loading"><strong>⚙️ A carregar editor de páginas...</strong></div>';
    ensureAllLoaded().then(()=>{
      if(seq!==editorRenderSeq)return;
      const p=currentEditorPage;
      if(!layouts[p])layouts[p]=normalize(p,defaultLayout(p));
      const def=getDef(p);
      const selectedLabel=`${def.emoji} ${def.title}`;
      mount.innerHTML=`<div class="page-layout-editor">
        <div class="page-layout-editor-header page-layout-editor-header-pro">
          <div>
            <strong>Widgets por página</strong>
            <p class="section-subtitle">Escolhe a página no seletor. A lista de baixo muda conforme a página escolhida. Layout deste dispositivo: ${profileLabel()}.</p>
          </div>
          <div class="page-layout-current-page"><span>Página ativa</span><strong>${selectedLabel}</strong></div>
        </div>
        <div class="page-layout-page-picker">
          <label>Escolher página</label>
          <select id="pageWidgetsPageSelect">${pages.map(k=>`<option value="${k}" ${k===p?'selected':''}>${getDef(k).emoji} ${getDef(k).title}</option>`).join('')}</select>
        </div>
        <div class="page-layout-tabs" role="tablist">${pages.map(k=>`<button type="button" data-tab="${k}" class="${k===p?'active':''}" aria-selected="${k===p?'true':'false'}">${getDef(k).emoji} ${getDef(k).title}</button>`).join('')}</div>
        <div class="page-widget-toolbar-actions page-layout-template-actions">
          <button type="button" data-template="operacional">⚡ Operacional</button>
          <button type="button" data-template="minimal">✨ Minimal</button>
          <button type="button" data-template="analise">📊 Análise</button>
        </div>
        <div class="page-layout-list" data-current-page="${p}">${layouts[p].map(item=>{
          const w=def.widgets[item.id];
          if(!w)return '';
          return `<div class="page-layout-row" data-id="${item.id}">
            <input type="checkbox" data-field="enabled" ${item.enabled!==false?'checked':''} title="Mostrar/ocultar widget">
            <div>
              <div class="page-layout-row-title">${w.emoji} ${w.title}</div>
              <small>${w.subtitle}</small>
            </div>
            <label class="page-layout-mini-field"><span>Tamanho</span><select data-field="w"><option value="3">Pequeno</option><option value="6">Médio</option><option value="9">Grande</option><option value="12">Largura total</option></select></label>
            <label class="page-layout-mini-field"><span>Altura</span><input type="number" min="1" max="8" value="${item.h}" data-field="h"></label>
            <label class="page-layout-mini-field"><span>Ordem</span><input type="number" min="1" max="20" value="${item.order}" data-field="order"></label>
            <div class="page-layout-row-actions"><button type="button" data-act="up">↑</button><button type="button" data-act="down">↓</button></div>
          </div>`;
        }).join('')}</div>
        <div class="dashboard-config-footer">
          <button class="primary-btn" type="button" data-save>Guardar na Firebase</button>
          <button class="secondary-btn" type="button" data-reload>Recarregar</button>
          <button class="secondary-btn" type="button" data-reset>Restaurar padrão</button>
        </div>
      </div>`;
      const rerenderForPage=(next)=>{
        if(!next||next===currentEditorPage)return;
        currentEditorPage=next;
        renderConfigEditor();
      };
      const select=mount.querySelector('#pageWidgetsPageSelect');
      if(select)select.onchange=()=>rerenderForPage(select.value);
      mount.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>rerenderForPage(b.dataset.tab));
      mount.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>applyTemplate(p,b.dataset.template));
      mount.querySelectorAll('.page-layout-row').forEach(row=>{
        const id=row.dataset.id;
        const it=layouts[p].find(x=>x.id===id);
        const sel=row.querySelector('select[data-field="w"]');
        if(sel&&it)sel.value=String(it.w);
        row.addEventListener('change',ev=>{
          const field=ev.target.dataset.field;
          const item=layouts[p].find(x=>x.id===id);
          if(!field||!item)return;
          if(field==='enabled')item.enabled=ev.target.checked;
          if(field==='w')item.w=Number(ev.target.value);
          if(field==='h')item.h=Number(ev.target.value);
          if(field==='order')item.order=Number(ev.target.value);
          layouts[p].sort((a,b)=>Number(a.order)-Number(b.order));
          layouts[p].forEach((x,i)=>x.order=i+1);
          saveLayout(p,true);
        });
        row.addEventListener('click',ev=>{
          const b=ev.target.closest('[data-act]');
          if(!b)return;
          move(p,id,b.dataset.act==='up'?-1:1);
        });
      });
      const save=mount.querySelector('[data-save]');
      if(save)save.onclick=()=>saveLayout(p);
      const reload=mount.querySelector('[data-reload]');
      if(reload)reload.onclick=async()=>{await loadLayout(p);renderConfigEditor();toast('Layout recarregado.');};
      const reset=mount.querySelector('[data-reset]');
      if(reset)reset.onclick=()=>{if(confirm('Restaurar layout padrão desta página?')){layouts[p]=clone(defaultLayout(p));saveLayout(p);}};
    }).catch(err=>{
      console.error('[PageWidgets] editor failed',err);
      mount.innerHTML='<div class="page-layout-editor"><strong>Erro ao carregar editor de páginas.</strong><p class="section-subtitle">Abre a consola para ver o erro real.</p></div>';
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    if(pathPage()==='config'){
      document.body.classList.remove('page-widgets-ready');
      document.querySelectorAll('.page-edit-floating-toggle,.page-widget-toolbar,.page-widget-grid').forEach(n=>n.remove());
    }
    initPage();
    renderConfigEditor();
  });
  window.AppBragaPageWidgets={loadLayout,saveLayout,renderPage,renderConfigEditor,applyTemplate,deviceProfile,get layouts(){return layouts;}};
})();
