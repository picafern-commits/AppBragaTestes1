(function(){
  'use strict';
  const VERSION = '1.58.26';
  const PAGE_MAP = {
    'impressoras.html': { type:'impressora', title:'Impressoras', icon:'🖨️', source:'#impressorasTableBody tr' },
    'computadores.html': { type:'computador', title:'Computadores', icon:'💻', source:'#listaPC .pc-card' },
    'radios.html': { type:'radio', title:'Rádios', icon:'📡', source:'#listaRadios .radio-card' },
    'pistolas.html': { type:'pistola', title:'Pistolas CK65', icon:'📟', source:'#listaPistolas .pc-card' }
  };
  const DEFAULT_CHECKS = {
    impressora:['Ligada','Rede OK','Toner OK','Sem erro no painel','Teste de impressão','Limpeza efetuada'],
    computador:['Liga sem erros','Rede OK','TeamViewer OK','Sophos OK','Office/Teams OK','Impressora configurada'],
    radio:['Liga','Carrega corretamente','Som OK','Atribuição correta','Sem danos visíveis'],
    pistola:['Liga','Wi‑Fi OK','Scanner OK','Bateria OK','Operador correto','Sem danos visíveis']
  };

  const state = { cfg:null, selectedKey:'', current:null, checks:[], photos:[] };
  function $(s, r=document){ return r.querySelector(s); }
  function $all(s, r=document){ return Array.from(r.querySelectorAll(s)); }
  function pageName(){ return (location.pathname.split('/').pop() || 'index.html').toLowerCase(); }
  function safe(s){ return String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function slug(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90) || 'sem-id'; }
  function db(){ return window.db || (window.firebase && firebase.firestore ? firebase.firestore() : null); }
  function show(msg,type){ if(window.mostrarMensagem) window.mostrarMensagem(msg,type||'info'); else console.log(msg); }

  function readEquipmentFromDom(){
    const cfg = state.cfg;
    if(!cfg) return [];
    let items = [];
    if(cfg.type === 'impressora'){
      items = $all(cfg.source).map((tr, i) => {
        const cells = $all('td', tr).map(td => td.textContent.trim());
        const id = cells[1] || cells[4] || cells[0] || `impressora-${i+1}`;
        return { key:`${cfg.type}:${slug(id)}`, id, label: cells[0] || id, meta:[cells[1], cells[2], cells[3], cells[4]].filter(Boolean).join(' · ') };
      });
    } else if(cfg.type === 'computador'){
      items = $all(cfg.source).map((card, i) => {
        const label = $('.pc-name', card)?.textContent.trim() || `Computador ${i+1}`;
        const meta = card.textContent.replace(/\s+/g,' ').trim().slice(0,120);
        return { key:`${cfg.type}:${slug(label)}`, id:label, label, meta };
      });
    } else if(cfg.type === 'radio'){
      items = $all(cfg.source).map((card, i) => {
        const id = card.getAttribute('data-radio-id') || $('.radio-card-main strong', card)?.textContent.trim() || `radio-${i+1}`;
        const label = $('.radio-card-main strong', card)?.textContent.trim() || id;
        const meta = $('.radio-card-main small', card)?.textContent.trim() || '';
        return { key:`${cfg.type}:${slug(id)}`, id, label, meta };
      });
    } else if(cfg.type === 'pistola'){
      items = $all(cfg.source).map((card, i) => {
        const label = $('.pc-name', card)?.textContent.trim() || `Pistola ${i+1}`;
        const numLine = $all('.meta-line', card).map(x=>x.textContent.replace(/\s+/g,' ').trim()).find(t=>/^N/i.test(t)) || '';
        const id = numLine.replace(/^N[^:]*:/i,'').trim() || label;
        return { key:`${cfg.type}:${slug(id || label)}`, id, label, meta:numLine };
      });
    }
    return items.filter(it => it.label && !/sem registos/i.test(it.label));
  }

  function injectPanel(){
    if($('#equipmentExtrasPanel')) return;
    const main = $('main.main') || $('main');
    if(!main) return;
    const panel = document.createElement('section');
    panel.id = 'equipmentExtrasPanel';
    panel.className = 'equipment-extras-panel';
    panel.innerHTML = `
      <div class="equipment-extras-head">
        <div class="equipment-extras-title">
          <div class="equipment-extras-icon">${state.cfg.icon}</div>
          <div><h3>Galeria e Checklist</h3><p>Fotos e verificações rápidas por equipamento.</p></div>
        </div>
        <button class="equipment-extra-btn secondary" type="button" id="eqRefreshBtn">Atualizar lista</button>
      </div>
      <div class="equipment-extras-body">
        <div class="equipment-extras-picker">
          <label><span>Equipamento</span><select id="equipmentSelect"><option value="">A carregar...</option></select></label>
          <button class="equipment-extra-btn" type="button" id="eqOpenBtn">Abrir</button>
        </div>
        <div class="equipment-selected-meta" id="equipmentSelectedMeta">Escolhe um equipamento para ver a galeria e checklist.</div>
        <div class="equipment-extras-grid">
          <article class="equipment-extra-card">
            <h4>📋 Checklist</h4>
            <div class="equipment-extra-toolbar">
              <button class="equipment-extra-btn secondary" type="button" id="eqDefaultsBtn">Criar checklist padrão</button>
            </div>
            <div id="equipmentChecklist" class="equipment-checklist"><div class="equipment-empty">Escolhe um equipamento.</div></div>
            <div class="equipment-checklist-add"><input id="equipmentNewCheck" type="text" placeholder="Adicionar ponto à checklist"><button class="equipment-extra-btn" type="button" id="eqAddCheckBtn">Adicionar</button></div>
          </article>
          <article class="equipment-extra-card">
            <h4>📸 Galeria</h4>
            <div class="equipment-extra-toolbar">
              <input id="equipmentPhotoInput" type="file" accept="image/*" capture="environment" style="display:none">
              <button class="equipment-extra-btn" type="button" id="eqAddPhotoBtn">Adicionar foto</button>
            </div>
            <div id="equipmentGallery" class="equipment-gallery"><div class="equipment-empty">Escolhe um equipamento.</div></div>
          </article>
        </div>
      </div>`;
    const hero = $('.page-hero', main);
    if(hero && hero.nextSibling) hero.parentNode.insertBefore(panel, hero.nextSibling); else main.insertBefore(panel, main.firstChild);
    bindPanel();
  }

  function bindPanel(){
    $('#eqRefreshBtn')?.addEventListener('click', populateSelect);
    $('#eqOpenBtn')?.addEventListener('click', () => loadSelected());
    $('#equipmentSelect')?.addEventListener('change', () => loadSelected());
    $('#eqDefaultsBtn')?.addEventListener('click', createDefaultChecklist);
    $('#eqAddCheckBtn')?.addEventListener('click', addChecklistItem);
    $('#eqAddPhotoBtn')?.addEventListener('click', () => {
      if(!state.selectedKey) return show('Escolhe primeiro um equipamento.', 'erro');
      $('#equipmentPhotoInput')?.click();
    });
    $('#equipmentPhotoInput')?.addEventListener('change', handlePhoto);
  }

  function populateSelect(){
    const sel = $('#equipmentSelect'); if(!sel) return;
    const old = sel.value;
    const items = readEquipmentFromDom();
    state.items = items;
    sel.innerHTML = items.length ? `<option value="">Selecionar...</option>` + items.map(it => `<option value="${safe(it.key)}">${safe(it.label)}${it.meta ? ' — '+safe(it.meta.slice(0,70)) : ''}</option>`).join('') : `<option value="">Sem equipamentos encontrados</option>`;
    if(old && items.some(it=>it.key===old)) sel.value = old;
  }

  function getSelectedItem(){
    const key = $('#equipmentSelect')?.value || '';
    return (state.items || []).find(it => it.key === key) || null;
  }
  async function loadSelected(){
    const item = getSelectedItem();
    state.current = item;
    state.selectedKey = item ? item.key : '';
    $('#equipmentSelectedMeta').textContent = item ? `${item.label}${item.meta ? ' · '+item.meta : ''}` : 'Escolhe um equipamento.';
    if(!item){ renderChecklist([]); renderGallery([]); return; }
    await Promise.all([loadChecklist(), loadPhotos()]);
  }

  function docRef(){
    const d = db(); if(!d || !state.selectedKey) return null;
    return d.collection('equipmentExtras').doc(state.selectedKey);
  }
  async function ensureDoc(){
    const ref = docRef(); if(!ref || !state.current) return null;
    await ref.set({ type:state.cfg.type, key:state.selectedKey, label:state.current.label, meta:state.current.meta || '', updatedAt:Date.now(), version:VERSION }, { merge:true });
    return ref;
  }
  async function loadChecklist(){
    const ref = docRef();
    if(!ref){ renderChecklist([]); return; }
    try{
      const snap = await ref.get();
      state.checks = snap.exists && Array.isArray(snap.data().checklist) ? snap.data().checklist : [];
      renderChecklist(state.checks);
    }catch(e){ console.warn(e); renderChecklist([]); }
  }
  function renderChecklist(checks){
    const wrap = $('#equipmentChecklist'); if(!wrap) return;
    if(!state.selectedKey) { wrap.innerHTML = `<div class="equipment-empty">Escolhe um equipamento.</div>`; return; }
    if(!checks.length){ wrap.innerHTML = `<div class="equipment-empty">Sem checklist neste equipamento.</div>`; return; }
    wrap.innerHTML = checks.map((c,i)=>`
      <label class="equipment-check-item ${c.done?'is-done':''}">
        <input type="checkbox" ${c.done?'checked':''} data-check-index="${i}">
        <span>${safe(c.text || '-')}</span>
        <button class="equipment-extra-btn danger" type="button" data-check-delete="${i}">×</button>
      </label>`).join('');
    wrap.querySelectorAll('[data-check-index]').forEach(input => input.addEventListener('change', async e => {
      const i = Number(e.target.getAttribute('data-check-index'));
      state.checks[i].done = !!e.target.checked;
      state.checks[i].updatedAt = Date.now();
      await saveChecklist(); renderChecklist(state.checks);
    }));
    wrap.querySelectorAll('[data-check-delete]').forEach(btn => btn.addEventListener('click', async e => {
      const i = Number(e.currentTarget.getAttribute('data-check-delete'));
      state.checks.splice(i,1); await saveChecklist(); renderChecklist(state.checks);
    }));
  }
  async function saveChecklist(){
    const ref = await ensureDoc(); if(!ref) return;
    await ref.set({ checklist:state.checks, checklistUpdatedAt:Date.now() }, { merge:true });
  }
  async function createDefaultChecklist(){
    if(!state.selectedKey) return show('Escolhe primeiro um equipamento.', 'erro');
    const base = DEFAULT_CHECKS[state.cfg.type] || ['Verificado'];
    state.checks = base.map(text => ({ text, done:false, createdAt:Date.now() }));
    await saveChecklist(); renderChecklist(state.checks); show('Checklist padrão criada.', 'sucesso');
  }
  async function addChecklistItem(){
    if(!state.selectedKey) return show('Escolhe primeiro um equipamento.', 'erro');
    const input = $('#equipmentNewCheck');
    const text = input?.value.trim();
    if(!text) return;
    state.checks.push({ text, done:false, createdAt:Date.now() });
    if(input) input.value = '';
    await saveChecklist(); renderChecklist(state.checks);
  }

  async function compressImage(file){
    const dataUrl = await new Promise((resolve,reject)=>{ const r = new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); });
    const img = await new Promise((resolve,reject)=>{ const im = new Image(); im.onload=()=>resolve(im); im.onerror=reject; im.src=dataUrl; });
    const max = 1100;
    let w = img.width, h = img.height;
    if(Math.max(w,h) > max){ const ratio = max / Math.max(w,h); w = Math.round(w*ratio); h = Math.round(h*ratio); }
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
    return canvas.toDataURL('image/jpeg', .72);
  }
  async function handlePhoto(e){
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if(!file || !state.selectedKey) return;
    try{
      show('A preparar foto...', 'info');
      const dataUrl = await compressImage(file);
      const ref = await ensureDoc();
      if(!ref) return;
      await ref.collection('photos').add({ dataUrl, name:file.name || 'foto.jpg', createdAt:Date.now(), label:state.current?.label || '' });
      await loadPhotos(); show('Foto adicionada.', 'sucesso');
    }catch(err){ console.error(err); show('Erro ao adicionar foto.', 'erro'); }
  }
  async function loadPhotos(){
    const ref = docRef();
    const gallery = $('#equipmentGallery');
    if(!ref || !gallery){ renderGallery([]); return; }
    try{
      const snap = await ref.collection('photos').orderBy('createdAt','desc').limit(12).get();
      state.photos = [];
      snap.forEach(doc => state.photos.push({ id:doc.id, ...doc.data() }));
      renderGallery(state.photos);
    }catch(e){ console.warn(e); renderGallery([]); }
  }
  function renderGallery(photos){
    const gallery = $('#equipmentGallery'); if(!gallery) return;
    if(!state.selectedKey){ gallery.innerHTML = `<div class="equipment-empty">Escolhe um equipamento.</div>`; return; }
    if(!photos.length){ gallery.innerHTML = `<div class="equipment-empty">Ainda não existem fotos.</div>`; return; }
    gallery.innerHTML = photos.map(p => `<div class="equipment-photo"><img src="${safe(p.dataUrl)}" alt="Foto"><button type="button" data-photo-delete="${safe(p.id)}">×</button></div>`).join('');
    gallery.querySelectorAll('[data-photo-delete]').forEach(btn => btn.addEventListener('click', async e => {
      if(!confirm('Apagar esta foto?')) return;
      const id = e.currentTarget.getAttribute('data-photo-delete');
      const ref = docRef(); if(!ref) return;
      await ref.collection('photos').doc(id).delete();
      await loadPhotos();
    }));
  }

  function init(){
    state.cfg = PAGE_MAP[pageName()];
    if(!state.cfg) return;
    injectPanel();
    setTimeout(populateSelect, 350);
    setTimeout(populateSelect, 1200);
    setTimeout(populateSelect, 2500);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
