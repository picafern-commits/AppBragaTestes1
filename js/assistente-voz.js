(function(){
  'use strict';

  const $ = (id) => document.getElementById(id);
  const db = () => window.db || null;
  let pendingAction = null;

  const pageMap = [
    ['dashboard','index.html'], ['inicio','index.html'], ['início','index.html'],
    ['stock','stock.html'], ['diretorio','diretorio.html'], ['diretório','diretorio.html'],
    ['tarefas','tarefas.html'], ['equipas','equipas-semanais.html'], ['equipa','equipas-semanais.html'],
    ['notificacoes','notificacoes.html'], ['notificações','notificacoes.html'],
    ['impressoras','impressoras.html'], ['scanner','scanner-ia.html'], ['scanner ia','scanner-ia.html'],
    ['historico','historico.html'], ['histórico','historico.html'], ['adicionar toner','add-toner.html'],
    ['configuracoes','config.html'], ['configurações','config.html']
  ];

  function toast(message, type){
    if (typeof window.mostrarMensagem === 'function') return window.mostrarMensagem(message, type || 'sucesso');
    console[type === 'erro' ? 'error' : 'log'](message);
  }
  function normalise(text){
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  }
  function setResult(html, type){
    const host = $('voiceAssistantResult');
    if (!host) return;
    host.dataset.state = type || '';
    host.innerHTML = html;
  }
  function showConfirm(label, action){
    pendingAction = action;
    const box = $('voiceAssistantConfirm');
    const txt = $('voiceAssistantConfirmText');
    if (txt) txt.textContent = label;
    box?.classList.add('is-visible');
  }
  function hideConfirm(){
    pendingAction = null;
    $('voiceAssistantConfirm')?.classList.remove('is-visible');
  }
  function escapeHtml(value){
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function extractCode(text){
    const raw = String(text || '').trim();
    const patterns = [
      /\b(TON[-\s]*\d{1,8})\b/i,
      /\b(SDS[-\s]*\d{1,8})\b/i,
      /\b(S\d{4,12})\b/i,
      /\b([A-Z]{2,5}[-_ ]?\d{1,10})\b/i,
      /\b(\d{3,12})\b/
    ];
    for (const re of patterns) {
      const m = raw.match(re);
      if (m) return String(m[1]).replace(/\s+/g,'-').toUpperCase();
    }
    return '';
  }

  async function moveTonerToHistory(code){
    if (!code) throw new Error('Não encontrei o código do toner no comando.');
    if (typeof window.usarPorCodigoEtiquetaToner === 'function') {
      await window.usarPorCodigoEtiquetaToner(code);
      return { ok:true, message:`Pedido enviado para mover ${code} para o histórico.` };
    }
    if (!db()?.collection) throw new Error('Firebase indisponível.');
    const fields = ['codigoEtiqueta','idInterno','serie','sdsRef','codigoScan'];
    let foundDoc = null;
    for (const field of fields) {
      const snap = await db().collection('stock').where(field,'==',code).limit(1).get();
      if (!snap.empty) { foundDoc = snap.docs[0]; break; }
    }
    if (!foundDoc) {
      const snap = await db().collection('stock').limit(250).get();
      foundDoc = snap.docs.find(doc => {
        const d = doc.data() || {};
        return [doc.id,d.codigoEtiqueta,d.idInterno,d.serie,d.sdsRef,d.codigoScan].some(v => normalise(v).includes(normalise(code)));
      });
    }
    if (!foundDoc) throw new Error(`Não encontrei ${code} no stock.`);
    const data = foundDoc.data() || {};
    await db().collection('historico').add({ ...data, estado:'usado', usadoAt:new Date(), stockDocId:foundDoc.id, created:new Date(), origemAssistente:true });
    await db().collection('stock').doc(foundDoc.id).delete();
    return { ok:true, message:`${data.idInterno || data.codigoEtiqueta || code} foi movido para o histórico.` };
  }

  async function createTaskFromCommand(text){
    if (!db()?.collection) throw new Error('Firebase indisponível.');
    let title = String(text || '')
      .replace(/^(cria|criar|adiciona|adicionar)\s+(uma\s+)?tarefa\s*/i,'')
      .replace(/\s+(para|ate|até)\s+(amanha|amanhã|hoje)$/i,'')
      .trim();
    if (!title) throw new Error('Diz o texto da tarefa.');
    const n = normalise(text);
    let dueDate = '';
    if (/\bamanha\b/.test(n)) {
      const d = new Date(); d.setDate(d.getDate()+1); dueDate = d.toISOString().slice(0,10);
    } else if (/\bhoje\b/.test(n)) dueDate = new Date().toISOString().slice(0,10);
    const priority = /urgente|prioridade|alta/.test(n) ? 'urgente' : 'normal';
    await db().collection('personalTasks').add({ title, priority, dueDate, status:'open', done:false, createdAt:Date.now(), updatedAt:Date.now(), source:'assistente-voz' });
    return { ok:true, message:`Tarefa criada: ${title}${dueDate ? ` (${dueDate})` : ''}.` };
  }

  async function getTeamWeek(){
    if (!db()?.collection) throw new Error('Firebase indisponível.');
    const [teamsSnap, cfgDoc] = await Promise.all([
      db().collection('equipasSemanais').get(),
      db().collection('config').doc('equipasSemanais').get().catch(()=>null)
    ]);
    const teams = teamsSnap.docs.map(doc => ({ idDoc:doc.id, ...doc.data() })).sort((a,b)=>Number(a.ordem||9999)-Number(b.ordem||9999));
    if (!teams.length) return 'Ainda não existem equipas semanais.';
    const cfg = cfgDoc?.exists ? (cfgDoc.data() || {}) : {};
    let list = teams;
    if (cfg.firstTeamId) {
      const idx = teams.findIndex(t => t.idDoc === cfg.firstTeamId);
      if (idx > 0) list = [...teams.slice(idx), ...teams.slice(0,idx)];
    }
    const mondayOf = (date) => { const d = new Date(date); d.setHours(0,0,0,0); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); return d; };
    const start = mondayOf(new Date((cfg.rotationStart || new Date().toISOString().slice(0,10)) + 'T00:00:00'));
    const nowWeek = mondayOf(new Date());
    const diffWeeks = Math.floor((nowWeek - start) / (7*24*60*60*1000));
    const idx = ((diffWeeks % list.length) + list.length) % list.length;
    const current = list[idx];
    const next = list[(idx+1)%list.length];
    const members = Array.isArray(current.membros) ? current.membros : (Array.isArray(current.members) ? current.members : []);
    const memberNames = members.map(m => m.nome || m.name || m.email || m.id || m).filter(Boolean).join(', ') || 'Sem membros definidos';
    return `<strong>👥 ${escapeHtml(current.nome || 'Equipa desta semana')}</strong><br>${escapeHtml(memberNames)}<br><br><small>Próxima: ${escapeHtml(next?.nome || '-')}</small>`;
  }

  async function sendGeneralAlert(){
    if (typeof window.enviarAlertaGeralNotificacoesApp !== 'function') throw new Error('Sistema de alerta geral indisponível nesta página.');
    await window.enviarAlertaGeralNotificacoesApp();
    return { ok:true, message:'Alerta geral enviado.' };
  }

  async function interpretCommand(text){
    const clean = normalise(text);
    hideConfirm();
    if (!clean) return setResult('Escreve ou dita um comando primeiro.', 'warn');

    if (/\b(abre|abrir|vai para|ir para)\b/.test(clean)) {
      const found = pageMap.find(([key]) => clean.includes(normalise(key)));
      if (found) {
        setResult(`Vou abrir <strong>${escapeHtml(found[0])}</strong>.`, 'ok');
        setTimeout(()=>{ location.href = found[1]; }, 350);
        return;
      }
    }

    if (/equipa/.test(clean) && /(semana|trabalha|trabalhar)/.test(clean)) {
      const html = await getTeamWeek();
      return setResult(html, 'ok');
    }

    if (/(passa|mover|move|manda).*(ton|toner|sds|stock).*(historico|histórico)/.test(clean) || /(historico|histórico).*(ton|toner|sds)/.test(clean)) {
      const code = extractCode(text);
      if (!code) return setResult('Não consegui encontrar o código. Exemplo: <strong>passa TON-001 para o histórico</strong>.', 'warn');
      setResult(`Encontrei o pedido para mover <strong>${escapeHtml(code)}</strong> para o histórico.`, 'warn');
      return showConfirm(`Mover ${code} do Stock para o Histórico?`, async () => {
        const res = await moveTonerToHistory(code);
        setResult(escapeHtml(res.message), 'ok');
      });
    }

    if (/(cria|criar|adiciona|adicionar).*tarefa/.test(clean)) {
      return showConfirm('Criar tarefa com este comando?', async () => {
        const res = await createTaskFromCommand(text);
        setResult(escapeHtml(res.message), 'ok');
      });
    }

    if (/(alerta geral|enviar alerta|manda alerta)/.test(clean)) {
      setResult('Pedido de alerta geral detetado.', 'warn');
      return showConfirm('Enviar alerta geral para os outros dispositivos?', async () => {
        const res = await sendGeneralAlert();
        setResult(escapeHtml(res.message), 'ok');
      });
    }

    setResult(`Ainda não sei executar esse comando.<br><br><small>Comando recebido: ${escapeHtml(text)}</small>`, 'warn');
  }

  function fillCommand(text){
    const input = $('voiceAssistantInput');
    if (input) {
      input.value = text;
      input.focus();
    }
  }

  function bind(){
    if (!$('voiceAssistantPage')) return;
    $('voiceAssistantRun')?.addEventListener('click', () => interpretCommand($('voiceAssistantInput')?.value || '').catch(err => setResult(escapeHtml(err.message || 'Erro ao interpretar comando.'), 'bad')));
    $('voiceAssistantClear')?.addEventListener('click', () => { $('voiceAssistantInput').value = ''; setResult('Pronto para receber comando.', ''); hideConfirm(); });
    $('voiceAssistantInput')?.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') $('voiceAssistantRun')?.click();
    });
    $('voiceAssistantConfirmYes')?.addEventListener('click', async () => {
      const action = pendingAction;
      hideConfirm();
      if (!action) return;
      try { await action(); toast('Comando executado.'); }
      catch(error){ setResult(escapeHtml(error.message || 'Erro ao executar comando.'), 'bad'); toast(error.message || 'Erro ao executar comando.', 'erro'); }
    });
    $('voiceAssistantConfirmNo')?.addEventListener('click', () => { hideConfirm(); setResult('Comando cancelado.', 'warn'); });
    document.querySelectorAll('[data-voice-example]').forEach(btn => btn.addEventListener('click', () => fillCommand(btn.getAttribute('data-voice-example') || '')));
    setResult('No iPhone, toca na caixa e usa o microfone do teclado para ditar em português.', '');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true });
  else bind();
})();
