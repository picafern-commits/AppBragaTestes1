
/*
  AppBraga Systems v1.58.70
  Camada comum para movimentos, alertas, notificações, logs,
  resumo de stock, manutenção, etiquetas e diagnóstico.
*/
(function(){
  if (window.AppBragaSystems && window.AppBragaSystems.version === "1.58.70") return;

  const VERSION = "1.58.70";
  const CACHE_KEY = "appbraga-systems-cache-v1";
  const ALERT_KEYS_KEY = "appbraga-alert-keys-v1";

  const memory = {
    movimentos: [],
    alertas: [],
    notificacoes: [],
    logs: [],
    stock: [],
    impressoras: [],
    manutencoes: [],
    etiquetasWord: [],
    started: false,
    unsubscribers: []
  };

  const collections = {
    movimentos: "movimentos",
    alertas: "alertasTecnicos",
    notificacoes: "notificacoes",
    logs: "activityLog",
    stock: "stock",
    impressoras: "impressoras",
    manutencoes: "manutencoes",
    etiquetasWord: "etiquetasWord",
    diagnostico: "diagnosticoLogs"
  };

  function now(){ return new Date(); }
  function esc(v){ return String(v ?? ""); }
  function norm(v){ return esc(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(); }

  function getDb(){
    try { if (typeof getDbAppBraga === "function") return getDbAppBraga(); } catch(e) {}
    return window.db || (window.firebase && firebase.firestore ? firebase.firestore() : null);
  }

  function readLocal(){
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; } catch(e){ return {}; }
  }

  function writeLocal(){
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        movimentos: memory.movimentos.slice(0,500),
        alertas: memory.alertas.slice(0,500),
        notificacoes: memory.notificacoes.slice(0,500),
        logs: memory.logs.slice(0,500),
        updatedAt: Date.now()
      }));
    } catch(e) {}
  }

  function readAlertKeys(){
    try { return JSON.parse(localStorage.getItem(ALERT_KEYS_KEY) || "{}") || {}; } catch(e){ return {}; }
  }

  function writeAlertKeys(keys){
    try { localStorage.setItem(ALERT_KEYS_KEY, JSON.stringify(keys || {})); } catch(e) {}
  }

  function dateMs(v){
    if (!v) return 0;
    if (typeof v === "number") return v;
    if (v && typeof v.toMillis === "function") return v.toMillis();
    if (v && typeof v.toDate === "function") { try { return v.toDate().getTime(); } catch(e){} }
    if (v && v.seconds) return v.seconds * 1000;
    const raw = esc(v).trim();
    if (!raw) return 0;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return new Date(raw).getTime() || 0;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
      const [d,m,y] = raw.split(/[\/\s]/);
      return new Date(`${y}-${m}-${d}`).getTime() || 0;
    }
    return new Date(raw).getTime() || 0;
  }

  function isToday(v){
    const ms = dateMs(v);
    if (!ms) return false;
    const a = new Date(ms), b = new Date();
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function sortRecent(arr){
    return (Array.isArray(arr) ? arr : []).slice().sort((a,b) => dateMs(b.updatedAt || b.createdAt || b.data || b.date) - dateMs(a.updatedAt || a.createdAt || a.data || a.date));
  }

  function idOf(x){ return x?.idDoc || x?.firebaseId || x?.id || x?.codigoEtiqueta || x?.referencia || ""; }

  async function safeAdd(collection, data){
    const db = getDb();
    const payload = { ...data, updatedAt: data.updatedAt || now() };
    if (!payload.createdAt) payload.createdAt = now();

    if (!db || !db.collection) {
      const key = collection === collections.movimentos ? "movimentos" :
                  collection === collections.alertas ? "alertas" :
                  collection === collections.notificacoes ? "notificacoes" :
                  collection === collections.logs ? "logs" : "logs";
      payload.localId = "local-" + Date.now() + "-" + Math.random().toString(36).slice(2,8);
      memory[key].unshift(payload);
      writeLocal();
      return payload.localId;
    }

    try {
      const ref = await db.collection(collection).add(payload);
      return ref.id;
    } catch(e) {
      console.warn("AppBragaSystems safeAdd fallback", collection, e);
      payload.localId = "local-" + Date.now() + "-" + Math.random().toString(36).slice(2,8);
      memory.logs.unshift({ tipo:"erro", origem:"systems", mensagem:"Falha ao guardar em " + collection, erro:String(e), createdAt:now() });
      writeLocal();
      return payload.localId;
    }
  }

  async function safeSet(collection, id, data, merge=true){
    const db = getDb();
    if (!db || !db.collection || !id) return false;
    try {
      await db.collection(collection).doc(id).set({ ...data, updatedAt: now() }, { merge });
      return true;
    } catch(e) {
      console.warn("AppBragaSystems safeSet", collection, id, e);
      return false;
    }
  }

  async function criarMovimento(tipo, dados = {}){
    const payload = {
      tipo: tipo || dados.tipo || "movimento",
      area: dados.area || inferArea(),
      titulo: dados.titulo || dados.nome || resumoMovimento(tipo, dados),
      descricao: dados.descricao || dados.mensagem || "",
      referencia: dados.referencia || dados.codigoEtiqueta || dados.sdsRef || "",
      equipamento: dados.equipamento || dados.modelo || dados.printer || "",
      localizacao: dados.localizacao || dados.local || dados.armazem || "",
      cor: dados.cor || "",
      quantidade: Number(dados.quantidade || dados.qtd || 0) || 0,
      estado: dados.estado || "Registado",
      origem: dados.origem || "AppBraga",
      utilizador: dados.utilizador || dados.user || getCurrentUserName(),
      meta: dados.meta || {},
      createdAt: now(),
      updatedAt: now()
    };
    const id = await safeAdd(collections.movimentos, payload);
    await registarLog("movimento", payload.titulo, { movimentoId:id, ...payload });
    return id;
  }

  function resumoMovimento(tipo, d){
    const t = tipo || "movimento";
    const eq = d.equipamento || d.modelo || d.referencia || "";
    if (eq) return `${t} — ${eq}`;
    return t;
  }

  async function registarLog(tipo, mensagem, dados = {}){
    const payload = {
      tipo: tipo || "log",
      mensagem: mensagem || "",
      area: dados.area || inferArea(),
      utilizador: dados.utilizador || getCurrentUserName(),
      dados,
      createdAt: now(),
      updatedAt: now()
    };
    return safeAdd(collections.logs, payload);
  }

  async function criarNotificacao(titulo, mensagem, dados = {}){
    const payload = {
      titulo: titulo || "Notificação",
      mensagem: mensagem || "",
      prioridade: dados.prioridade || "normal",
      estado: dados.estado || "nao_lida",
      lida: false,
      area: dados.area || inferArea(),
      tipo: dados.tipo || "sistema",
      referencia: dados.referencia || "",
      equipamento: dados.equipamento || "",
      localizacao: dados.localizacao || "",
      createdAt: now(),
      updatedAt: now()
    };
    const id = await safeAdd(collections.notificacoes, payload);
    await registarLog("notificacao", payload.titulo, { notificacaoId:id, ...payload });
    return id;
  }

  async function criarAlerta(tipo, titulo, dados = {}){
    const key = dados.key || makeAlertKey(tipo, titulo, dados);
    const keys = readAlertKeys();
    const last = keys[key] || 0;
    const cooldown = dados.cooldownMs ?? 12 * 3600 * 1000;
    if (!dados.force && Date.now() - last < cooldown) return null;
    keys[key] = Date.now();
    writeAlertKeys(keys);

    const payload = {
      key,
      tipo: tipo || "alerta",
      titulo: titulo || "Alerta",
      mensagem: dados.mensagem || titulo || "Alerta",
      prioridade: dados.prioridade || "media",
      estado: dados.estado || "ativo",
      area: dados.area || inferArea(),
      referencia: dados.referencia || "",
      equipamento: dados.equipamento || "",
      localizacao: dados.localizacao || "",
      cor: dados.cor || "",
      percentagem: dados.percentagem ?? null,
      quantidade: dados.quantidade ?? null,
      createdAt: now(),
      updatedAt: now()
    };
    const id = await safeAdd(collections.alertas, payload);
    await criarNotificacao(payload.titulo, payload.mensagem, { ...payload, tipo:"alerta" });
    await registarLog("alerta", payload.titulo, { alertaId:id, ...payload });
    return id;
  }

  function makeAlertKey(tipo, titulo, dados){
    return norm([tipo, titulo, dados.referencia, dados.equipamento, dados.localizacao, dados.cor, dados.percentagem, dados.quantidade].join("|")).replace(/\s+/g,"-").slice(0,180);
  }

  async function resolverAlerta(id, motivo="Resolvido"){
    const ok = await safeSet(collections.alertas, id, { estado:"resolvido", resolvidoAt:now(), motivoResolucao:motivo });
    if (ok) await registarLog("alerta_resolvido", motivo, { alertaId:id });
    return ok;
  }

  function getCurrentUserName(){
    try {
      const u = window.currentUser || window.appUser || firebase?.auth?.().currentUser;
      return u?.displayName || u?.email || u?.nome || "Sistema";
    } catch(e) { return "Sistema"; }
  }

  function inferArea(){
    const path = location.pathname.toLowerCase();
    if (path.includes("stock")) return "Stock";
    if (path.includes("impressoras")) return "Impressoras";
    if (path.includes("add-toner")) return "Adicionar Toner";
    if (path.includes("etiquetas")) return "Etiquetas Word";
    if (path.includes("manutencao")) return "Manutenção";
    if (path.includes("historico")) return "Histórico";
    if (path.includes("dashboard")) return "Dashboard";
    if (path.includes("diagnostico")) return "Diagnóstico";
    if (path.includes("notificacoes")) return "Notificações";
    return "AppBraga";
  }

  function quantidadeStock(item){
    return Number(item?.quantidade ?? item?.qtd ?? item?.unidades ?? item?.stock ?? item?.total ?? 0) || 0;
  }

  function corOf(item){ return item?.cor || item?.color || "Sem cor"; }
  function refOf(item){ return item?.referencia || item?.sdsRef || item?.codigoEtiqueta || item?.lote || item?.serie || ""; }
  function equipOf(item){ return item?.equipamento || item?.modelo || item?.printer || item?.nome || ""; }
  function localOf(item){ return item?.localizacao || item?.local || item?.armazem || ""; }

  function calcularResumoStock(stock = memory.stock){
    const resumo = {};
    const linhas = Array.isArray(stock) ? stock : [];
    linhas.forEach(item => {
      const cor = corOf(item);
      if (!resumo[cor]) resumo[cor] = { cor, quantidade:0, referencias:0, semStock:0, items:[] };
      const q = quantidadeStock(item);
      resumo[cor].quantidade += q;
      resumo[cor].referencias += 1;
      if (q <= 0) resumo[cor].semStock += 1;
      resumo[cor].items.push(item);
    });
    return resumo;
  }

  function calcularAlertasStock(stock = memory.stock){
    const out = [];
    (Array.isArray(stock) ? stock : []).forEach(item => {
      const q = quantidadeStock(item);
      if (q <= 0) {
        out.push({
          tipo:"stock_sem_unidades",
          titulo:`Sem stock — ${corOf(item)} ${equipOf(item) || refOf(item)}`,
          prioridade:"alta",
          referencia:refOf(item),
          equipamento:equipOf(item),
          localizacao:localOf(item),
          cor:corOf(item),
          quantidade:q,
          key:`stock-zero-${refOf(item)}-${corOf(item)}`
        });
      }
    });
    return out;
  }

  function tonerPercent(item){
    const candidates = [item?.percentagem, item?.tonerPercent, item?.toner, item?.nivel, item?.nivelToner, item?.pretoPercent, item?.blackPercent];
    for (const c of candidates) {
      if (c === null || c === undefined || c === "") continue;
      const n = Number(String(c).replace("%","").trim());
      if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
    }
    return null;
  }

  function calcularAlertasToner(impressoras = memory.impressoras){
    const out = [];
    (Array.isArray(impressoras) ? impressoras : []).forEach(item => {
      const pct = tonerPercent(item);
      if (pct === null) return;
      const equipamento = equipOf(item) || "Impressora";
      const localizacao = localOf(item);
      const cor = item?.cor || "Preto";
      if (pct === 25) {
        out.push({
          tipo:"toner_25",
          titulo:`Toner a 25% — ${equipamento}`,
          mensagem:`${equipamento} — ${cor} chegou a 25% (${localizacao || "sem local"})`,
          prioridade:"media",
          equipamento, localizacao, cor, percentagem:pct,
          key:`toner25-${idOf(item)||equipamento}-${cor}`
        });
      }
      if (pct <= 0) {
        out.push({
          tipo:"toner_0",
          titulo:`Toner a 0% — ${equipamento}`,
          mensagem:`${equipamento} — ${cor} chegou a 0% (${localizacao || "sem local"})`,
          prioridade:"critica",
          equipamento, localizacao, cor, percentagem:pct,
          key:`toner0-${idOf(item)||equipamento}-${cor}`
        });
      }
      const prev = Number(item?.percentagemAnterior ?? item?.tonerAnterior ?? item?.lastPercent ?? NaN);
      if (Number.isFinite(prev) && prev <= 0 && (pct === 99 || pct === 100)) {
        out.push({
          tipo:"toner_reposto",
          titulo:`Toner reposto — ${equipamento}`,
          mensagem:`${equipamento} — ${cor} passou de 0% para ${pct}%`,
          prioridade:"baixa",
          equipamento, localizacao, cor, percentagem:pct,
          key:`toner-reposto-${idOf(item)||equipamento}-${cor}-${Date.now()}`
        });
      }
    });
    return out;
  }

  function estadoManutencao(item){
    const estado = norm(item?.estado || item?.status);
    const prio = norm(item?.prioridade || item?.prio || item?.urgencia);
    const data = item?.dataAgendada || item?.data || item?.vencimento;
    if (estado.includes("concl")) return "concluida";
    if (dateMs(data) && dateMs(data) < Date.now()) return "atrasada";
    if (prio.includes("alt") || estado.includes("crit")) return "critica";
    if (estado.includes("curso")) return "em_curso";
    if (estado.includes("agend")) return "agendada";
    return "aberta";
  }

  function calcularResumoManutencao(manutencoes = memory.manutencoes){
    const items = Array.isArray(manutencoes) ? manutencoes : [];
    return {
      total: items.length,
      abertas: items.filter(x => !["concluida"].includes(estadoManutencao(x))).length,
      hoje: items.filter(x => isToday(x.dataAgendada || x.data || x.vencimento)).length,
      concluidas7: items.filter(x => estadoManutencao(x) === "concluida" && Date.now() - dateMs(x.concluidaAt || x.updatedAt || x.data) <= 7*86400000).length,
      atrasadas: items.filter(x => estadoManutencao(x) === "atrasada").length,
      criticas: items.filter(x => estadoManutencao(x) === "critica" || norm(x.prioridade).includes("alt")).length,
      tecnicos: new Set(items.map(x => x.tecnico || x.responsavel || x.utilizador).filter(Boolean)).size
    };
  }

  function calcularAlertasManutencao(manutencoes = memory.manutencoes){
    const out = [];
    (Array.isArray(manutencoes) ? manutencoes : []).forEach(item => {
      const st = estadoManutencao(item);
      if (st === "atrasada" || st === "critica") {
        out.push({
          tipo: st === "atrasada" ? "manutencao_atrasada" : "manutencao_critica",
          titulo: `${st === "atrasada" ? "Manutenção atrasada" : "Manutenção crítica"} — ${equipOf(item) || "Equipamento"}`,
          prioridade: st === "atrasada" ? "alta" : "critica",
          equipamento: equipOf(item),
          localizacao: localOf(item),
          referencia: idOf(item),
          key:`manutencao-${st}-${idOf(item)||equipOf(item)}`
        });
      }
    });
    return out;
  }

  function calcularResumoEtiquetas(etiquetas = memory.etiquetasWord){
    const items = Array.isArray(etiquetas) ? etiquetas : [];
    const status = (i) => norm(i.estado || i.status || "gerado");
    return {
      total: items.length,
      hoje: items.filter(x => isToday(x.createdAt || x.data || x.updatedAt)).length,
      pendentes: items.filter(x => status(x).includes("pend")).length,
      falhas: items.filter(x => status(x).includes("falha") || status(x).includes("erro")).length,
      reimpressoes: items.filter(x => status(x).includes("reimpr") || norm(x.origem).includes("reimpr")).length,
      equipamentos: new Set(items.map(x => equipOf(x)).filter(Boolean)).size,
      ultimo: sortRecent(items)[0] || null
    };
  }

  async function registarTonerAdicionado(dados = {}){
    const id = await criarMovimento("entrada_stock", {
      area:"Adicionar Toner",
      titulo:`Toner adicionado — ${dados.equipamento || dados.modelo || dados.cor || "Toner"}`,
      descricao:"Registo de entrada de toner no stock.",
      ...dados
    });
    await avaliarStockEAlertas();
    return id;
  }

  async function registarEtiquetaGerada(dados = {}){
    const id = await criarMovimento("etiqueta_gerada", {
      area:"Etiquetas Word",
      titulo:`Etiqueta gerada — ${dados.referencia || dados.codigoEtiqueta || dados.equipamento || "Etiqueta"}`,
      descricao:"Documento Word de etiqueta gerado.",
      estado:"Gerado",
      ...dados
    });
    return id;
  }

  async function registarIntervencao(dados = {}){
    const id = await criarMovimento("manutencao", {
      area:"Manutenção",
      titulo:`Intervenção — ${dados.equipamento || dados.modelo || "Equipamento"}`,
      descricao:dados.pedido || dados.descricao || "Intervenção técnica registada.",
      ...dados
    });
    await avaliarManutencaoEAlertas();
    return id;
  }

  async function registarLeituraImpressora(dados = {}){
    const id = await criarMovimento("leitura_impressora", {
      area:"Impressoras",
      titulo:`Leitura — ${dados.equipamento || dados.modelo || "Impressora"}`,
      descricao:"Leitura de estado/toner registada.",
      ...dados
    });
    await avaliarTonerEAlertas();
    return id;
  }

  async function avaliarStockEAlertas(){
    const alerts = calcularAlertasStock(memory.stock);
    for (const a of alerts) await criarAlerta(a.tipo, a.titulo, a);
    return alerts;
  }

  async function avaliarTonerEAlertas(){
    const alerts = calcularAlertasToner(memory.impressoras);
    for (const a of alerts) await criarAlerta(a.tipo, a.titulo, a);
    return alerts;
  }

  async function avaliarManutencaoEAlertas(){
    const alerts = calcularAlertasManutencao(memory.manutencoes);
    for (const a of alerts) await criarAlerta(a.tipo, a.titulo, a);
    return alerts;
  }

  async function avaliarTudo(){
    const out = [];
    out.push(...await avaliarStockEAlertas());
    out.push(...await avaliarTonerEAlertas());
    out.push(...await avaliarManutencaoEAlertas());
    return out;
  }

  function bindCollection(name, collection){
    const db = getDb();
    if (!db || !db.collection) return;
    try {
      const unsub = db.collection(collection).onSnapshot(snap => {
        const arr = [];
        snap.forEach(doc => arr.push({ idDoc: doc.id, firebaseId: doc.id, ...doc.data() }));
        memory[name] = sortRecent(arr);
        dispatch();
      }, err => console.warn("AppBragaSystems realtime", collection, err));
      memory.unsubscribers.push(unsub);
    } catch(e) {
      console.warn("AppBragaSystems bindCollection", collection, e);
    }
  }

  function hydrateLocal(){
    const c = readLocal();
    memory.movimentos = c.movimentos || [];
    memory.alertas = c.alertas || [];
    memory.notificacoes = c.notificacoes || [];
    memory.logs = c.logs || [];
  }

  function dispatch(){
    writeLocal();
    try {
      window.dispatchEvent(new CustomEvent("appbraga:systems:update", { detail: getState() }));
    } catch(e) {}
  }

  function start(){
    if (memory.started) return getState();
    memory.started = true;
    hydrateLocal();

    bindCollection("movimentos", collections.movimentos);
    bindCollection("alertas", collections.alertas);
    bindCollection("notificacoes", collections.notificacoes);
    bindCollection("logs", collections.logs);
    bindCollection("stock", collections.stock);
    bindCollection("impressoras", collections.impressoras);
    bindCollection("manutencoes", collections.manutencoes);
    bindCollection("etiquetasWord", collections.etiquetasWord);

    setTimeout(avaliarTudo, 1800);
    setInterval(avaliarTudo, 10 * 60 * 1000);
    dispatch();
    return getState();
  }

  function stop(){
    memory.unsubscribers.forEach(fn => { try { fn(); } catch(e){} });
    memory.unsubscribers = [];
    memory.started = false;
  }

  function getState(){
    return {
      version: VERSION,
      movimentos: memory.movimentos,
      alertas: memory.alertas,
      notificacoes: memory.notificacoes,
      logs: memory.logs,
      stock: memory.stock,
      impressoras: memory.impressoras,
      manutencoes: memory.manutencoes,
      etiquetasWord: memory.etiquetasWord,
      resumoStock: calcularResumoStock(memory.stock),
      resumoManutencao: calcularResumoManutencao(memory.manutencoes),
      resumoEtiquetas: calcularResumoEtiquetas(memory.etiquetasWord)
    };
  }

  function diagnostico(){
    const db = getDb();
    const state = getState();
    return {
      versao: VERSION,
      firebase: !!db,
      online: navigator.onLine,
      pagina: inferArea(),
      colecoes: {
        movimentos: state.movimentos.length,
        alertas: state.alertas.length,
        notificacoes: state.notificacoes.length,
        logs: state.logs.length,
        stock: state.stock.length,
        impressoras: state.impressoras.length,
        manutencoes: state.manutencoes.length,
        etiquetasWord: state.etiquetasWord.length
      },
      resumoManutencao: state.resumoManutencao,
      resumoEtiquetas: state.resumoEtiquetas,
      updatedAt: now()
    };
  }

  // Compatibilidade: envolver funções antigas sem as partir.
  function wrapOnce(name, wrapper){
    const original = window[name];
    if (typeof original !== "function" || original.__appbragaSystemsWrapped) return;
    const wrapped = wrapper(original);
    wrapped.__appbragaSystemsWrapped = true;
    window[name] = wrapped;
  }

  function installLegacyHooks(){
    wrapOnce("gerarWordEtiquetaPartilhada", (original) => async function(...args){
      const result = await original.apply(this, args);
      try { await registarEtiquetaGerada(args[0] || {}); } catch(e) { console.warn(e); }
      return result;
    });

    wrapOnce("regerarEtiquetaWordPartilhada", (original) => async function(...args){
      const result = await original.apply(this, args);
      try { await criarMovimento("etiqueta_reimpressa", { area:"Etiquetas Word", referencia:args[0] || "", titulo:"Etiqueta reimpressa" }); } catch(e) { console.warn(e); }
      return result;
    });

    wrapOnce("guardarManutencaoFuturista", (original) => async function(...args){
      const result = await original.apply(this, args);
      try {
        await registarIntervencao({
          equipamento: document.getElementById("manutencaoModelo")?.value || "",
          serie: document.getElementById("manutencaoSerie")?.value || "",
          localizacao: document.getElementById("manutencaoLocalizacao")?.value || "",
          tecnico: document.getElementById("manutencaoTecnico")?.value || "",
          prioridade: document.getElementById("manutencaoPrioridade")?.value || "",
          estado: document.getElementById("manutencaoEstado")?.value || "",
          pedido: document.getElementById("manutencaoPedido")?.value || ""
        });
      } catch(e) { console.warn(e); }
      return result;
    });

    wrapOnce("guardarRegistro", (original) => async function(...args){
      const result = await original.apply(this, args);
      try { await criarMovimento("registo", { area:inferArea(), titulo:"Registo guardado" }); } catch(e) {}
      return result;
    });

    wrapOnce("guardarRegisto", (original) => async function(...args){
      const result = await original.apply(this, args);
      try { await criarMovimento("registo", { area:inferArea(), titulo:"Registo guardado" }); } catch(e) {}
      return result;
    });
  }

  window.AppBragaSystems = {
    version: VERSION,
    start, stop, getState, diagnostico,
    criarMovimento,
    criarAlerta,
    resolverAlerta,
    criarNotificacao,
    registarLog,
    registarTonerAdicionado,
    registarEtiquetaGerada,
    registarIntervencao,
    registarLeituraImpressora,
    avaliarTudo,
    avaliarStockEAlertas,
    avaliarTonerEAlertas,
    avaliarManutencaoEAlertas,
    calcularResumoStock,
    calcularAlertasStock,
    calcularAlertasToner,
    calcularResumoManutencao,
    calcularAlertasManutencao,
    calcularResumoEtiquetas,
    dateMs,
    isToday
  };

  // Aliases globais para páginas antigas/nova camada.
  window.criarMovimentoAppBraga = criarMovimento;
  window.criarAlertaAppBraga = criarAlerta;
  window.criarNotificacaoAppBraga = criarNotificacao;
  window.registarLogAppBraga = registarLog;
  window.registarTonerAdicionadoAppBraga = registarTonerAdicionado;
  window.registarEtiquetaGeradaAppBraga = registarEtiquetaGerada;
  window.registarIntervencaoAppBraga = registarIntervencao;
  window.registarLeituraImpressoraAppBraga = registarLeituraImpressora;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      start();
      setTimeout(installLegacyHooks, 600);
      setTimeout(installLegacyHooks, 1800);
    });
  } else {
    start();
    setTimeout(installLegacyHooks, 600);
    setTimeout(installLegacyHooks, 1800);
  }
})();
