(function(){
  'use strict';
  const pageInfo={
    'index.html': ['Dashboard','Aqui está um resumo geral do ambiente AppBraga.'],
    'impressoras.html': ['Impressoras','Monitorize o estado, suprimentos e leituras das impressoras em tempo real.'],
    'computadores.html': ['Computadores','Monitorize o estado, desempenho e atividade dos computadores em tempo real.'],
    'pistolas.html': ['Pistolas','Acompanhe o estado, localização e manutenção das pistolas de leitura.'],
    'radios.html': ['Rádios','Monitorize o estado, a comunicação e o controlo dos equipamentos de rádio.'],
    'etiquetas-word.html': ['Etiquetas','Gere novas etiquetas e acompanhe o histórico de impressões.'],
    'stock.html': ['Stock de Toners','Controle o inventário de toners e reposição de stock.'],
    'diretorio.html': ['Diretório','Contactos internos e empresas. Mantenha a informação sempre atualizada.'],
    'config.html': ['Configurações','Personalize a aplicação, preferências, segurança, notificações e backups.']
  };
  function currentFile(){return (location.pathname.split('/').pop()||'index.html').toLowerCase();}
  function iconSvg(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>';}
  function makeTopbar(){
    const main=document.querySelector('main');
    if(!main||main.querySelector('.appbraga-modern-topbar')) return;
    const top=document.createElement('div');
    top.className='appbraga-modern-topbar';
    top.innerHTML=`<div class="appbraga-top-left"><button class="appbraga-menu-dot" type="button" aria-label="Menu">☰</button><div class="appbraga-search">${iconSvg()}<span>Pesquisar equipamentos, toners, etiquetas...</span></div></div><div class="appbraga-top-actions"><button class="appbraga-icon-btn" type="button" data-count="3" title="Notificações">🔔</button><button class="appbraga-icon-btn" type="button" title="Ajuda">?</button><div class="appbraga-profile"><div class="appbraga-avatar">👤</div><div><strong>Admin</strong><span>Administrador</span></div></div></div>`;
    main.insertBefore(top,main.firstChild);
    top.querySelector('.appbraga-menu-dot').addEventListener('click',()=>document.body.classList.toggle('sidebar-open'));
  }
  function normalizeHero(){
    const file=currentFile();
    const info=pageInfo[file];
    const hero=document.querySelector('main .page-hero');
    if(!hero||!info) return;
    document.body.classList.add('appbraga-structural-redesign','page-'+file.replace('.html',''));
    let title=hero.querySelector('.page-hero-title')||hero.querySelector('h1');
    if(!title){title=document.createElement('div');title.className='page-hero-title';hero.prepend(title);} 
    title.textContent=info[0];
    let titleWrap=title.parentElement;
    if(titleWrap===hero){
      titleWrap=document.createElement('div');
      hero.insertBefore(titleWrap,title);
      titleWrap.appendChild(title);
    }
    if(!titleWrap.querySelector('.appbraga-page-subtitle')){
      const sub=document.createElement('p');sub.className='appbraga-page-subtitle';sub.textContent=info[1];titleWrap.appendChild(sub);
    }
    document.querySelectorAll('main .page-hero').forEach((h,i)=>{if(i>0) h.classList.add('appbraga-hidden-duplicate-hero');});
  }
  function buildSettingsCards(){
    if(currentFile()!=='config.html') return;
    const main=document.querySelector('main');
    const hero=main&&main.querySelector('.page-hero');
    if(!main||!hero||main.querySelector('.appbraga-settings-grid')) return;
    const grid=document.createElement('section');
    grid.className='appbraga-settings-grid';
    const cards=[['⚙️','Geral','Configurações gerais da aplicação.'],['🔔','Notificações','Configure alertas, canais e preferências.'],['〽️','Leituras','Ajuste intervalos, timeouts e regras.'],['🛡️','Segurança','Gerir autenticação, sessões e políticas.'],['☁️','Backup','Configure backups automáticos e manuais.'],['👥','Utilizadores','Gerir utilizadores, funções e permissões.']];
    grid.innerHTML=cards.map(c=>`<a class="appbraga-settings-card" href="#"><span class="appbraga-settings-icon">${c[0]}</span><span><strong>${c[1]}</strong><span>${c[2]}</span></span></a>`).join('');
    hero.insertAdjacentElement('afterend',grid);
  }
  function beautifyActions(){
    document.querySelectorAll('.primary-btn').forEach(btn=>{
      const txt=(btn.textContent||'').trim();
      if(/^\+/.test(txt)) btn.textContent=txt.replace(/^\+\s*/, '');
    });
  }
  function addPageIcons(){
    const map={
      'page-index':'🏠','page-impressoras':'🖨️','page-computadores':'💻','page-pistolas':'📟','page-radios':'📻','page-etiquetas-word':'🏷️','page-stock':'📦','page-diretorio':'👥','page-config':'⚙️'
    };
    Object.keys(map).forEach(cls=>{ if(document.body.classList.contains(cls)) document.documentElement.style.setProperty('--ab-page-icon', '"'+map[cls]+'"'); });
  }
  function init(){makeTopbar();normalizeHero();buildSettingsCards();beautifyActions();addPageIcons();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
