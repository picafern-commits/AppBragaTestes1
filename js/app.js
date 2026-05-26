
function obterImagemDashboard(modelo = "") {
  const nome = String(modelo).toLowerCase();

  if (nome.includes("p3155")) return "../img/kyocerap3155dn.png";
  if (nome.includes("pa5500")) return "../img/pa5500x.png";
  if (nome.includes("2554")) return "../img/taskalfa2554ci.png";

  return "../img/kyocera.png";
}


window.usersData = window.usersData || [];
window.pistolasData = window.pistolasData || [];
window.portasData = window.portasData || [];


const firebaseConfig = {
  apiKey: "AIzaSyCSgw4rhBLW5mq4QClulubf6e0hf5lDJbo",
  authDomain: "toner-manager-756c4.firebaseapp.com",
  projectId: "toner-manager-756c4"
};

if(typeof firebase !== "undefined"){

  if(!firebase.apps.length){
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();

  window.db = db;

}

const APP_VERSION = "1.6.3";



const BACKUP_KEYS_APP_BRAGA = {
  stock: "appBraga_backup_stock",
  historico: "appBraga_backup_historico",
  pcs: "appBraga_backup_pcs",
  manutencoes: "appBraga_backup_manutencoes"
};

function saveBackupAppBraga(key, data) {

  try {
    localStorage.setItem(key, JSON.stringify(data || []));
  } catch (e) {
    console.error("Erro backup local:", e);
  }
}

function loadBackupAppBraga(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Erro a ler backup local:", e);
    return [];
  }
}

function showBackupBadge() {
  document.querySelectorAll(".version-pill").forEach(node => {
    if (!node.dataset.backupShown) {
      node.dataset.backupShown = "1";
      node.innerHTML = `${node.textContent} <span class="backup-badge">Backup local</span>`;
    }
  });
}

function hideBackupBadge() {
  document.querySelectorAll(".version-pill").forEach(node => {
    if (node.dataset.backupShown === "1") {
      node.dataset.backupShown = "";
      node.textContent = node.textContent.replace(" Backup local", "").trim();
      if (typeof APP_BRAGA_VERSION !== "undefined") node.textContent = APP_BRAGA_VERSION;
    }
  });
}

let stockGlobal = [];
let historicoGlobal = [];
let pcsGlobal = [];
let manutencoesGlobal = [];

function el(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const node = el(id);
  if (node) node.innerText = value;
}

function normalizarTexto(valor) {
  return String(valor || "").toLowerCase().trim();
}

function mostrarMensagem(texto, tipo = "sucesso") {
  let toast = el("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast-app";
    document.body.appendChild(toast);
  }

  toast.className = `toast-app ${tipo}`;
  toast.innerText = texto;
  toast.style.display = "block";

  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.display = "none";
  }, 2200);
}

/* =========================
   DADOS IMPRESSORAS
========================= */
const impressorasData = [
  { modelo: "Kyocera P3155dn", serie: "R4B2229805", armazem: "Braga", localizacao: "Ilha 01", ip: "192.168.10.178" },
  { modelo: "Ecosys PA5500x", serie: "WD44336210", armazem: "Braga", localizacao: "Ilha 02", ip: "192.168.10.179" },
  { modelo: "Kyocera P3155dn", serie: "R4B1395508", armazem: "Braga", localizacao: "Ilha 03", ip: "192.168.10.180" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293179", armazem: "Braga", localizacao: "Ilha 04", ip: "192.168.10.181" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293180", armazem: "Braga", localizacao: "Ilha 05", ip: "192.168.10.182" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293183", armazem: "Braga", localizacao: "Balcão 01", ip: "192.168.10.184" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293184", armazem: "Braga", localizacao: "Balcão 02", ip: "192.168.10.183" },
  { modelo: "Kyocera P3155dn", serie: "R4B2230012", armazem: "Braga", localizacao: "Dep. Logistica", ip: "192.168.10.185" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293173", armazem: "Braga", localizacao: "G/Encomendas", ip: "192.168.10.186" },
  { modelo: "Kyocera P3155dn", serie: "R4B1395261", armazem: "Braga", localizacao: "Devoluções", ip: "192.168.10.187" },
  { modelo: "TASKalfa 2554ci", serie: "RVP0Z03770", armazem: "Braga", localizacao: "Escritorio", ip: "192.168.10.197" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293169", armazem: "Vila Real", localizacao: "Ilha 01", ip: "192.168.11.110" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293174", armazem: "Vila Real", localizacao: "Ilha 02", ip: "192.168.11.108" },
  { modelo: "TASKalfa 2554ci", serie: "RVP0Z03715", armazem: "Vila Real", localizacao: "Ilha 03", ip: "192.168.11.197" }
];

const IMPRESSORAS_STORAGE_KEY = "appbraga_impressoras_v1";

const manutencaoLocais = [
  "Ilha 01",
  "Ilha 02",
  "Ilha 03",
  "Ilha 04",
  "Ilha 05",
  "Balcão 01",
  "Balcão 02",
  "Dep. Logistica",
  "G/Encomendas",
  "Devoluções",
  "Escritorio"
];

const USERS_STORAGE_KEY = 'appbraga_users_custom_v1';

function prepararRefsUsers() {
  window.usersData.forEach((u, i) => {
    if (!u.idDoc && !u._ref) u._ref = `local-user-${i}`;
  });
}

function guardarUsersLocal() {
  try {
    const serializavel = window.usersData.map(u => ({ ...u }));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(serializavel));
  } catch (e) {
    console.warn('Não foi possivel guardar users no localStorage.', e);
  }
}

function carregarUsersLocal() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      prepararRefsUsers();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      prepararRefsUsers();
      return;
    }
    window.usersData.splice(0, window.usersData.length, ...parsed);
    prepararRefsUsers();
  } catch (e) {
    console.warn('Não foi possivel carregar users do localStorage.', e);
    prepararRefsUsers();
  }
}


/* =========================
   IMPRESSORAS / MANUTENÇÃO
========================= */
function obterEstadoImpressora(ip) {
  const relacionados = manutencoesGlobal.filter(m => m.ip === ip);
  if (!relacionados.length) return "OK";
  return relacionados[0].estado || "OK";
}

function badgeEstado(estado) {
  if (estado === "Pendente") return `<span class="badge pendente">Pendente</span>`;
  if (estado === "Em reparação") return `<span class="badge reparacao">Em reparação</span>`;
  if (estado === "Resolvido") return `<span class="badge resolvido">Resolvido</span>`;
  return `<span class="badge ok">OK</span>`;
}

function abrirIP(ip) {
  window.open(`http://${ip}`, "_blank");
}

function abrirManutencaoDireta(item) {
  localStorage.setItem("manutencaoPreenchida", JSON.stringify(item));
  window.location.href = "manutencao-impressoras.html";
}

function mapModeloManutencao(modelo) {
  if (modelo === "Kyocera P3155dn") return "P3155DN";
  if (modelo === "TASKalfa 2554ci") return "TASKalfa_255ci";
  if (modelo === "Ecosys PA5500x") return "PA5500x";
  return modelo;
}

function sincronizarCamposImpressora() {
  const serie = el("manutencaoSerie")?.value || "";
  const ip = el("manutencaoIP")?.value || "";

  if (serie) {
    const item = impressorasData.find(i => i.serie === serie);
    if (item) {
      if (el("manutencaoModelo")) el("manutencaoModelo").value = mapModeloManutencao(item.modelo);
      if (el("manutencaoArmazem")) el("manutencaoArmazem").value = item.armazem;
      if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = item.localizacao;
      if (el("manutencaoIP")) el("manutencaoIP").value = item.ip;
      return;
    }
  }

  if (ip) {
    const item = impressorasData.find(i => i.ip === ip);
    if (item) {
      if (el("manutencaoModelo")) el("manutencaoModelo").value = mapModeloManutencao(item.modelo);
      if (el("manutencaoArmazem")) el("manutencaoArmazem").value = item.armazem;
      if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = item.localizacao;
      if (el("manutencaoSerie")) el("manutencaoSerie").value = item.serie;
    }
  }
}

function preencherLocaisManutencao() {
  const selectLoc = el("manutencaoLocalizacao");
  if (selectLoc) {
    selectLoc.innerHTML = `
      <option value="">Selecionar localização</option>
      ${manutencaoLocais.map(loc => `<option value="${loc}">${loc}</option>`).join("")}
    `;
  }

  const selectIP = el("manutencaoIP");
  if (selectIP) {
    selectIP.innerHTML = `
      <option value="">Selecionar IP</option>
      ${impressorasData.map(item => `
        <option value="${item.ip}">
          ${item.ip} - ${item.localizacao} (${item.armazem})
        </option>
      `).join("")}
    `;
  }

  const selectSerie = el("manutencaoSerie");
  if (selectSerie) {
    selectSerie.innerHTML = `
      <option value="">Selecionar nº série</option>
      ${impressorasData.map(item => `
        <option value="${item.serie}">${item.serie}</option>
      `).join("")}
    `;
  }
}

function preencherFormularioManutencao() {
  const dados = localStorage.getItem("manutencaoPreenchida");
  if (!dados) return;

  try {
    const item = JSON.parse(dados);

    if (el("manutencaoModelo")) el("manutencaoModelo").value = mapModeloManutencao(item.modelo);
    if (el("manutencaoSerie")) el("manutencaoSerie").value = item.serie || "";
    if (el("manutencaoArmazem")) el("manutencaoArmazem").value = item.armazem || "";
    if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = item.localizacao || "";
    if (el("manutencaoIP")) el("manutencaoIP").value = item.ip || "";
    if (el("manutencaoEstado")) el("manutencaoEstado").value = "Pendente";

    localStorage.removeItem("manutencaoPreenchida");
  } catch (e) {
    console.error(e);
  }
}

function limparFormularioManutencao() {
  if (el("manutencaoTecnico")) el("manutencaoTecnico").value = "";
  if (el("manutencaoEstado")) el("manutencaoEstado").value = "Pendente";
  if (el("manutencaoArmazem")) el("manutencaoArmazem").value = "";
  if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = "";
  if (el("manutencaoModelo")) el("manutencaoModelo").value = "";
  if (el("manutencaoSerie")) el("manutencaoSerie").value = "";
  if (el("manutencaoIP")) el("manutencaoIP").value = "";
  if (el("manutencaoPedido")) el("manutencaoPedido").value = "";
  if (el("manutencaoResolucao")) el("manutencaoResolucao").value = "";
  if (el("manutencaoMotivo")) el("manutencaoMotivo").value = "";
}

async function gerarID() {
  const ref = db.collection("config").doc("contador");
  return db.runTransaction(async t => {
    const doc = await t.get(ref);
    const n = doc.exists ? ({ firebaseId: doc.id, ...doc.data() }).valor + 1 : 1;
    t.set(ref, { valor: n });
    return "TON-" + String(n).padStart(4, "0");
  });
}

async function disponivel() {
  const equipamento = el("equipamento");
  const localizacao = el("localizacao");
  const cor = el("cor");
  const data = el("data");
  const lote = el("lote");

  if (!equipamento || !cor) return;

  const eq = equipamento.value;
  const loc = localizacao ? localizacao.value : "";
  const corValue = cor.value;
  const dataValue = data ? data.value : "";
  const loteValue = lote ? lote.value : "";

  if (!eq || !corValue) {
    mostrarMensagem("Preenche o equipamento e a cor.", "erro");
    return;
  }

  try {
    const id = await gerarID();

    await db.collection("stock").add({
      idInterno: id,
      equipamento: eq,
      localizacao: loc || "Sem Localização",
      cor: corValue,
      data: dataValue || "Sem Data",
      dataFolha: (el("dataFolha") && el("dataFolha").value) || "Sem Data da Folha",
      lote: loteValue || "",
      created: new Date()
    });

    equipamento.value = "";
    if (localizacao) localizacao.value = "";
    cor.value = "";
    if (data) data.value = "";
    if (el("dataFolha")) el("dataFolha").value = "";
    if (lote) lote.value = "";

    mostrarMensagem("Toner adicionado com sucesso.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao adicionar toner.", "erro");
  }
}

db.collection("stock").orderBy("created", "desc").onSnapshot(snap => {
  stockGlobal = [];
  setText("countStock", snap.size);

  snap.forEach(doc => {
    const t = ({ firebaseId: doc.id, ...doc.data() });
    t.idDoc = doc.id;
    stockGlobal.push(t);
  });

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.stock, stockGlobal);
  hideBackupBadge();
  renderDashboardCards(stockGlobal);
  renderStockCards(stockGlobal);
  renderStockMinimoPainel();
  renderAlertasInteligentes();
  renderDashboardResumoInteligente();
  renderAlertasInteligentes();
  renderModoGestorExtremo();
}, error => {
  console.error(error);
  stockGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.stock);
  setText("countStock", stockGlobal.length);
  showBackupBadge();
  renderDashboardCards(stockGlobal);
  renderStockCards(stockGlobal);
  renderStockMinimoPainel();
  renderAlertasInteligentes();
  renderDashboardResumoInteligente();
  renderAlertasInteligentes();
  renderModoGestorExtremo();
});

db.collection("historico").orderBy("created", "desc").onSnapshot(snap => {
  historicoGlobal = [];
  setText("countUsados", snap.size);

  snap.forEach(doc => {
    const t = ({ firebaseId: doc.id, ...doc.data() });
    t.idDoc = doc.id;
    historicoGlobal.push(t);
  });

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.historico, historicoGlobal);
  hideBackupBadge();
  renderHistoricoCards(historicoGlobal);
  renderAlertasInteligentes();
  renderModoGestorExtremo();
  renderDashboardResumoInteligente();
  renderAlertasInteligentes();
  renderModoGestorExtremo();
}, error => {
  console.error(error);
  historicoGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.historico);
  setText("countUsados", historicoGlobal.length);
  showBackupBadge();
  renderHistoricoCards(historicoGlobal);
  renderAlertasInteligentes();
  renderModoGestorExtremo();
  renderDashboardResumoInteligente();
  renderAlertasInteligentes();
  renderModoGestorExtremo();
});

db.collection("pcs").orderBy("created", "desc").onSnapshot(snap => {
  pcsGlobal = [];
  setText("countPCs", snap.size);

  snap.forEach(doc => {
    const d = ({ firebaseId: doc.id, ...doc.data() });
    d.idDoc = doc.id;
    pcsGlobal.push(d);
  });

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.pcs, pcsGlobal);
  hideBackupBadge();
  renderPCCards(pcsGlobal);
  renderModoGestorExtremo();
}, error => {
  console.error(error);
  pcsGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.pcs);
  setText("countPCs", pcsGlobal.length);
  showBackupBadge();
  renderPCCards(pcsGlobal);
  renderModoGestorExtremo();
});

db.collection("manutencoes").orderBy("created", "desc").onSnapshot(snap => {
  manutencoesGlobal = [];

  snap.forEach(doc => {
    const item = ({ firebaseId: doc.id, ...doc.data() });
    item.idDoc = doc.id;
    manutencoesGlobal.push(item);
  });

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.manutencoes, manutencoesGlobal);
  hideBackupBadge();
  atualizarContadoresManutencao();
  renderManutencoes(manutencoesGlobal);
  renderImpressoras();
}, error => {
  console.error(error);
  manutencoesGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.manutencoes);
  showBackupBadge();
  atualizarContadoresManutencao();
  renderManutencoes(manutencoesGlobal);
  renderImpressoras();
});

function atualizarContadoresManutencao() {
  setText("countManutTotal", manutencoesGlobal.length);
  setText("countManutPendentes", manutencoesGlobal.filter(i => i.estado === "Pendente").length);
  setText("countManutReparacao", manutencoesGlobal.filter(i => i.estado === "Em reparação").length);
  setText("countManutResolvidos", manutencoesGlobal.filter(i => i.estado === "Resolvido").length);
}


function getCriticalityBucketsAppBraga() {
  let critical = 0;
  let warning = 0;
  let normal = 0;

  impressorasData.forEach(item => {
    const info = tonerInfoState[item.ip] || null;
    const colors = Array.isArray(info?.colors) ? info.colors : [];
    const monoPercent = typeof info?.percent === "number" ? info.percent : null;
    const allPercents = colors.map(c => c.percent).filter(v => typeof v === "number");
    if (!allPercents.length && monoPercent !== null) allPercents.push(monoPercent);

    if (!allPercents.length) {
      normal++;
      return;
    }

    const minValue = Math.min(...allPercents);
    if (minValue < 10) critical++;
    else if (minValue <= 25) warning++;
    else normal++;
  });

  return { critical, warning, normal };
}

function getTopLocalizacoesHistorico(limit = 3) {
  const counts = {};
  historicoGlobal.forEach(item => {
    const key = String(item.localizacao || "Sem Localização");
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a,b) => b[1] - a[1])
    .slice(0, limit);
}

function getUltimosMovimentos(limit = 3) {
  return [...historicoGlobal]
    .sort((a,b) => {
      const ad = a.created && a.created.seconds ? a.created.seconds : 0;
      const bd = b.created && b.created.seconds ? b.created.seconds : 0;
      return bd - ad;
    })
    .slice(0, limit);
}

function renderDashboardResumoInteligente() {
  const host = el("dashboardResumoInteligente");
  if (!host) return;

  const buckets = getCriticalityBucketsAppBraga();
  const topLocs = getTopLocalizacoesHistorico(4);
  const ultimos = getUltimosMovimentos(4);

  const critLabel = buckets.critical > 0 ? "Ação imediata" : "Sem críticos";
  const warnLabel = buckets.warning > 0 ? "Vigiar" : "Sem avisos";

  host.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <h4>Criticidade Real</h4>
        <div class="summary-value">${buckets.critical}</div>
        <div class="meta-line">${critLabel} · toner abaixo de 10%</div>
      </div>
      <div class="summary-card">
        <h4>Atenção</h4>
        <div class="summary-value">${buckets.warning}</div>
        <div class="meta-line">${warnLabel} · entre 10% e 25%</div>
      </div>
      <div class="summary-card">
        <h4>Top Localizações</h4>
        <ul class="summary-list">${topLocs.length ? topLocs.map(([k,v]) => `<li>${k} — ${v}</li>`).join("") : "<li>Sem dados ainda</li>"}</ul>
      </div>
      <div class="summary-card">
        <h4>Últimos Movimentos</h4>
        <ul class="summary-list">${ultimos.length ? ultimos.map(item => `<li>${item.equipamento || "-"} · ${item.cor || "-"} · ${item.localizacao || "-"}</li>`).join("") : "<li>Sem histórico ainda</li>"}</ul>
      </div>
    </div>`;
}

function renderDashboardCards(items) {
  try { updateEnterpriseDashboard(); } catch (e) { console.error(e); }
  const lista = el("listaDashboardStock");
  if (!lista) return;

  const searchTxt = normalizarTexto(el("searchDashboard")?.value || "");

  const criticas = impressorasData.map(item => {
    const info = tonerInfoState[item.ip] || null;
    const colors = Array.isArray(info?.colors) ? info.colors : [];
    const residue = info?.residue || null;

    const criticalColors = colors.filter(c => typeof c.percent === "number" && c.percent <= 25);
    const monoPercent = typeof info?.percent === "number" ? info.percent : null;
    const monoCritical = colors.length === 0 && monoPercent !== null && monoPercent <= 25;

    const isCritical = criticalColors.length > 0 || monoCritical;
    return { item, info, criticalColors, monoCritical, residue, isCritical };
  }).filter(entry => entry.isCritical).filter(entry => {
    if (!searchTxt) return true;
    const haystack = [
      entry.item.modelo,
      entry.item.serie,
      entry.item.ip,
      entry.item.localizacao,
      entry.item.armazem,
      ...(entry.criticalColors || []).map(c => c.label),
      entry.monoCritical ? "Preto" : ""
    ].join(" ");
    return normalizarTexto(haystack).includes(searchTxt);
  });

  if (!criticas.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem impressoras críticas</h3><p>As impressoras com toner a 25% ou menos vão aparecer aqui automaticamente.</p></div>`;
    return;
  }

  lista.innerHTML = criticas.map(({ item, info, criticalColors, monoCritical, residue }) => {
    const supplyHtml = criticalColors.length
      ? criticalColors.map(c => gerarHTMLBarraToner(c.percent, c.label, c.key)).join("")
      : (monoCritical ? gerarHTMLBarraToner(info.percent, "Preto", "black") : "");

    const residueHtml = residue ? gerarHTMLBarraToner(residue.percent, residue.label || "Resíduo", "waste") : "";

    const percentValue =
      criticalColors[0]?.percent ||
      info?.percent ||
      0;

    return `
      <div class="equipment-card dashboard-critical-card">
        <img
          src="${obterImagemDashboard(item.modelo)}"
          class="equipment-real-image"
          onerror="this.src='../img/printer.png'"
        >

        <div class="equipment-top-row">
          <h3>${item.modelo || "Kyocera"}</h3>
          <span class="status-badge offline">
            ${percentValue <= 10 ? "Crítico" : "Atenção"}
          </span>
        </div>

        <p class="equipment-model">${item.modelo || "-"}</p>

        <p class="equipment-ip">
          IP: ${item.ip || "-"}
        </p>

        <p class="equipment-local">
          Local: ${item.localizacao || "-"}
        </p>

        <div class="equipment-percent">
          Toner: ${percentValue}%
        </div>

        <div class="printer-toners-grid" style="margin-top:10px;">
          ${supplyHtml}
          ${residueHtml}
        </div>
      </div>
    `;
  }).join("");
}

function renderStockCards(items) {
  const lista = el("listaStock");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem toners em stock</h3><p>Quando adicionares toners, aparecem aqui.</p></div>`;
    return;
  }

  lista.innerHTML = items.map(t => `
    <div class="stock-card">
      <div class="stock-id">${t.idInterno}</div>
      <div class="meta-line">Equipamento: <span class="meta-value">${t.equipamento}</span></div>
      <div class="meta-line">Cor: <span class="meta-value">${t.cor}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${t.localizacao}</span></div>
      <div class="meta-line">Lote: <span class="meta-value">${t.lote || "-"}</span></div>
      <div class="meta-line">Data Scan: <span class="meta-value">${t.data || "Sem Data"}</span></div>
      <div class="meta-line">Data Folha: <span class="meta-value">${t.dataFolha || "Sem Data da Folha"}</span></div>
      <div class="card-actions">
        <button class="small-btn btn-use" onclick="usar('${t.idDoc}')">Marcar usado</button>
        <button class="small-btn btn-edit" onclick="abrirEditarStockModal('${t.idDoc}')">Editar</button>
        <button class="small-btn btn-delete" onclick="apagarStockItem('${t.idDoc}')">Apagar</button>
      </div>
    </div>
  `).join("");
}

function renderHistoricoCards(items) {
  const lista = el("listaHistorico");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem histórico</h3><p>Os toners usados vão aparecer aqui.</p></div>`;
    return;
  }

  lista.innerHTML = items.map(t => `
    <div class="history-card">
      <div class="history-id">${t.idInterno}</div>
      <div class="meta-line">Equipamento: <span class="meta-value">${t.equipamento}</span></div>
      <div class="meta-line">Cor: <span class="meta-value">${t.cor || "-"}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${t.localizacao || "Sem Localização"}</span></div>
      <div class="meta-line">Lote: <span class="meta-value">${t.lote || "-"}</span></div>
      <div class="meta-line">Data Scan: <span class="meta-value">${t.data || "Sem Data"}</span></div>
      <div class="meta-line">Data Folha: <span class="meta-value">${t.dataFolha || "Sem Data da Folha"}</span></div>
      <div class="card-actions">
        <button class="small-btn btn-edit" onclick="abrirEditarHistoricoModal('${t.idDoc}')">Editar</button>
        <button class="small-btn btn-delete" onclick="apagar('${t.idDoc}')">Apagar</button>
      </div>
    </div>
  `).join("");
}

async function usar(id) {
  try {
    const ref = db.collection("stock").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      mostrarMensagem("Toner não encontrado.", "erro");
      return;
    }

    await db.collection("historico").add({
      ...snap.data(),
      created: new Date()
    });

    await ref.delete();
    mostrarMensagem("Toner movido para histórico.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao mover para histórico.", "erro");
  }
}

async function apagar(id) {
  try {
    await db.collection("historico").doc(id).delete();
    mostrarMensagem("Histórico apagado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar.", "erro");
  }
}

function editar(id) {
  const t = stockGlobal.find(x => x.idDoc === id);
  if (!t) return;

  localStorage.setItem("editarToner", JSON.stringify(t));
  window.location.href = "add-toner.html";
}

function exportar() { exportarExcelStock(); }

function filtrar() { filtrarStockDebounced(); }

function filtrarDashboard() { filtrarDashDebounced(); }

/* =========================
   COMPUTADORES
========================= */
const passos = [
  "TEAMVIEWER HOST",
  "TEAMS",
  "DNS",
  "NOME DO SISTEMA",
  "Atribuir Dominio",
  "Desinstalar MCFee",
  "Instalar Sophos",
  "MICROSOFT 365",
  "Instalar Impressora",
  "Alterar Energia",
  "Apagar User",
  "Criar novo user"
];

function carregarChecklist() {
  const checklist = el("checklist");
  if (!checklist) return;

  checklist.innerHTML = passos.map((p, i) => `
    <label class="checkItem">
      <input type="checkbox" id="p${i}">
      <span>${p}</span>
    </label>
  `).join("");
}

function renderPCCards(items) {
  const lista = el("listaPC");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem registos de computadores</h3><p>Os computadores guardados aparecem aqui.</p></div>`;
    return;
  }

  lista.innerHTML = items.map(d => {
    const htmlPassos = (d.passos || []).map(p => `
      <div class="meta-line">${p.feito ? "✔" : "❌"} <span class="meta-value">${p.passo}</span></div>
    `).join("");

    return `
      <div class="pc-card">
        <div class="pc-name">${d.nome}</div>
        <div class="meta-line">Data: <span class="meta-value">${d.data || "Sem Data"}</span></div>
        <div class="pc-meta" style="margin-top:12px;">
          ${htmlPassos}
        </div>
        <div class="card-actions">
          <button class="small-btn btn-delete" onclick="apagarPC('${d.idDoc}')">Apagar</button>
        </div>
      </div>
    `;
  }).join("");
}

async function guardarPC() {
  const nomePC = el("nomePC");
  const dataPC = el("dataPC");

  if (!nomePC) return;

  const nome = nomePC.value.trim();
  let data = dataPC ? dataPC.value : "";

  if (!nome) {
    mostrarMensagem("Nome obrigatório.", "erro");
    return;
  }

  if (!data) data = "Sem Data";

  const dados = [];
  passos.forEach((p, i) => {
    dados.push({
      passo: p,
      feito: el("p" + i)?.checked || false
    });
  });

  try {
    await db.collection("pcs").add({
      nome,
      data,
      passos: dados,
      created: new Date()
    });

    nomePC.value = "";
    if (dataPC) dataPC.value = "";
    carregarChecklist();
    mostrarMensagem("Computador guardado com sucesso.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar computador.", "erro");
  }
}

async function apagarPC(id) {
  try {
    await db.collection("pcs").doc(id).delete();
    mostrarMensagem("Registo apagado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar registo.", "erro");
  }
}

/* =========================
   MANUTENÇÃO
========================= */
async function guardarManutencao() {
  const tecnico = el("manutencaoTecnico")?.value || "";
  const estado = el("manutencaoEstado")?.value || "Pendente";
  const armazem = el("manutencaoArmazem")?.value || "";
  const localizacao = el("manutencaoLocalizacao")?.value || "";
  const modelo = el("manutencaoModelo")?.value || "";
  const serie = el("manutencaoSerie")?.value || "";
  const ip = el("manutencaoIP")?.value || "";
  const motivo = el("manutencaoMotivo")?.value || "";
  const dataPedido = el("manutencaoPedido")?.value || "";
  const dataResolucao = el("manutencaoResolucao")?.value || "";

  if (!tecnico || !armazem || !localizacao || !modelo || !serie || !ip || !motivo || !dataPedido) {
    mostrarMensagem("Preenche os campos obrigatórios da manutenção.", "erro");
    return;
  }

  try {
    await db.collection("manutencoes").add({
      tecnico,
      estado,
      armazem,
      localizacao,
      modelo,
      serie,
      ip,
      motivo,
      dataPedido,
      dataResolucao: dataResolucao || "Sem resolução",
      created: new Date()
    });

    limparFormularioManutencao();
    mostrarMensagem("Manutenção guardada com sucesso.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar manutenção.", "erro");
  }
}

function renderManutencoes(items) {
  const lista = el("listaManutencoes");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `
      <div class="panel empty-state">
        <h3>Sem pedidos de manutenção</h3>
        <p>Os pedidos vão aparecer aqui.</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = items.map(item => `
    <div class="pc-card manut-card">
      <div class="manut-card-top">
        <div>
          <div class="pc-name">${item.modelo || "-"}</div>
          <div class="meta-line">Série: <span class="meta-value">${item.serie || "-"}</span></div>
        </div>
        <div>${badgeEstado(item.estado || "Pendente")}</div>
      </div>

      <div class="meta-line">Técnico: <span class="meta-value">${item.tecnico}</span></div>
      <div class="meta-line">Armazém: <span class="meta-value">${item.armazem}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${item.localizacao}</span></div>
      <div class="meta-line">IP: <span class="meta-value"><a href="http://${item.ip}" target="_blank" rel="noopener noreferrer">${item.ip}</a></span></div>
      <div class="meta-line">Pedido: <span class="meta-value">${item.dataPedido}</span></div>
      <div class="meta-line">Resolução: <span class="meta-value">${item.dataResolucao || "Sem resolução"}</span></div>
      <div class="meta-line">Motivo: <span class="meta-value">${item.motivo}</span></div>

      <div class="card-actions">
        <button class="small-btn btn-use" onclick="marcarResolvido('${item.idDoc}')">Resolver</button>
        <button class="small-btn btn-delete" onclick="apagarManutencao('${item.idDoc}')">Apagar</button>
      </div>
    </div>
  `).join("");
}

function filtrarManutencoes() {
  const texto = normalizarTexto(el("searchManutencoes")?.value || "");
  const estado = el("filterEstadoManutencao")?.value || "";
  const armazem = el("filterArmazemManutencao")?.value || "";

  const filtradas = manutencoesGlobal.filter(item => {
    const passaTexto =
      normalizarTexto(item.modelo).includes(texto) ||
      normalizarTexto(item.serie).includes(texto) ||
      normalizarTexto(item.ip).includes(texto) ||
      normalizarTexto(item.localizacao).includes(texto) ||
      normalizarTexto(item.motivo).includes(texto);

    const passaEstado = !estado || item.estado === estado;
    const passaArmazem = !armazem || item.armazem === armazem;

    return passaTexto && passaEstado && passaArmazem;
  });

  renderManutencoes(filtradas);
}

async function marcarResolvido(id) {
  try {
    await db.collection("manutencoes").doc(id).update({
      estado: "Resolvido",
      dataResolucao: new Date().toISOString().split("T")[0]
    });

    mostrarMensagem("Manutenção marcada como resolvida.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao atualizar manutenção.", "erro");
  }
}

async function apagarManutencao(id) {
  try {
    await db.collection("manutencoes").doc(id).delete();
    mostrarMensagem("Registo de manutenção apagado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar manutenção.", "erro");
  }
}

function carregarEdicaoToner() {
  const item = localStorage.getItem("editarToner");
  if (!item || !el("equipamento")) return;

  try {
    const toner = JSON.parse(item);
    el("equipamento").value = toner.equipamento || "";
    el("localizacao").value = toner.localizacao || "";
    el("cor").value = toner.cor || "";
    el("data").value = toner.data || "";
    if (el("lote")) el("lote").value = toner.lote || "";
    if (el("dataFolha")) el("dataFolha").value = toner.dataFolha || "";
  } catch (e) {
    console.error(e);
  }
}

function extrairPercentagemTonerDoHTML(html) {
  if (!html) return null;

  const texto = String(html);
  const linhaPreto = texto.match(/Preto[\s\S]{0,160}?(\d{1,3})\s*%/i) || texto.match(/Black[\s\S]{0,160}?(\d{1,3})\s*%/i);
  if (linhaPreto) {
    const valor = parseInt(linhaPreto[1], 10);
    if (!Number.isNaN(valor) && valor >= 0 && valor <= 100) return valor;
  }

  const match = texto.match(/(\d{1,3})\s?%/i);
  if (match) {
    const valor = parseInt(match[1], 10);
    if (!Number.isNaN(valor) && valor >= 0 && valor <= 100) return valor;
  }
  return null;
}

const tonerAlertState = {};
const tonerInfoState = {};

function corBarraToner(percentagem, cor = "black") {
  if (percentagem === null || percentagem === undefined) return "#94a3b8";
  if (cor === "cyan") return percentagem <= 20 ? "#0ea5e9" : percentagem <= 50 ? "#38bdf8" : "#06b6d4";
  if (cor === "magenta") return percentagem <= 20 ? "#db2777" : percentagem <= 50 ? "#ec4899" : "#d946ef";
  if (cor === "yellow") return percentagem <= 20 ? "#ca8a04" : percentagem <= 50 ? "#eab308" : "#facc15";
  if (cor === "waste") return percentagem >= 80 ? "#dc2626" : percentagem >= 60 ? "#d97706" : "#16a34a";
  return percentagem <= 20 ? "#dc2626" : percentagem <= 50 ? "#d97706" : "#16a34a";
}

function estadoBarraToner(percentagem, cor = "black") {
  if (percentagem === null || percentagem === undefined) return "Sem leitura";
  if (cor === "waste") {
    if (percentagem >= 80) return "Crítico";
    if (percentagem >= 60) return "Médio";
    return "Bom";
  }
  if (percentagem <= 20) return "Crítico";
  if (percentagem <= 50) return "Médio";
  return "Bom";
}

function classeEstadoToner(percentagem, cor = "black") {
  if (percentagem === null || percentagem === undefined) return "is-muted";
  if (cor === "waste") {
    if (percentagem >= 80) return "is-critical";
    if (percentagem >= 60) return "is-medium";
    return "is-good";
  }
  if (percentagem <= 20) return "is-critical";
  if (percentagem <= 50) return "is-medium";
  return "is-good";
}

function gerarHTMLBarraToner(percentagem, label = "Toner", cor = "black") {
  const estado = estadoBarraToner(percentagem, cor);
  const estadoClasse = classeEstadoToner(percentagem, cor);

  if (percentagem === null || percentagem === undefined) {
    return `
      <div class="printer-toner-box">
        <div class="printer-toner-head">
          <span class="printer-toner-title">${label}</span>
          <span class="printer-toner-status ${estadoClasse}">${estado}</span>
        </div>
        <div class="printer-toner-bar-wrap">
          <div class="printer-toner-bar printer-toner-bar-empty" style="width:100%;"></div>
        </div>
        <div class="printer-toner-foot">
          <span class="printer-toner-value">N/D</span>
        </div>
      </div>
    `;
  }

  const largura = Math.max(0, Math.min(100, percentagem));
  const barraCor = corBarraToner(percentagem, cor);

  return `
    <div class="printer-toner-box">
      <div class="printer-toner-head">
        <span class="printer-toner-title">${label}</span>
        <span class="printer-toner-status ${estadoClasse}">${estado}</span>
      </div>
      <div class="printer-toner-bar-wrap">
        <div class="printer-toner-bar" style="width:${largura}%; background:${barraCor};"></div>
      </div>
      <div class="printer-toner-foot">
        <span class="printer-toner-value">${largura}%</span>
      </div>
    </div>
  `;
}

function gerarHTMLToners(info) {
  const colorItems = info && Array.isArray(info.colors) ? info.colors : [];
  const residueItem = info && info.residue ? info.residue : null;
  const monoPercent = info && typeof info.percent === "number" ? info.percent : null;

  if (!colorItems.length && !residueItem && monoPercent === null) {
    return gerarHTMLBarraToner(null, "Toner", "black");
  }

  const blocks = [];
  colorItems.forEach((c) => blocks.push(gerarHTMLBarraToner(c.percent, c.label, c.key)));

  if (!colorItems.length && monoPercent !== null) {
    blocks.push(gerarHTMLBarraToner(monoPercent, "Preto", "black"));
  }

  if (residueItem) {
    blocks.push(gerarHTMLBarraToner(residueItem.percent, residueItem.label || "Resíduo", "waste"));
  }

  return `<div class="printer-toners-grid">${blocks.join("")}</div>`;
}

function maybeNotifyCriticalSupply(ip, info) {
  if (!info) return;

  const printer = impressorasData.find(i => i.ip === ip);
  const printerLabel = printer ? `${printer.modelo} - ${printer.localizacao}` : ip;
  const issues = [];

  (info.colors || []).forEach((item) => {
    if (typeof item.percent === "number" && item.percent <= 20) {
      issues.push(`${item.label}: ${item.percent}%`);
    }
  });

  if (info.residue && typeof info.residue.percent === "number" && info.residue.percent >= 80) {
    issues.push(`${info.residue.label || "Resíduo"}: ${info.residue.percent}%`);
  }

  const key = issues.join(" | ");
  if (!key) {
    tonerAlertState[ip] = "";
    return;
  }
  if (tonerAlertState[ip] === key) return;
  tonerAlertState[ip] = key;

  const message = `Estado crítico em ${printerLabel} — ${key}`;
  mostrarMensagem(message, "erro");

  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification("Alerta de consumíveis", { body: message });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") new Notification("Alerta de consumíveis", { body: message });
      }).catch(() => {});
    }
  }
}

async function obterTonerInfo(ip) {
  try {
    if (!window.electronAPI || !window.electronAPI.getTonerSNMP) return null;
    const resposta = await window.electronAPI.getTonerSNMP(ip);

    if (resposta && resposta.ok) {
      return {
        colors: Array.isArray(resposta.colors) ? resposta.colors : [],
        residue: resposta.residue || null,
        percent: typeof resposta.percent === "number" ? resposta.percent : null
      };
    }

    if (window.electronAPI.getPrinterHTML) {
      const htmlResp = await window.electronAPI.getPrinterHTML(ip);
      if (htmlResp && htmlResp.ok && htmlResp.body) {
        const percent = extrairPercentagemTonerDoHTML(htmlResp.body);
        return { colors: [{ key: "black", label: "Preto", percent }], residue: null };
      }
    }
    return null;
  } catch (error) {
    console.error("Erro ao obter toner da impressora:", error);
    return null;
  }
}

async function testarTonerImpressora(ip, outputId) {
  const output = el(outputId);
  if (output) {
    output.innerHTML = `
      <div class="printer-toner-box">
        <div class="printer-toner-head">
          <span class="printer-toner-title">Consumíveis</span>
          <span class="printer-toner-status is-muted">A testar</span>
        </div>
        <div class="printer-toner-bar-wrap">
          <div class="printer-toner-bar" style="width:35%;"></div>
        </div>
        <div class="printer-toner-foot">
          <span class="printer-toner-value">...</span>
        </div>
      </div>
    `;
  }

  const info = await obterTonerInfo(ip);
  tonerInfoState[ip] = info || null;

  if (output) output.innerHTML = gerarHTMLToners(info);
  if (info) maybeNotifyCriticalSupply(ip, info);
  updateTonerDiagnosticStatus(info ? "ok" : "error", { running: false, lastRunAt: new Date(), successCount: info ? 1 : 0, totalCount: 1, source: resolveDiagSource() });
  pushTonerDiagnosticLog(ip, info ? summarizeTonerInfo(info) : "sem resposta");
  renderDashboardCards();
}

async function testarTodasAsImpressoras() {
  for (const item of impressorasData) {
    const alvoId = `toner-${item.ip.replace(/\./g, "-")}`;

    if (el(alvoId)) {
      await testarTonerImpressora(item.ip, alvoId);
    } else {
      const info = await obterTonerInfo(item.ip);
      tonerInfoState[item.ip] = info || null;
      if (info) maybeNotifyCriticalSupply(item.ip, info);
    }
  }

  renderDashboardCards();
}

window.testarTonerImpressora = testarTonerImpressora;


function filtrarHistoricoPorImpressora(item) {
  const serie = String(item.serie || "");
  const loc = String(item.localizacao || "");
  const arm = String(item.armazem || "");

  return historicoGlobal.filter(h => {
    const hLoc = String(h.localizacao || "");
    const hEq = String(h.equipamento || "");
    return hLoc.includes(serie) ||
      hLoc.includes(loc) ||
      (hLoc.includes(arm) && hLoc.includes(loc)) ||
      normalizarTexto(hEq).includes(normalizarTexto(item.modelo));
  });
}

function abrirHistoricoImpressora(item) {
  const host = el("historicoImpressoraPanel");
  if (!host) return;

  const itens = filtrarHistoricoPorImpressora(item);
  const ultimo = itens[0] || null;

  host.innerHTML = `
    <div class="printer-history-card">
      <div class="section-header">
        <div>
          <h3>${item.modelo} — ${item.serie}</h3>
          <p class="section-subtitle">${item.armazem} · ${item.localizacao}</p>
        </div>
      </div>

      <div class="history-mini-grid">
        <div class="summary-card">
          <h4>Total de Toners</h4>
          <div class="summary-value">${itens.length}</div>
        </div>
        <div class="summary-card">
          <h4>Último Registo</h4>
          <div class="meta-line">${ultimo ? `${ultimo.cor || "-"} · ${ultimo.data || "Sem Data"}` : "Sem registos"}</div>
        </div>
      </div>

      <div class="printer-history-items">
        ${itens.length ? itens.slice(0,8).map(h => `
          <div class="printer-history-item">
            <div class="meta-line">ID: <span class="meta-value">${h.idInterno || "-"}</span></div>
            <div class="meta-line">Cor: <span class="meta-value">${h.cor || "-"}</span></div>
            <div class="meta-line">Data: <span class="meta-value">${h.data || "Sem Data"}</span></div>
            <div class="meta-line">Localização: <span class="meta-value">${h.localizacao || "Sem Localização"}</span></div>
          </div>
        `).join("") : `<div class="panel empty-state"><h3>Sem histórico para esta impressora</h3><p>Quando houver movimentos associados, aparecem aqui.</p></div>`}
      </div>
    </div>
  `;
}

function guardarImpressorasLocal() {
  try {
    impressorasData.forEach((item, i) => { if (!item._ref) item._ref = item.idDoc || `local-impressora-${i}`; });
    localStorage.setItem(IMPRESSORAS_STORAGE_KEY, JSON.stringify(impressorasData.map(i => ({ ...i }))));
  } catch (e) { console.warn('Não foi possivel guardar impressoras no localStorage.', e); }
}

function carregarImpressorasLocal() {
  try {
    const raw = localStorage.getItem(IMPRESSORAS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return;
    parsed.forEach((item, i) => { if (!item._ref) item._ref = item.idDoc || `local-impressora-${i}`; });
    impressorasData.splice(0, impressorasData.length, ...parsed);
  } catch (e) { console.warn('Não foi possivel carregar impressoras do localStorage.', e); }
}

function renderImpressoras(lista = impressorasData) {
  const tbody = el("impressorasTableBody");
  if (!tbody) return;

  const total = impressorasData.length;
  const ok = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "OK").length;
  const problema = impressorasData.filter(i => {
    const e = obterEstadoImpressora(i.ip);
    return e === "Pendente" || e === "Em reparação";
  }).length;
  const resolvidas = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "Resolvido").length;

  setText("countImpressoras", total);
  setText("countImpressorasOk", ok);
  setText("countImpressorasProblema", problema);
  setText("countImpressorasResolvidas", resolvidas);

  tbody.innerHTML = lista.map(item => {
    const estado = obterEstadoImpressora(item.ip);
    const tonerId = `toner-${item.ip.replace(/\./g, "-")}`;

    return `
      <tr>
        <td>${item.modelo}</td>
        <td>${item.serie}</td>
        <td>${item.armazem}</td>
        <td>${item.localizacao}</td>
        <td><a href="http://${item.ip}" target="_blank" rel="noopener noreferrer">${item.ip}</a></td>
        <td>${badgeEstado(estado)}</td>
        <td>
          <div id="${tonerId}">${gerarHTMLBarraToner(null)}</div>
          <div class="table-actions" style="margin-top:8px;">
            <button class="action-btn ip" onclick="abrirIP('${item.ip}')">Abrir IP</button>
            <button class="action-btn manut" onclick='abrirManutencaoDireta(${JSON.stringify(item)})'>Manutenção</button>
            <button class="action-btn" onclick='abrirHistoricoImpressora(${JSON.stringify(item)})'>Histórico</button>
            <button class="action-btn" onclick="window.testarTonerImpressora('${item.ip}', '${tonerId}')">Testar toner</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function filtrarImpressoras() {
  const texto = normalizarTexto(el("searchImpressoras")?.value || "");
  const armazem = el("filterArmazem")?.value || "";
  const estado = el("filterEstadoImpressora")?.value || "";

  const filtrada = impressorasData.filter(item => {
    const estadoAtual = obterEstadoImpressora(item.ip);

    const passaTexto =
      normalizarTexto(item.modelo).includes(texto) ||
      normalizarTexto(item.serie).includes(texto) ||
      normalizarTexto(item.ip).includes(texto) ||
      normalizarTexto(item.localizacao).includes(texto) ||
      normalizarTexto(item.armazem).includes(texto);

    const passaArmazem = !armazem || item.armazem === armazem;
    const passaEstado = !estado || estadoAtual === estado;

    return passaTexto && passaArmazem && passaEstado;
  });

  renderImpressoras(filtrada);
}

/* =========================
   PISTOLAS - EMPRESA EXTREMO
========================= */
function badgePistolaReserva(valor) {
 
  return String(valor || "")
    .toLowerCase()
    .includes("reserva")
 
    ? `<span class="badge reserva">Reserva</span>`
 
    : `<span class="badge ok">Ativa</span>`;
 
}

function renderPistolas(lista = window.pistolasData) {

  lista = Array.isArray(lista) ? lista : [];


 
  lista = Array.isArray(lista) ? lista : [];
 
  lista.sort((a,b)=>{
 
    const aTxt =
      String(
        a.nome ||
        a.codigo ||
        a.numero ||
        a.num ||
        ""
      )
      .toLowerCase()
      .trim();
 
    const bTxt =
      String(
        b.nome ||
        b.codigo ||
        b.numero ||
        b.num ||
        ""
      )
      .toLowerCase()
      .trim();
 
    return aTxt.localeCompare(
      bTxt,
      'pt',
      {
        numeric:true,
        sensitivity:'base'
      }
    );
 
  });
 
  
  setText("countPistolas", lista.length);

  setText(
    "countPistolasBraga",
    lista.filter(p =>
      String(p.armazem || "")
        .toLowerCase()
        .includes("braga")
    ).length
  );

  setText(
    "countPistolasReserva",
    lista.filter(p =>
      String(p.operador || "")
        .toLowerCase()
        .includes("reserva")
    ).length
  );

 
  const container = document.querySelector("#listaPistolas");
 
  if (!container) return;
 
  container.innerHTML = lista.map((p, index) => {
 
	const ref = "'" + (p.idDoc || ("local-pistola-" + index)) + "'";
 
    return `
    <div class="pc-card">

      <div class="pc-name">${p.nome || "-"}</div>
 
      <div class="meta-line">
        Nº:
        <span class="meta-value">${p.num || "-"}</span>
      </div>
 
      <div class="meta-line">
        Password:
        <span class="meta-value">${p.password || "-"}</span>
      </div>
 
      <div class="meta-line">
        CN:
        <span class="meta-value">${p.cn || "-"}</span>
      </div>
 
      <div class="meta-line">
        SN:
        <span class="meta-value">${p.sn || "-"}</span>
      </div>
 
      <div class="meta-line">
        MAC:
        <span class="meta-value">${p.mac || "-"}</span>
      </div>
 
      <div class="meta-line">
        Operador:
        <span class="meta-value">${p.operador || "-"}</span>
      </div>
 
      <div class="meta-line">
        Armazém:
        <span class="meta-value">${p.armazem || "-"}</span>
      </div>
 
      <div class="meta-line">
        Prontas:
        <span class="meta-value">${p.prontas || "-"}</span>
      </div>
 
      <div class="meta-line">
        Estado:
        <span class="meta-value">
          ${badgePistolaReserva(p.operador)}
        </span>
      </div>
 
      <div class="item-actions">
        <button class="secondary-btn" onclick="editarPistola(${ref})">
          Editar
        </button>
 
        <button class="secondary-btn" onclick="apagarPistola(${ref})">
          Apagar
        </button>
      </div>
 
    </div>
    `;
 
  }).join("");

 renderUsers(filtrado);
}	
	
function filtrarUsersComFiltros() {
  const texto = el("searchUsers")?.value || "";
  filtrarUsers(texto);
}

/* =========================
   PORTAS - EMPRESA EXTREMO
========================= */
function estadoPorta(porta) {
  const temIP = normalizarTexto(porta.ip) !== "";
  const temUser = normalizarTexto(porta.user) !== "";

  if (!temIP && !temUser) return "livre";
  if (temIP && temUser) return "ocupado";
  if (temIP && !temUser) return "semUser";
  return "livre";
}

function badgePorta(estado) {
  if (estado === "ocupado") return `<span class="badge ocupado">Ocupado</span>`;
  if (estado === "livre") return `<span class="badge livre">Livre</span>`;
  if (estado === "semUser") return `<span class="badge aviso">Sem user</span>`;
  return `<span class="badge">-</span>`;
}

function atualizarContadoresPortas(lista = window.portasData) {
  let total = lista.length;
  let usadas = 0;
  let livres = 0;
  let semUser = 0;

  lista.forEach(porta => {
    const estado = estadoPorta(porta);
    if (estado === "ocupado") usadas++;
    if (estado === "livre") livres++;
    if (estado === "semUser") semUser++;
  });

  setText("countPortas", total);
  setText("countPortasUsadas", usadas);
  setText("countPortasLivres", livres);
  setText("countPortasSemUser", semUser);
}

function renderPortas(lista = window.portasData) {
  const container = el("listaPortas");
  if (!container) return;

  atualizarContadoresPortas(lista);

  container.innerHTML = lista.map((p, index) => {
    const estado = estadoPorta(p);
    const ref = p.idDoc ? `'${p.idDoc}'` : `'${p._ref || `local-porta-${window.portasData.indexOf(p)}`}'`;
    return `
      <div class="pc-card">
        <div class="pc-name">Porta ${p.porta || "-"}</div>
        <div class="meta-line">Local: <span class="meta-value">${p.local || "-"}</span></div>
        <div class="meta-line">User: <span class="meta-value">${p.user || "-"}</span></div>
        <div class="meta-line">Equipamento: <span class="meta-value">${p.equipamento || "-"}</span></div>
        <div class="meta-line">IP: <span class="meta-value">${p.ip ? `<a href="http://${p.ip}" target="_blank">${p.ip}</a>` : "-"}</span></div>
        <div class="meta-line">Estado: <span class="meta-value">${badgePorta(estado)}</span></div>
        <div class="item-actions">
          <button
            class="secondary-btn"
            onclick="editarPorta(${ref})">
            Editar
          </button>
          <button class="secondary-btn" onclick="apagarPorta(${ref})">Apagar</button>
        </div>
      </div>
    `;
  }).join("");
}

function filtrarPortas(txt = "") {
  const texto = normalizarTexto(txt);
  const estadoSelecionado = normalizarTexto(el("filterEstadoPortas")?.value || "");

  const filtradas = window.portasData.filter(p => {
    const passaTexto =
      normalizarTexto(p.porta).includes(texto) ||
      normalizarTexto(p.local).includes(texto) ||
      normalizarTexto(p.user).includes(texto) ||
      normalizarTexto(p.ip).includes(texto);

    const passaEstado = !estadoSelecionado || estadoPorta(p) === estadoSelecionado;

    return passaTexto && passaEstado;
  });

  renderPortas(filtradas);
}

function filtrarPortasComEstado() {
  const texto = el("searchPortas")?.value || "";
  filtrarPortas(texto);
}


const PISTOLAS_STORAGE_KEY = 'appbraga_pistolas_custom_v1';
const PORTAS_STORAGE_KEY = 'appbraga_portas_custom_v1';

function prepararRefsPistolas() {
  window.pistolasData.forEach((p, i) => {
    if (!p.idDoc && !p._ref) p._ref = `local-pistola-${i}`;
  });
}

function guardarPistolasLocal() {
  try {
    const serializavel = window.pistolasData.map(p => ({ ...p }));
    localStorage.setItem(PISTOLAS_STORAGE_KEY, JSON.stringify(serializavel));
  } catch (e) {
    console.warn('Não foi possivel guardar pistolas no localStorage.', e);
  }
}

function carregarPistolasLocal() {
  try {
    const raw = localStorage.getItem(PISTOLAS_STORAGE_KEY);
    if (!raw) {
      prepararRefsPistolas();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      prepararRefsPistolas();
      return;
    }
    window.pistolasData.splice(0, window.pistolasData.length, ...parsed);
    prepararRefsPistolas();
  } catch (e) {
    console.warn('Não foi possivel carregar pistolas do localStorage.', e);
    prepararRefsPistolas();
  }
}

function prepararRefsPortas() {
  window.portasData.forEach((p, i) => {
    if (!p.idDoc && !p._ref) p._ref = `local-porta-${i}`;
  });
}

function guardarPortasLocal() {
  try {
    const serializavel = window.portasData.map(p => ({ ...p }));
    localStorage.setItem(PORTAS_STORAGE_KEY, JSON.stringify(serializavel));
  } catch (e) {
    console.warn('Não foi possivel guardar portas no localStorage.', e);
  }
}

function carregarPortasLocal() {
  try {
    const raw = localStorage.getItem(PORTAS_STORAGE_KEY);
    if (!raw) {
      prepararRefsPortas();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      prepararRefsPortas();
      return;
    }
    window.portasData.splice(0, window.portasData.length, ...parsed);
    prepararRefsPortas();
  } catch (e) {
    console.warn('Não foi possivel carregar portas do localStorage.', e);
    prepararRefsPortas();
  }
}

/* =========================
   USERS - EMPRESA EXTREMO
========================= */
function utilizadorTemMO365(u) {
  return normalizarTexto(u.user_mo365) !== "";
}

function utilizadorTemPistola(u) {
  return normalizarTexto(u.op_pistola) !== "";
}

function utilizadorTemTeamviewer(u) {
  return normalizarTexto(u.teamviewer) !== "";
}

function badgeUser(valor) {
  return valor ? `<span class="badge ok">Sim</span>` : `<span class="badge livre">Não</span>`;
}

function atualizarContadoresUsers(lista = window.usersData) {
  setText("countUsers", lista.length);
  setText("countUsersMO365", lista.filter(utilizadorTemMO365).length);
  setText("countUsersPistola", lista.filter(utilizadorTemPistola).length);
  setText("countUsersTV", lista.filter(utilizadorTemTeamviewer).length);
}

function renderUsers(lista = window.usersData) {
  const container = el("listaUsers");
  if (!container) return;

  atualizarContadoresUsers(lista);

window.usersData.sort((a,b)=>{
 
  const aTxt =
    String(a.nome || "")
      .toLowerCase()
      .trim();
 
  const bTxt =
    String(b.nome || "")
      .toLowerCase()
      .trim();
 
  return aTxt.localeCompare(
    bTxt,
    'pt',
    {
      numeric:true,
      sensitivity:'base'
    }
  );
 
});
  
  container.innerHTML = lista.map((u, index) => {
    const ref = u.idDoc ? `'${u.idDoc}'` : `'${u._ref || `local-user-${index}`}'`;
    return `
    <div class="pc-card">
      <div class="pc-name">${u.nome}</div>
      <div class="meta-line">Zona: <span class="meta-value">${u.zona || "-"}</span></div>
      <div class="meta-line">User PC/EYE: <span class="meta-value">${u.user_pc_eye || "-"}</span></div>
      <div class="meta-line">Pass Remote: <span class="meta-value">${u.pass_remote || "-"}</span></div>
      <div class="meta-line">Pass Eye Peak: <span class="meta-value">${u.pass_eye_peak || "-"}</span></div>
      <div class="meta-line">Op. Pistola: <span class="meta-value">${u.op_pistola || "-"}</span></div>
      <div class="meta-line">Pass Pistola: <span class="meta-value">${u.pass_pistola || "-"}</span></div>
      <div class="meta-line">Nome PC: <span class="meta-value">${u.nome_pc || "-"}</span></div>
      <div class="meta-line">TeamViewer: <span class="meta-value">${u.teamviewer || "-"}</span></div>
      <div class="meta-line">User MO365: <span class="meta-value">${u.user_mo365 || "-"}</span></div>
      <div class="meta-line">Pw MO365: <span class="meta-value">${u.pw_mo365 || "-"}</span></div>
      <div class="meta-line">Email Bragalis: <span class="meta-value">${u.email_bragalis || "-"}</span></div>
      <div class="meta-line">Pass Bragalis: <span class="meta-value">${u.pass_bragalis || "-"}</span></div>
      <div class="item-actions">
        <button class="secondary-btn" onclick="editarUser(${ref})">Editar</button>
		<button class="secondary-btn" onclick='imprimirUser(${JSON.stringify(u)})'>Imprimir Dados</button>
        <button class="secondary-btn" onclick="apagarUser(${ref})">Apagar</button>
      </div>
    </div>
  `;
  }).join("");
}

function filtrarUsers(txt = "") {
  const texto = normalizarTexto(txt);
  const filtroMO365 = normalizarTexto(el("filterUsersMO365")?.value || "");
  const filtroPistola = normalizarTexto(el("filterUsersPistola")?.value || "");

  const filtrado = window.usersData.filter(u => {
    const passaTexto =
      normalizarTexto(u.nome).includes(texto) ||
      normalizarTexto(u.zona).includes(texto) ||
      normalizarTexto(u.user_pc_eye).includes(texto) ||
      normalizarTexto(u.pass_remote).includes(texto) ||
      normalizarTexto(u.pass_eye_peak).includes(texto) ||
      normalizarTexto(u.op_pistola).includes(texto) ||
      normalizarTexto(u.pass_pistola).includes(texto) ||
      normalizarTexto(u.nome_pc).includes(texto) ||
      normalizarTexto(u.teamviewer).includes(texto) ||
      normalizarTexto(u.user_mo365).includes(texto) ||
      normalizarTexto(u.pw_mo365).includes(texto) ||
      normalizarTexto(u.email_bragalis).includes(texto) ||
      normalizarTexto(u.pass_bragalis).includes(texto);

    let passaMO365 = true;
    if (filtroMO365 === "sim") passaMO365 = utilizadorTemMO365(u);
    if (filtroMO365 === "nao") passaMO365 = !utilizadorTemMO365(u);

    let passaPistola = true;
    if (filtroPistola === "sim") passaPistola = utilizadorTemPistola(u);
    if (filtroPistola === "nao") passaPistola = !utilizadorTemPistola(u);

    return passaTexto && passaMO365 && passaPistola;
  });

  renderUsers(filtrado);
}

function filtrarUsersComFiltros() {
  const texto = el("searchUsers")?.value || "";
  filtrarUsers(texto);
}

function applyAppTheme(mode) {
  const isDark = mode === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("app-dark", isDark);
  document.documentElement.classList.toggle("app-light", !isDark);
  document.body.classList.toggle("dark", isDark);
  document.body.classList.toggle("app-dark", isDark);
  document.body.classList.toggle("app-light", !isDark);
  localStorage.setItem("modo", isDark ? "dark" : "light");

  document.querySelectorAll(".theme-toggle").forEach((button) => {
    button.textContent = isDark ? "Modo claro" : "Modo escuro";
    button.setAttribute("aria-pressed", String(isDark));
  });

  const sw = el("darkSwitch");
  if (sw) sw.checked = isDark;
}

function initGlobalTheme() {
  const savedMode = localStorage.getItem("modo") === "light" ? "light" : "dark";
  applyAppTheme(savedMode);

  const sidebar = document.querySelector(".sidebar");
  if (sidebar && !document.querySelector(".theme-toggle")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.addEventListener("click", () => {
      const nextMode = document.body.classList.contains("app-dark") ? "light" : "dark";
      applyAppTheme(nextMode);
    });

    const brand = sidebar.querySelector(".brand, .premium-brand, .brand-block");
    if (brand && brand.parentNode) {
      brand.insertAdjacentElement("afterend", button);
    } else {
      sidebar.insertBefore(button, sidebar.firstChild);
    }
  }

  if (sidebar && !sidebar.querySelector(".sidebar-user-card")) {
    const footer = document.createElement("div");
    footer.className = "sidebar-user-card";
    footer.innerHTML = `
      <div class="sidebar-user-avatar">BR</div>
      <div>
        <strong>Administrador</strong>
        <span>admin@appbraga.pt</span>
      </div>
    `;
    sidebar.appendChild(footer);
  }

  const sw = el("darkSwitch");
  if (sw && !sw.dataset.themeBound) {
    sw.dataset.themeBound = "1";
    sw.addEventListener("change", () => {
      applyAppTheme(sw.checked ? "dark" : "light");
    });
  }

  applyAppTheme(localStorage.getItem("modo") === "light" ? "light" : "dark");
}

function initFullScreenScroll() {
  if (window.__appBragaFullScrollBound) return;
  window.__appBragaFullScrollBound = true;

  const forwardWheelToPage = (event) => {
    const modalOpen = document.querySelector('.modal-overlay[style*="flex"], .modal-overlay.show');
    if (modalOpen && modalOpen.contains(event.target)) return;

    const interactive = event.target.closest("input, textarea, select, option");
    if (interactive) return;

    const fixedZone = event.target.closest(".sidebar, .app-menu-toggle, .app-sidebar-overlay");
    if (!fixedZone) return;

    event.preventDefault();
    window.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
      behavior: "auto"
    });
  };

  document.addEventListener("wheel", forwardWheelToPage, { passive: false, capture: true });
}

document.addEventListener("DOMContentLoaded", initFullScreenScroll);

const RADIOS_STORAGE_KEY = "appBragaRadios";
// Firestore realtime ativo - sem localStorage

let informacoesData = [];
let informacaoSelecionada = null;

function nowPt() {
  return new Date().toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function splitUsersList(value) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function safeRefHtml(value) {
  if (typeof escapeHtmlAppBraga === "function") return escapeHtmlAppBraga(value);
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[char] || char));
}

function defaultRadiosData() {
  return [1, 2, 3, 4, 5].map(numero => ({
    id: `radio-${numero}`,
    radio: String(numero),
    users: "",
    obs: "",
    updated: nowPt()
  }));
}

function loadRadiosData() {
  try {
    const raw = localStorage.getItem(RADIOS_STORAGE_KEY);
    radiosData = raw ? JSON.parse(raw) : defaultRadiosData();
  } catch (e) {
    console.warn("Não foi possivel carregar radios.", e);
    radiosData = defaultRadiosData();
  }
}

function saveRadiosData() {
  localStorage.setItem(RADIOS_STORAGE_KEY, JSON.stringify(radiosData));
  try {
    if (window.db) {
      window.db.collection("appRadios").doc("lista").set({
        items: radiosData,
        updated: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  } catch (e) {
    console.warn("Não foi possivel sincronizar radios.", e);
  }
}

function renderRadios() {
  const editor = document.getElementById("radiosEditorRows");
  const report = document.getElementById("radiosReportRows");
  if (!editor || !report) return;

  const search = normalizarTexto(document.getElementById("radioSearch")?.value || "");
  const lista = radiosData.filter(item => {
    const text = `${item.radio} ${item.users} ${item.obs}`;
    return !search || normalizarTexto(text).includes(search);
  });

  editor.innerHTML = lista.map(item => `
    <div class="radio-editor-grid radio-editor-row" data-radio-id="${item.id}">
      <input type="text" value="${safeRefHtml(item.radio)}" aria-label="Radio" onchange="atualizarRadioCampo('${item.id}', 'radio', this.value)">
      <span class="radio-arrow">→</span>
      <input type="text" value="${safeRefHtml(item.users)}" placeholder="Selecionar users..." onchange="atualizarRadioCampo('${item.id}', 'users', this.value)">
      <input type="text" value="${safeRefHtml(item.obs)}" placeholder="Observações (opcional)" onchange="atualizarRadioCampo('${item.id}', 'obs', this.value)">
      <button class="reference-icon danger" type="button" onclick="apagarRadio('${item.id}')" title="Apagar rádio">🗑</button>
    </div>
  `).join("");

  report.innerHTML = lista.map(item => {
    const users = splitUsersList(item.users);
    const visible = users.slice(0, 3);
    const extra = users.length - visible.length;
    return `
      <tr>
        <td>${safeRefHtml(item.radio)}</td>
        <td>
          <div class="reference-tags">
            ${visible.map(user => `<span>${safeRefHtml(user)}</span>`).join("")}
            ${extra > 0 ? `<span>+${extra}</span>` : ""}
          </div>
        </td>
        <td>${safeRefHtml(item.updated || nowPt())}</td>
        <td>
          <div class="reference-row-actions">
            <button class="reference-icon" type="button" onclick="verRadio('${item.id}')" title="Ver detalhes">✎</button>
            <button class="reference-icon danger" type="button" onclick="apagarRadio('${item.id}')" title="Apagar rádio">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function initRadiosPage() {
  if (!document.getElementById("radiosEditorRows")) return;
  loadRadiosData();
  renderRadios();
}

function adicionarRadio() {
  const nextNumber = radiosData.length ? Math.max(...radiosData.map(item => Number(item.radio) || 0)) + 1 : 1;
  radiosData.push({
    id: `radio-${Date.now()}`,
    radio: String(nextNumber),
    users: "",
    obs: "",
    updated: nowPt()
  });
  saveRadiosData();
  renderRadios();
}

function atualizarRadioCampo(id, field, value) {
  const item = radiosData.find(radio => radio.id === id);
  if (!item) return;
  item[field] = value;
  item.updated = nowPt();
  saveRadiosData();
  renderRadios();
}

function apagarRadio(id) {
  radiosData = radiosData.filter(item => item.id !== id);
  if (!radiosData.length) radiosData = defaultRadiosData();
  saveRadiosData();
  renderRadios();
}

function verRadio(id) {
  const item = radiosData.find(radio => radio.id === id);
  if (!item) return;
  alert(`Radio: ${item.radio}\nUsers: ${item.users || "-"}\nObservacoes: ${item.obs || "-"}`);
}

function filtrarRadios() {
  renderRadios();
}


function loadInformacoesData() {
  if (!window.db) {
    console.warn("Firestore não inicializado.");
    return;
  }

  window.db.collection("informacoes")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {

      informacoesData = [];

      snapshot.forEach((doc) => {
        informacoesData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      renderInformacoes(
        document.getElementById("pesquisaInfo")?.value || ""
      );
    });
}



function saveInformacoesData() {
  // Firestore realtime ativo
}


function renderInformacoes(filtro = "") {
  const lista = document.getElementById("informacoesLista");
  if (!lista) return;
  const dados = informacoesData.filter(item => (item.titulo || "").toLowerCase().includes(filtro.toLowerCase()));
  lista.innerHTML = dados.length ? dados.map(item => `
    <div class="info-list-item ${informacaoSelecionada === item.id ? "active" : ""}">
      <strong>${safeRefHtml(item.titulo || "Sem título")}</strong>
      <span>${safeRefHtml(item.obs || "Sem observações")}</span>
      <div class="info-card-actions">
        <button class="secondary-btn reference-outline" type="button" onclick="verInformacao('${item.id}')">Ver Mais</button>
        <button class="secondary-btn info-edit-btn" type="button" onclick="editarInformacao('${item.id}')">Editar</button>
        <button class="secondary-btn info-delete-btn" type="button" onclick="apagarInformacao('${item.id}')">Apagar</button>
      </div>
    </div>
  `).join("") : `<div class="info-empty">Ainda sem informações guardadas.</div>`;
}

function initInformacoesPage() {
  if (!document.getElementById("informacoesLista")) return;
  loadInformacoesData();
  renderInformacoes();
  const pesquisa = document.getElementById("pesquisaInfo");
  if (pesquisa) {
    pesquisa.addEventListener("input", e => renderInformacoes(e.target.value || ""));
  }
}


async function adicionarInformacao() {
  const titulo = document.getElementById("infoTitulo")?.value || "";
  const obs = document.getElementById("infoObs")?.value || "";

  if (!normalizarTexto(titulo) && !normalizarTexto(obs)) {
    mostrarMensagem("Preenche pelo menos um título ou observação.", "erro");
    return;
  }

  if (!window.db) {
    mostrarMensagem("Firebase indisponível.", "erro");
    return;
  }

  try {

    if (informacaoSelecionada) {

      await window.db.collection("informacoes")
        .doc(informacaoSelecionada)
        .update({
          titulo,
          obs,
          updated: nowPt()
        });

    } else {

      await window.db.collection("informacoes")
        .add({
          titulo,
          obs,
          createdAt: Date.now(),
          updated: nowPt()
        });
    }

    document.getElementById("infoTitulo").value = "";
    document.getElementById("infoObs").value = "";

    informacaoSelecionada = null;

  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao guardar informação.", "erro");
  }
}


function selecionarInformacao(id) {
  informacaoSelecionada = id;
  renderInformacoes();
}

function verInformacaoSelecionada() {
  const item = informacoesData.find(info => info.id === informacaoSelecionada);
  if (!item) return mostrarMensagem("Seleciona uma informação primeiro.", "erro");
  alert(`${item.titulo || "Informação"}\n\n${item.obs || "Sem observacoes"}`);
}

function editarInformacaoSelecionada() {
  const item = informacoesData.find(info => info.id === informacaoSelecionada);
  if (!item) return mostrarMensagem("Seleciona uma informação primeiro.", "erro");
  document.getElementById("infoTitulo").value = item.titulo || "";
  document.getElementById("infoObs").value = item.obs || "";
}


async function apagarInformacaoSelecionada() {
  if (!informacaoSelecionada) {
    return mostrarMensagem("Seleciona uma informação primeiro.", "erro");
  }

  try {

    await window.db.collection("informacoes")
      .doc(informacaoSelecionada)
      .delete();

    informacaoSelecionada = null;

  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar informação.", "erro");
  }
}


function guardarInformacoes() {
  const titulo = document.getElementById("infoTitulo")?.value || "";
  const obs = document.getElementById("infoObs")?.value || "";
  if (normalizarTexto(titulo) || normalizarTexto(obs)) {
    adicionarInformacao();
    return;
  }
  saveInformacoesData();
  mostrarMensagem("Informações guardadas.");
}

document.addEventListener("DOMContentLoaded", initRadiosPage);
document.addEventListener("DOMContentLoaded", initInformacoesPage);
window.adicionarRadio = adicionarRadio;
window.atualizarRadioCampo = atualizarRadioCampo;
window.apagarRadio = apagarRadio;
window.verRadio = verRadio;
window.filtrarRadios = filtrarRadios;
window.adicionarInformacao = adicionarInformacao;
window.selecionarInformacao = selecionarInformacao;
window.verInformacaoSelecionada = verInformacaoSelecionada;
window.editarInformacaoSelecionada = editarInformacaoSelecionada;
window.apagarInformacaoSelecionada = apagarInformacaoSelecionada;
window.guardarInformacoes = guardarInformacoes;

function updateEnterpriseDashboard() {
  const totalEquipamentosEl = el("dashTotalEquipamentos");
  if (!totalEquipamentosEl) return;

  const impressorasTotal = Array.isArray(impressorasData) ? impressorasData.length : 0;
  const pcsTotal = Array.isArray(pcsGlobal) ? pcsGlobal.length : 0;
  const pistolasTotal = Array.isArray(window.pistolasData) ? window.pistolasData.length : 0;
  const portasTotal = Array.isArray(window.portasData) ? window.portasData.length : 0;
  const stockTotal = Array.isArray(stockGlobal) ? stockGlobal.length : 0;
  const ticketsAbertos = Array.isArray(manutencoesGlobal)
    ? manutencoesGlobal.filter(item => item.estado === "Pendente" || item.estado === "Em reparação").length
    : 0;
  const impressorasOk = Array.isArray(impressorasData)
    ? impressorasData.filter(item => obterEstadoImpressora(item.ip) === "OK").length
    : 0;
  const totalEquipamentos = impressorasTotal + pcsTotal + pistolasTotal + portasTotal;

  setText("dashTotalEquipamentos", totalEquipamentos);
  setText("dashStockTotal", stockTotal);
  setText("dashTicketsAbertos", ticketsAbertos);
  setText("dashImpressorasOk", impressorasOk);
  setText("dashDonutTotal", totalEquipamentos);
}

/* =========================
   INIT
========================= */
window.addEventListener("DOMContentLoaded", () => {
  if (el("historicoImpressoraPanel") && impressorasData && impressorasData.length) { abrirHistoricoImpressora(impressorasData[0]); }
  initGlobalTheme();

  carregarChecklist();
  carregarEdicaoToner();
  ensureLoteFieldOnEdit();
  tryRenderAppBraga(renderStockMinimoConfig);
  tryRenderAppBraga(renderStockMinimoPainel);
  tryRenderAppBraga(renderAlertasInteligentes);
  tryRenderAppBraga(() => enhanceScannerStatus("Leitura pronta."));
  preencherLocaisManutencao();
  preencherFormularioManutencao();

  carregarImpressorasLocal();
  renderImpressoras();
  renderManutencoes(manutencoesGlobal);
  carregarPistolasLocal();
  carregarPortasLocal();
  renderPistolas();
  renderPortas();
  carregarUsersLocal();
  renderUsers();

  if (el("manutencaoSerie")) {
    el("manutencaoSerie").addEventListener("change", sincronizarCamposImpressora);
  }

  if (el("manutencaoIP")) {
    el("manutencaoIP").addEventListener("change", sincronizarCamposImpressora);
  }

  const estaNaPaginaImpressoras = !!el("impressorasTableBody");
  const estaNoDashboard = !!el("listaDashboardStock") || !!el("searchDashboard");

  if (estaNaPaginaImpressoras || estaNoDashboard) {
    setTimeout(() => {
      testarTodasAsImpressoras();
    }, 600);

    setInterval(() => {
      testarTodasAsImpressoras();
    }, 60000);
  }

});

/* =========================
   TABLET / FIREBASE COMPLETO
========================= */
const printerFirebaseState = {};
const printerFirebaseSyncState = {};

function normalizePrinterIp(ip) {
  return String(ip || "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function hasUsablePrinterInfo(info) {
  if (!info) return false;
  if (Array.isArray(info.colors) && info.colors.length) return true;
  if (info.residue && typeof info.residue.percent === "number") return true;
  return typeof info.percent === "number";
}

function buildPrinterFirebasePayload(ip, info) {
  const payload = {
    ip: normalizePrinterIp(ip),
    syncSource: "desktop-snmp",
    updatedAtMs: Date.now(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (Array.isArray(info.colors) && info.colors.length) {
    payload.toner = {};
    info.colors.forEach((color) => {
      if (!color || typeof color.percent !== "number") return;
      const key = String(color.key || "").toLowerCase();
      if (["black", "cyan", "magenta", "yellow"].includes(key)) {
        payload.toner[key] = Math.max(0, Math.min(100, Math.round(color.percent)));
      }
    });
  }

  if (info.residue && typeof info.residue.percent === "number") {
    payload.waste = Math.max(0, Math.min(100, Math.round(info.residue.percent)));
  }

  if (typeof info.percent === "number") {
    payload.percent = Math.max(0, Math.min(100, Math.round(info.percent)));
  } else if (payload.toner && typeof payload.toner.black === "number") {
    payload.percent = payload.toner.black;
  }

  return payload;
}

async function syncPrinterInfoToFirebase(ip, info) {
  const cleanIp = normalizePrinterIp(ip);
  if (!cleanIp || !db || !db.collection || !hasUsablePrinterInfo(info)) return false;

  const payload = buildPrinterFirebasePayload(cleanIp, info);
  const compareKey = JSON.stringify({
    ip: payload.ip,
    toner: payload.toner || null,
    waste: typeof payload.waste === "number" ? payload.waste : null,
    percent: typeof payload.percent === "number" ? payload.percent : null
  });

  if (printerFirebaseSyncState[cleanIp] === compareKey) return true;

  await db.collection("printers").doc(cleanIp).set(payload, { merge: true });
  printerFirebaseSyncState[cleanIp] = compareKey;
  printerFirebaseState[cleanIp] = Object.assign({}, printerFirebaseState[cleanIp] || {}, payload);
  tonerInfoState[cleanIp] = mapFirebasePrinterInfo(printerFirebaseState[cleanIp]);
  return true;
}

function normalizePrinterColorsFromFirebase(printerDoc) {
  const toner = printerDoc && printerDoc.toner ? printerDoc.toner : {};
  const colors = [];

  const colorMap = [
    ["black", "Preto", "black"],
    ["cyan", "Ciano", "cyan"],
    ["magenta", "Magenta", "magenta"],
    ["yellow", "Amarelo", "yellow"]
  ];

  const normalizePercentValue = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
    if (typeof value === "string") {
      const match = value.replace(",", ".").match(/\d{1,3}(?:\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }
    return null;
  };

  if (Array.isArray(printerDoc && printerDoc.colors)) {
    printerDoc.colors.forEach((item) => {
      if (!item) return;
      const key = String(item.key || item.color || item.cor || "").toLowerCase();
      const percent = normalizePercentValue(item.percent ?? item.value ?? item.valor ?? item.nivel);
      if (percent === null) return;
      const known = colorMap.find(([field,, mappedKey]) => key === field || key === mappedKey);
      colors.push({
        key: known ? known[2] : (key || "black"),
        label: item.label || item.cor || (known ? known[1] : "Toner"),
        percent
      });
    });
  }

  colorMap.forEach(([field, label, key]) => {
    const value =
      toner[field] ??
      toner[label] ??
      printerDoc?.[field] ??
      printerDoc?.[`${field}Percent`] ??
      printerDoc?.[`${field}_percent`];

    const percent = normalizePercentValue(value);
    if (percent !== null && !colors.some(c => c.key === key)) {
      colors.push({ key, label, percent });
    }
  });

  return colors;
}

function normalizePrinterResidueFromFirebase(printerDoc) {
  const wasteValue = printerDoc && typeof printerDoc.waste === "number"
    ? printerDoc.waste
    : (printerDoc && typeof printerDoc.residue === "number" ? printerDoc.residue : null);

  if (typeof wasteValue !== "number") return null;

  return {
    key: "waste",
    label: "Resíduo",
    percent: Math.max(0, Math.min(100, Math.round(wasteValue)))
  };
}

function mapFirebasePrinterInfo(printerDoc) {
  const colors = normalizePrinterColorsFromFirebase(printerDoc);
  const residue = normalizePrinterResidueFromFirebase(printerDoc);
  const normalizePercentValue = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
    if (typeof value === "string") {
      const match = value.replace(",", ".").match(/\d{1,3}(?:\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }
    return null;
  };
  let percent = normalizePercentValue(
    printerDoc?.percent ??
    printerDoc?.tonerPercent ??
    printerDoc?.toner_percent ??
    printerDoc?.nivelToner ??
    printerDoc?.nivel ??
    printerDoc?.percentage
  );

  if (percent === null && colors.length === 1 && colors[0].key === "black") {
    percent = colors[0].percent;
  }

  return { colors, residue, percent };
}

function bindPrintersFirebaseRealtime() {
  if (!db || !db.collection) return;

  db.collection("printers").onSnapshot((snap) => {
    snap.forEach((doc) => {
      const data = ({ firebaseId: doc.id, ...doc.data() }) || {};
      const ip = normalizePrinterIp(data.ip || doc.id);
      if (!ip) return;

      const mapped = mapFirebasePrinterInfo(data);
      printerFirebaseState[ip] = Object.assign({}, data, { ip });
      tonerInfoState[ip] = mapped;
      maybeNotifyCriticalSupply(ip, mapped);
    });

    renderDashboardCards();
    renderImpressoras();
    renderTonerDiagnostics();

    const dashboardHasSearch = !!el("searchDashboard");
    if (dashboardHasSearch && normalizarTexto(el("searchDashboard")?.value || "")) {
      renderDashboardCards();
    }
  }, (error) => {
    console.error("Erro ao ler coleção printers:", error);
  });
}

const __originalObterTonerInfo = obterTonerInfo;
obterTonerInfo = async function(ip) {
  const cleanIp = normalizePrinterIp(ip);
  const desktopMode = !!(window.electronAPI && window.electronAPI.getTonerSNMP);

  if (desktopMode) {
    const freshInfo = await __originalObterTonerInfo(cleanIp);
    if (hasUsablePrinterInfo(freshInfo)) {
      try {
        await syncPrinterInfoToFirebase(cleanIp, freshInfo);
      } catch (error) {
        console.error("Erro ao sincronizar impressora para Firebase:", cleanIp, error);
      }
      return freshInfo;
    }

    if (printerFirebaseState[cleanIp]) {
      return mapFirebasePrinterInfo(printerFirebaseState[cleanIp]);
    }

    return freshInfo;
  }

  if (printerFirebaseState[cleanIp]) {
    return mapFirebasePrinterInfo(printerFirebaseState[cleanIp]);
  }
  return await __originalObterTonerInfo(cleanIp);
};

const __originalTestarTodasAsImpressoras = testarTodasAsImpressoras;
testarTodasAsImpressoras = async function() {
  const webMode = !(window.electronAPI && window.electronAPI.getTonerSNMP);
  if (webMode) {
    impressorasData.forEach((item) => {
      const info = printerFirebaseState[item.ip] ? mapFirebasePrinterInfo(printerFirebaseState[item.ip]) : null;
      tonerInfoState[item.ip] = info;
      const alvoId = `toner-${item.ip.replace(/\./g, "-")}`;
      if (el(alvoId)) {
        el(alvoId).innerHTML = gerarHTMLToners(info);
      }
      if (info) maybeNotifyCriticalSupply(item.ip, info);
    });
    renderDashboardCards();
    return;
  }
  return await __originalTestarTodasAsImpressoras();
};

const __originalAbrirIP = abrirIP;
abrirIP = function(ip) {
  // No tablet/web o IP fica só de leitura
  const webMode = !(window.electronAPI && window.electronAPI.getTonerSNMP);
  if (webMode) return;
  return __originalAbrirIP(ip);
};

const __originalRenderImpressoras = renderImpressoras;
renderImpressoras = function(lista = impressorasData) {
  const tbody = el("impressorasTableBody");
  if (!tbody) return __originalRenderImpressoras(lista);

  const total = impressorasData.length;
  const ok = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "OK").length;
  const problema = impressorasData.filter(i => {
    const e = obterEstadoImpressora(i.ip);
    return e === "Pendente" || e === "Em reparação";
  }).length;
  const resolvidas = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "Resolvido").length;

  setText("countImpressoras", total);
  setText("countImpressorasOk", ok);
  setText("countImpressorasProblema", problema);
  setText("countImpressorasResolvidas", resolvidas);

  const webMode = !(window.electronAPI && window.electronAPI.getTonerSNMP);

  tbody.innerHTML = lista.map(item => {
    const estado = obterEstadoImpressora(item.ip);
    const tonerId = `toner-${item.ip.replace(/\./g, "-")}`;
    const info = printerFirebaseState[item.ip] ? mapFirebasePrinterInfo(printerFirebaseState[item.ip]) : (tonerInfoState[item.ip] || null);
    const ipHtml = webMode ? item.ip : `<a href="http://${item.ip}" target="_blank" rel="noopener noreferrer">${item.ip}</a>`;

    return `
      <tr>
        <td>${item.modelo}</td>
        <td>${item.serie}</td>
        <td>${item.armazem}</td>
        <td>${item.localizacao}</td>
        <td>${ipHtml}</td>
        <td>${badgeEstado(estado)}</td>
        <td>
          <div id="${tonerId}">${gerarHTMLToners(info)}</div>
          <div class="table-actions" style="margin-top:8px;">
            ${webMode ? "" : `<button class="action-btn ip" onclick="abrirIP('${item.ip}')">Abrir IP</button>`}
            <button class="action-btn manut" onclick='abrirManutencaoDireta(${JSON.stringify(item)})'>Manutenção</button>
            ${webMode ? "" : `<button class="action-btn" onclick="window.testarTonerImpressora('${item.ip}', '${tonerId}')">Testar toner</button>`}
          </div>
        </td>
      </tr>
    `;
  }).join("");
};

window.addEventListener("DOMContentLoaded", () => {
  if (el("historicoImpressoraPanel") && impressorasData && impressorasData.length) { abrirHistoricoImpressora(impressorasData[0]); }
  bindPrintersFirebaseRealtime();
});





/* =========================
   DIAGNÓSTICO DO TONER
========================= */
const tonerDiagnosticsState = {
  running: false,
  lastRunAt: null,
  source: "—",
  successCount: 0,
  totalCount: 0,
  status: "idle",
  log: []
};

function formatDiagTime(date) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" }).format(date);
  } catch (e) {
    return date.toLocaleString();
  }
}

function resolveDiagSource() {
  return (window.electronAPI && window.electronAPI.getTonerSNMP) ? "Leitura real SNMP" : "Firebase";
}


const tonerDiagUiState = { logsVisible: false };

function renderTonerDiagLogVisibility() {
  const wrapEl = el("tonerDiagLogWrap");
  const btnEl = el("toggleTonerDiagLogBtn");
  if (!wrapEl || !btnEl) return;
  wrapEl.classList.toggle("is-collapsed", !tonerDiagUiState.logsVisible);
  btnEl.textContent = tonerDiagUiState.logsVisible ? "Esconder logs" : "Ver logs";
}

function toggleTonerDiagLog(force) {
  tonerDiagUiState.logsVisible = typeof force === "boolean" ? force : !tonerDiagUiState.logsVisible;
  renderTonerDiagLogVisibility();
}
window.toggleTonerDiagLog = toggleTonerDiagLog;

function renderTonerDiagnostics() {
  const statusEl = el("tonerDiagStatus");
  const dotEl = el("tonerDiagDot");
  const lastRunEl = el("tonerDiagLastRun");
  const sourceEl = el("tonerDiagSource");
  const summaryEl = el("tonerDiagSummary");
  const logEl = el("tonerDiagLog");
  if (!statusEl || !dotEl || !lastRunEl || !sourceEl || !summaryEl || !logEl) return;
  renderTonerDiagLogVisibility();

  const map = {
    idle: ["Sem teste", "is-idle"],
    running: ["A testar", "is-running"],
    ok: ["A funcionar", "is-ok"],
    warn: ["Parcial", "is-warn"],
    error: ["Com falhas", "is-error"]
  };

  const current = map[tonerDiagnosticsState.status] || map.idle;
  statusEl.textContent = current[0];
  dotEl.className = `diag-dot ${current[1]}`;
  lastRunEl.textContent = formatDiagTime(tonerDiagnosticsState.lastRunAt);
  sourceEl.textContent = tonerDiagnosticsState.source || "—";

  if (tonerDiagnosticsState.running) {
    summaryEl.textContent = `A testar ${tonerDiagnosticsState.totalCount || impressorasData.length || 0} impressoras`;
  } else if (!tonerDiagnosticsState.lastRunAt) {
    summaryEl.textContent = "À espera de teste";
  } else {
    summaryEl.textContent = `${tonerDiagnosticsState.successCount}/${tonerDiagnosticsState.totalCount || 0} impressoras com leitura`;
  }

  if (!tonerDiagnosticsState.log.length) {
    logEl.innerHTML = '<div class="diagnostics-log-item is-muted">Ainda sem leituras.</div>';
    return;
  }

  logEl.innerHTML = tonerDiagnosticsState.log.map(item => `
    <div class="diagnostics-log-item">
      <span class="diag-time">${item.time}</span>
      <strong>${item.ip}</strong> · ${item.message}
    </div>
  `).join("");
}

function pushTonerDiagnosticLog(ip, message) {
  tonerDiagnosticsState.log.unshift({
    ip: ip || "Sistema",
    message,
    time: formatDiagTime(new Date())
  });
  tonerDiagnosticsState.log = tonerDiagnosticsState.log.slice(0, 10);
  renderTonerDiagnostics();
}

function updateTonerDiagnosticStatus(status, partial = {}) {
  tonerDiagnosticsState.status = status;
  Object.assign(tonerDiagnosticsState, partial);
  renderTonerDiagnostics();
}

function summarizeTonerInfo(info) {
  if (!info) return "sem leitura";
  if (Array.isArray(info.colors) && info.colors.length) {
    return info.colors.map(c => `${c.label || c.key}: ${typeof c.percent === "number" ? Math.round(c.percent) : "N/D"}%`).join(" · ");
  }
  if (typeof info.percent === "number") return `Preto: ${Math.round(info.percent)}%`;
  return "sem percentagem";
}

async function testarSistemaToner() {
  updateTonerDiagnosticStatus("running", {
    running: true,
    source: resolveDiagSource(),
    totalCount: impressorasData.length || 0,
    successCount: 0
  });
  pushTonerDiagnosticLog("Sistema", `Teste iniciado por ${resolveDiagSource()}`);

  let success = 0;
  for (const item of impressorasData) {
    const info = await obterTonerInfo(item.ip);
    tonerInfoState[item.ip] = info || null;
    const alvoId = `toner-${item.ip.replace(/\./g, "-")}`;
    if (el(alvoId)) el(alvoId).innerHTML = gerarHTMLToners(info);
    if (info) {
      success += 1;
      pushTonerDiagnosticLog(item.ip, summarizeTonerInfo(info));
      maybeNotifyCriticalSupply(item.ip, info);
    } else {
      pushTonerDiagnosticLog(item.ip, "sem resposta");
    }
  }

  updateTonerDiagnosticStatus(success === impressorasData.length ? "ok" : (success > 0 ? "warn" : "error"), {
    running: false,
    lastRunAt: new Date(),
    successCount: success,
    totalCount: impressorasData.length || 0,
    source: resolveDiagSource()
  });

  renderDashboardCards();
  renderImpressoras();
}

window.testarSistemaToner = testarSistemaToner;

/* =========================
   VERSÃO / ONLINE-OFFLINE
========================= */
const APP_BRAGA_VERSION = `v${APP_VERSION} Premium`;

function atualizarEstadoLigacaoAppBraga() {
  const online = navigator.onLine;
  document.querySelectorAll(".status-pill").forEach(node => {
    node.textContent = online ? "Sistema Online" : "Sistema Offline";
    node.classList.toggle("offline", !online);
  });
  document.querySelectorAll(".version-pill").forEach(node => {
    node.textContent = APP_BRAGA_VERSION;
  });
}

window.addEventListener("online", atualizarEstadoLigacaoAppBraga);
window.addEventListener("offline", atualizarEstadoLigacaoAppBraga);
document.addEventListener("DOMContentLoaded", atualizarEstadoLigacaoAppBraga);

/* =========================
   ADD TONER - ESTÁVEL
========================= */
const tonerMapStable = {
  "TK-3190": { equipamento: "P3155DN", cor: "Preto" },
  "TK-8365Y": { equipamento: "TASKalfa_255ci", cor: "Amarelo" },
  "TK-8365C": { equipamento: "TASKalfa_255ci", cor: "Azul" },
  "TK-8365M": { equipamento: "TASKalfa_255ci", cor: "Vermelho" },
  "TK-8365K": { equipamento: "TASKalfa_255ci", cor: "Preto" },
  "TK-3430": { equipamento: "PA5500x", cor: "Preto" }
};

let scannerInstanceStable = null;
let scannerAtivoStable = false;

function mostrarOCRStatusStable(texto) {
  const box = el("ocrStatus");
  if (!box) return;
  box.style.display = "block";
  box.innerText = texto;
}

function normalizarTextoOCRStable(texto) {
  return String(texto || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/—/g, "-")
    .replace(/_/g, "-")
    .trim()
    .toUpperCase();
}

function preencherDataAtualSeVaziaStable() {
  const dataEl = el("data");
  if (!dataEl) return;
  if (!dataEl.value) {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");
    dataEl.value = `${yyyy}-${mm}-${dd}`;
  }
}

function montarTextoLocalizacaoStable(item) {
  return `${item.serie} - ${item.armazem} - ${item.localizacao}`;
}

function procurarImpressoraPorUltimos3DigitosStable(final3) {
  const alvo = String(final3 || "").trim().toUpperCase();
  if (alvo.length !== 3) return null;
  return impressorasData.find(item => String(item.serie || "").toUpperCase().slice(-3) === alvo) || null;
}

function abrirSerie3DigitosStable() {
  const box = el("serial3Box");
  if (box) box.style.display = "block";
  const input = el("serial3Input");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 120);
  }
}

function fecharSerie3DigitosStable() {
  const box = el("serial3Box");
  if (box) box.style.display = "none";
  const input = el("serial3Input");
  if (input) input.value = "";
}

function aplicarDadosTonerStable(toner) {
  if (el("equipamento")) el("equipamento").value = toner.equipamento || "";
  if (el("cor")) el("cor").value = toner.cor || "";
  preencherDataAtualSeVaziaStable();
}

function extrairDadosEtiquetaOCRStable(texto) {
  const t = normalizarTextoOCRStable(texto);

  let tonerCode = "";
  const tkMatch = t.match(/TK[\s-]?(\d{4}[A-Z]?)/);
  if (tkMatch) tonerCode = `TK-${tkMatch[1]}`;

  let dataFolha = "";
  const dataISO = t.match(/\d{4}-\d{2}-\d{2}/);
  const dataPTSlash = t.match(/\d{2}\/\d{2}\/\d{4}/);
  const dataPTHyphen = t.match(/\d{2}-\d{2}-\d{4}/);

  if (dataISO) {
    dataFolha = dataISO[0];
  } else if (dataPTSlash) {
    const [dd, mm, yyyy] = dataPTSlash[0].split("/");
    dataFolha = `${yyyy}-${mm}-${dd}`;
  } else if (dataPTHyphen) {
    const [dd, mm, yyyy] = dataPTHyphen[0].split("-");
    dataFolha = `${yyyy}-${mm}-${dd}`;
  }

  let serieEncontrada = "";
  for (const item of impressorasData) {
    const s = String(item.serie || "").toUpperCase();
    if (s && t.includes(s)) {
      serieEncontrada = item.serie;
      break;
    }
  }

  let equipamento = "";
  let cor = "";

  if (tonerCode && tonerMapStable[tonerCode]) {
    equipamento = tonerMapStable[tonerCode].equipamento || "";
    cor = tonerMapStable[tonerCode].cor || "";
  }

  if (!equipamento) {
    if (t.includes("P3155DN")) equipamento = "P3155DN";
    else if (t.includes("PA5500X")) equipamento = "PA5500x";
    else if (t.includes("2554CI")) equipamento = "TASKalfa_255ci";
  }

  if (!cor && tonerCode) {
    if (tonerCode.endsWith("Y")) cor = "Amarelo";
    else if (tonerCode.endsWith("C")) cor = "Azul";
    else if (tonerCode.endsWith("M")) cor = "Vermelho";
    else cor = "Preto";
  }

  const lote = extractLoteFromText(t);

  return {
    lote,
    tonerCode,
    equipamento,
    cor,
    dataFolha,
    serie: serieEncontrada
  };
}

function aplicarDadosOCRNoFormularioStable(dados) {
  if (!dados) return false;

  if (dados.equipamento && el("equipamento")) el("equipamento").value = dados.equipamento;
  if (dados.cor && el("cor")) el("cor").value = dados.cor;

  if (el("dataFolha")) {
    el("dataFolha").value = dados.dataFolha || "";
  }
  if (el("lote")) {
    el("lote").value = dados.lote || "";
  }

  preencherDataAtualSeVaziaStable();

  if (dados.serie && el("localizacao")) {
    const printer = impressorasData.find(p => p.serie === dados.serie);
    if (printer) {
      el("localizacao").value = montarTextoLocalizacaoStable(printer);
    }
  } else if (dados.equipamento || dados.cor) {
    abrirSerie3DigitosStable();
  }

  return !!(dados.tonerCode || dados.equipamento || dados.cor || dados.dataFolha || dados.serie);
}

function processarTextoLidoStable(textoLido) {
  const bruto = String(textoLido || "");
  const normal = normalizarTextoOCRStable(bruto);

  const tkMatch = normal.match(/TK[\s-]?(\d{4}[A-Z]?)/);
  if (tkMatch) {
    const tk = `TK-${tkMatch[1]}`;
    const toner = tonerMapStable[tk] || null;
    if (toner) {
      aplicarDadosTonerStable(toner);
      mostrarMensagem(`Toner identificado: ${tk}`);
      abrirSerie3DigitosStable();
      return true;
    }
  }

  mostrarMensagem("Código não reconhecido para preenchimento automático.", "erro");
  return false;
}

async function startScannerStable() {
  const reader = el("reader");

  if (!reader) {
    mostrarMensagem("Zona do scanner não encontrada.", "erro");
    return;
  }

  if (typeof Html5Qrcode === "undefined") {
    mostrarMensagem("Biblioteca da câmara não carregada.", "erro");
    return;
  }

  if (scannerAtivoStable) {
    mostrarMensagem("A câmara já está aberta.", "erro");
    return;
  }

  reader.innerHTML = "";
  scannerInstanceStable = new Html5Qrcode("reader");

  try {
    await scannerInstanceStable.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 280, height: 180 } },
      (decodedText) => {
        enhanceScannerStatus("Código lido. A processar automaticamente...");
        processarTextoLidoStable(decodedText);
        stopScannerStable();
      },
      () => {}
    );
    scannerAtivoStable = true;
    enhanceScannerStatus("Câmara iniciada. À espera de leitura inteligente.");
    mostrarMensagem("Câmara iniciada.");
  } catch (e) {
    console.error("Erro ao iniciar scanner:", e);
    mostrarMensagem("Não foi possível abrir a câmara.", "erro");
  }
}

async function stopScannerStable() {
  const reader = el("reader");
  if (!scannerInstanceStable || !scannerAtivoStable) {
    if (reader) reader.innerHTML = "";
    scannerAtivoStable = false;
    return;
  }

  try {
    await scannerInstanceStable.stop();
    await scannerInstanceStable.clear();
  } catch (e) {
    console.error("Erro ao fechar scanner:", e);
  } finally {
    scannerInstanceStable = null;
    scannerAtivoStable = false;
    if (reader) reader.innerHTML = "";
  }
}

function abrirOCRStable() {
  const input = el("ocrInput");
  if (!input) {
    mostrarMensagem("Input OCR não encontrado.", "erro");
    return;
  }
  input.value = "";
  input.click();
}

async function processarOCRInputStable(event) {
  const file = event && event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;

  if (typeof Tesseract === "undefined") {
    mostrarMensagem("Biblioteca OCR não carregada.", "erro");
    return;
  }

  try {
    mostrarOCRStatusStable("A ler a folha... pode demorar alguns segundos.");
    mostrarMensagem("A ler a folha...");

    const result = await Tesseract.recognize(file, "eng", { logger: () => {} });
    const texto = result && result.data ? result.data.text : "";
    const dados = extrairDadosEtiquetaOCRStable(texto);
    const ok = aplicarDadosOCRNoFormularioStable(dados);

    const resumo = [
      dados.tonerCode ? `Toner: ${dados.tonerCode}` : "",
      dados.lote ? `Lote: ${dados.lote}` : "",
      dados.equipamento ? `Equipamento: ${dados.equipamento}` : "",
      dados.cor ? `Cor: ${dados.cor}` : "",
      dados.dataFolha ? `Data folha: ${dados.dataFolha}` : "",
      el("data") && el("data").value ? `Data scan: ${el("data").value}` : "",
      dados.serie ? `Série: ${dados.serie}` : ""
    ].filter(Boolean).join(" | ");

    mostrarOCRStatusStable(resumo || "A folha foi lida, mas não encontrei dados suficientes.");
    mostrarMensagem(ok ? "Folha lida com sucesso." : "Não encontrei dados suficientes na folha.", ok ? "sucesso" : "erro");
    if (ok && dados.serie && dados.equipamento) {
      await gerarWordEtiquetaFromForm(true);
    }
  } catch (e) {
    console.error("Erro OCR:", e);
    mostrarOCRStatusStable("Erro ao ler a folha.");
    mostrarMensagem("Erro ao ler a folha.", "erro");
  }
}

function confirmarSerie3DigitosStable() {
  const valor = ((el("serial3Input") && el("serial3Input").value) || "").trim().toUpperCase();

  if (valor.length !== 3) {
    mostrarMensagem("Introduza exatamente 3 dígitos.", "erro");
    return;
  }

  const printer = procurarImpressoraPorUltimos3DigitosStable(valor);
  if (!printer) {
    mostrarMensagem("Nenhuma impressora encontrada com esses 3 dígitos.", "erro");
    return;
  }

  if (el("localizacao")) {
    el("localizacao").value = montarTextoLocalizacaoStable(printer);
  }

  fecharSerie3DigitosStable();
  mostrarMensagem("Localização selecionada com sucesso.");
}

window.startScanner = startScannerStable;
window.stopScanner = stopScannerStable;
window.abrirOCR = abrirOCRStable;
window.processarOCRInput = processarOCRInputStable;
window.confirmarSerie3Digitos = confirmarSerie3DigitosStable;
window.fecharSerie3Digitos = fecharSerie3DigitosStable;


/* =========================
   ETIQUETA WORD AUTOMÁTICA
========================= */
function formatDatePTAppBraga(valor) {
  const raw = String(valor || "").trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }

  return raw;
}

function extrairDadosEtiquetaWord() {
  const loc = (el("localizacao") && el("localizacao").value) || "";
  const dataFolha = (el("dataFolha") && el("dataFolha").value) || "";
  const dataScan = (el("data") && el("data").value) || "";

  let serie = "";
  let localCurto = "";
  let armazem = "";

  const parts = loc.split(" - ").map(v => v.trim()).filter(Boolean);
  if (parts.length >= 3) {
    serie = parts[0] || "";
    armazem = parts[1] || "";
    localCurto = parts.slice(2).join(" - ");
  } else {
    localCurto = loc || "Sem Localização";
  }

  const dataEtiqueta = formatDatePTAppBraga(dataFolha || dataScan);

  return {
    serie: serie || "SEM SÉRIE",
    localCurto: localCurto || "Sem Localização",
    armazem: armazem || "",
    dataEtiqueta: dataEtiqueta || formatDatePTAppBraga(dataScan) || "Sem Data"
  };
}

async function gerarWordEtiquetaFromForm(auto = false) {
  try {
    if (typeof docx === "undefined") {
      mostrarMensagem("Biblioteca Word não carregada.", "erro");
      return;
    }

    const dados = extrairDadosEtiquetaWord();

    if (!dados.localCurto || !dados.serie) {
      mostrarMensagem("Faltam dados para gerar a etiqueta Word.", "erro");
      return;
    }

    const {
      Document,
      Packer,
      Paragraph,
      AlignmentType,
      TextRun,
      HeadingLevel
    } = docx;

    const doc = new Document({
      creator: "App Braga",
      title: "Etiqueta Toner",
      description: "Etiqueta gerada automaticamente pelo scan OCR",
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 3200, after: 500 },
              children: [
                new TextRun({
                  text: dados.localCurto,
                  bold: true,
                  size: 42
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 2800 },
              children: [
                new TextRun({
                  text: dados.serie,
                  bold: true,
                  size: 64
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 200 },
              children: [
                new TextRun({
                  text: dados.dataEtiqueta,
                  bold: true,
                  size: 56
                })
              ]
            })
          ]
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `Etiqueta_${dados.localCurto.replace(/\s+/g, "_")}_${dados.serie}.docx`;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1200);

    await guardarEtiquetaPartilhada({ origem: auto ? "scan" : "manual" });

    if (!auto) {
      mostrarMensagem("Etiqueta Word gerada com sucesso.");
    }
  } catch (error) {
    console.error("Erro ao gerar Word:", error);
    mostrarMensagem("Erro ao gerar a etiqueta Word.", "erro");
  }
}

window.gerarWordEtiquetaFromForm = gerarWordEtiquetaFromForm;



/* =========================
   PORTAS FIREBASE FALLBACK + MIGRAÇÃO
========================= */
async function migrarPortasParaFirebase() {
  if (!window.db) {
    mostrarMensagem("Firebase não está disponível.", "erro");
    return;
  }

  try {
    const snap = await db.collection("portas").get();
    if (!snap.empty) {
      mostrarMensagem("A coleção portas já tem dados. Migração não necessária.");
      return;
    }

    for (const p of window.portasData) {
      const payload = {
        porta: p.porta || "",
        local: p.local || "",
        user: p.user || "",
        equipamento: p.equipamento || "",
        ip: p.ip || "",
        created: new Date()
      };
      await db.collection("portas").add(payload);
    }

    mostrarMensagem("Migração das portas concluída com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao migrar portas para Firebase.", "erro");
  }
}

async function carregarPortasComFallback() {
  if (!window.db) {
    carregarPortasLocal();
    renderPortas(window.portasData);
    return;
  }

  try {
    db.collection("portas").onSnapshot(snap => {
      if (snap.empty) {
        carregarPortasLocal();
        renderPortas(window.portasData);
        const countEl = document.getElementById("countPortas");
        if (countEl) countEl.innerText = String(window.portasData.length);
        return;
      }

      window.portasData = snap.docs.map(doc => ({ idDoc: doc.id, ...({ firebaseId: doc.id, ...doc.data() }) }));

      window.portasData.sort((a,b)=>{

        const aTxt =
          String(a.porta || a.nome || "")
            .toLowerCase()
            .trim();

        const bTxt =
          String(b.porta || b.nome || "")
            .toLowerCase()
            .trim();

        return aTxt.localeCompare(
          bTxt,
          'pt',
          {
            numeric:true,
            sensitivity:'base'
          }
        );

      });

      prepararRefsPortas();
      guardarPortasLocal();
      renderPortas(window.portasData);
    }, error => {
      console.error(error);
      renderPortas(window.portasData);
    });
  } catch (e) {
    console.error(e);
    renderPortas(window.portasData);
  }
}

window.migrarPortasParaFirebase = migrarPortasParaFirebase;

window.addEventListener("DOMContentLoaded", () => {
  const host = document.getElementById("listaPortas");
  if (host) {
    setTimeout(() => {
      try { carregarPortasComFallback(); } catch (e) { console.error(e); }
    }, 400);
  }
});


/* ===== AUTO UPDATE PRO FINAL ===== */
const APP_REMOTE_BASE = "https://picafern-commits.github.io/App-Tablet/";
const APP_VERSION_URL = APP_REMOTE_BASE + "version.json?t=" + Date.now();

async function limparServiceWorkersAntigosAppBraga() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {
    console.error("Erro a limpar service workers/cache", e);
  }
}

async function verificarAtualizacao() {
  try {
    await limparServiceWorkersAntigosAppBraga();

    const res = await fetch(APP_VERSION_URL, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
      }
    });

    const data = await res.json();
    atualizarVersaoUI((data && data.version) ? data.version : APP_VERSION);

    if (data && data.version && data.version !== APP_VERSION) {
      mostrarAvisoUpdateObrigatorio(data.version);
    }
  } catch (e) {
    console.error("Erro a verificar updates", e);
    atualizarVersaoUI(APP_VERSION);
  }
}

function atualizarVersaoUI(versionValue = APP_VERSION) {
  const nodes = document.querySelectorAll("#appVersion, .version-pill");
  nodes.forEach((node) => {
    if (!node) return;
    node.innerText = "v" + versionValue + " Premium";
    node.title = "Versão atual da app";
  });
}

function mostrarAvisoUpdateObrigatorio(novaVersao) {
  let overlay = document.getElementById("updateOverlayAppBraga");
  let box = document.getElementById("updateBoxAppBraga");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "updateOverlayAppBraga";
    overlay.className = "update-overlay-appbraga";
    document.body.appendChild(overlay);
  }

  if (!box) {
    box = document.createElement("div");
    box.id = "updateBoxAppBraga";
    box.className = "update-box-appbraga mandatory";
    document.body.appendChild(box);
  }

  box.innerHTML = `
    <div class="update-title">🚀 Atualização obrigatória</div>
    <div class="update-subtitle">
      Esta app está desatualizada e precisa de ser atualizada para continuar.<br><br>
      Atual: v${APP_VERSION} Premium<br>
      Nova: v${novaVersao} Premium
    </div>
    <div class="update-actions">
      <button class="primary-btn" onclick="atualizarAppObrigatorio()">Descarregar atualização</button>
    </div>
  `;

  document.body.style.overflow = "hidden";
}

function atualizarAppObrigatorio() {
  const box = document.getElementById("updateBoxAppBraga");
  if (box) {
    box.innerHTML = `
      <div class="update-title">⏳ A atualizar...</div>
      <div class="update-subtitle">A abrir a versão mais recente da app.</div>
    `;
  }

  const target = APP_REMOTE_BASE + "index.html?update=" + Date.now();
  const currentBefore = window.location.href;

  setTimeout(async () => {
    try {
      await limparServiceWorkersAntigosAppBraga();
    } catch (e) {
      console.error(e);
    }

    try {
      window.location.replace(target);
    } catch (e) {
      console.error("replace falhou", e);
    }

    setTimeout(() => {
      if (window.location.href === currentBefore) {
        try {
          window.location.href = target;
        } catch (e) {
          console.error("href falhou", e);
        }
      }
    }, 1200);

    setTimeout(() => {
      if (window.location.href === currentBefore) {
        try {
          const a = document.createElement("a");
          a.href = target;
          a.target = "_self";
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (e) {
          console.error("link fallback falhou", e);
        }
      }
    }, 2200);
  }, 400);
}

window.addEventListener("load", verificarAtualizacao);
window.addEventListener("load", () => atualizarVersaoUI(APP_VERSION));



/* ===== CRUD EXTRA: Portas, Users, Pistolas ===== */
function itemPorRef(lista, ref) {
 if (typeof ref === "string") {
   return lista.find(i =>
     i.idDoc === ref ||
     i._ref === ref ||
     i.firebaseId === ref
   ) || null;
 }
 const idx = Number(ref);
 return Number.isNaN(idx)
   ? null
   : (lista[idx] || null);
}

function idxPorRef(lista, ref) {
  if (typeof ref === "string") {
    return lista.findIndex(i => i.idDoc === ref || i._ref === ref);
  }
  const idx = Number(ref);
  return Number.isNaN(idx) ? -1 : idx;
}

/* Portas */
let portaEditRef = null;

function abrirAdicionarPorta() {
  portaEditRef = "__new__";
  [["editPorta",""],["editLocal",""],["editUser",""],["editEquipamento",""],["editIP",""]].forEach(([id,v]) => { const node = el(id); if (node) node.value = v; });
  const h3 = document.querySelector('#modalEditarPorta h3'); if (h3) h3.textContent = 'Adicionar Porta';
  const sub = document.querySelector('#modalEditarPorta .section-subtitle'); if (sub) sub.textContent = 'Criar uma nova porta de rede';
  if (el("modalEditarPorta")) el("modalEditarPorta").style.display = "flex";
}

function editarPorta(ref) {
  const item = itemPorRef(window.portasData, ref);
  if (!item) return mostrarMensagem("Porta não encontrada.", "erro");
  portaEditRef = ref;
  if (el("editPorta")) el("editPorta").value = item.porta || "";
  if (el("editLocal")) el("editLocal").value = item.local || "";
  if (el("editUser")) el("editUser").value = item.user || "";
  if (el("editEquipamento")) el("editEquipamento").value = item.equipamento || "";
  if (el("editIP")) el("editIP").value = item.ip || "";
  if (el("modalEditarPorta")) el("modalEditarPorta").style.display = "flex";
}

function fecharEditarPorta() {
  portaEditRef = null;
  const h3 = document.querySelector('#modalEditarPorta h3'); if (h3) h3.textContent = 'Editar Porta';
  const sub = document.querySelector('#modalEditarPorta .section-subtitle'); if (sub) sub.textContent = 'Editar a porta selecionada';
  if (el("modalEditarPorta")) el("modalEditarPorta").style.display = "none";
}

async function guardarEdicaoPorta() {
  if (portaEditRef === null || typeof portaEditRef === "undefined") return mostrarMensagem("Nenhuma porta selecionada.", "erro");
  const isNovaPorta = portaEditRef === "__new__";
  const payload = {
    porta: el("editPorta") ? el("editPorta").value : "",
    local: el("editLocal") ? el("editLocal").value : "",
    user: el("editUser") ? el("editUser").value : "",
    equipamento: el("editEquipamento") ? el("editEquipamento").value : "",
    ip: el("editIP") ? el("editIP").value : ""
  };

  try {
    if (isNovaPorta) {
      if (window.db) {
        const docRef = await db.collection("portas").add(payload);
        window.portasData.unshift({ idDoc: docRef.id, ...payload });
      } else {
        window.portasData.unshift({ _ref: `local-porta-${Date.now()}`, ...payload });
      }
    } else if (typeof portaEditRef === "string" && window.db) {
      await db.collection("portas").doc(portaEditRef).update(payload);
      const idx = idxPorRef(window.portasData, portaEditRef);
      if (idx >= 0) window.portasData[idx] = { ...window.portasData[idx], ...payload };
    } else {
      const idx = idxPorRef(window.portasData, portaEditRef);
      if (idx >= 0) window.portasData[idx] = { ...window.portasData[idx], ...payload };
    }
    guardarPortasLocal();
    fecharEditarPorta();
    filtrarPortasComEstado();
    mostrarMensagem(isNovaPorta ? "Porta adicionada com sucesso." : "Porta atualizada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar a porta.", "erro");
  }
}

async function apagarPorta(ref) {
  if (!confirm("Queres apagar esta porta?")) return;
  try {
    if (typeof ref === "string" && window.db) {
      await db.collection("portas").doc(ref).delete();
    }
    const idx = idxPorRef(window.portasData, ref);
    if (idx >= 0) window.portasData.splice(idx, 1);
    guardarPortasLocal();
    filtrarPortasComEstado();
    mostrarMensagem("Porta apagada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar a porta.", "erro");
  }
}

/* Users */
let userEditRef = null;

function abrirAdicionarUser() {
  userEditRef = "__new__";
  const fields = ["nome","zona","user_pc_eye","pass_remote","pass_eye_peak","op_pistola","pass_pistola","nome_pc","teamviewer","user_mo365","pw_mo365","email_bragalis","pass_bragalis"];
  fields.forEach(f => { const node = el("editUser_" + f); if (node) node.value = ""; });
  const h3 = document.querySelector('#modalEditarUser h3'); if (h3) h3.textContent = 'Adicionar User';
  const sub = document.querySelector('#modalEditarUser .section-subtitle'); if (sub) sub.textContent = 'Criar um novo utilizador';
  if (el("modalEditarUser")) el("modalEditarUser").style.display = "flex";
}

function editarUser(ref) {
  const item = itemPorRef(window.usersData, ref);
  if (!item) return mostrarMensagem("User não encontrado.", "erro");
  userEditRef = ref;
  const fields = ["nome","zona","user_pc_eye","pass_remote","pass_eye_peak","op_pistola","pass_pistola","nome_pc","teamviewer","user_mo365","pw_mo365","email_bragalis","pass_bragalis"];
  fields.forEach(f => { const node = el("editUser_" + f); if (node) node.value = item[f] || ""; });
  if (el("modalEditarUser")) el("modalEditarUser").style.display = "flex";
}

function fecharEditarUser() {
  userEditRef = null;
  const h3 = document.querySelector('#modalEditarUser h3'); if (h3) h3.textContent = 'Editar User';
  const sub = document.querySelector('#modalEditarUser .section-subtitle'); if (sub) sub.textContent = 'Editar o utilizador selecionado';
  if (el("modalEditarUser")) el("modalEditarUser").style.display = "none";
}


async function guardarEdicaoUser() {

  if (userEditRef === null || typeof userEditRef === "undefined") {
    return mostrarMensagem("Nenhum user selecionado.", "erro");
  }

  const isNovoUser = userEditRef === "__new__";

  const payload = {};

  [
    "nome",
    "zona",
    "user_pc_eye",
    "pass_remote",
    "pass_eye_peak",
    "op_pistola",
    "pass_pistola",
    "nome_pc",
    "teamviewer",
    "user_mo365",
    "pw_mo365",
    "email_bragalis",
    "pass_bragalis"
  ].forEach(f => {

    payload[f] =
      el("editUser_" + f)
        ? el("editUser_" + f).value
        : "";

  });

  try {

    const userAtual =
      itemPorRef(window.usersData, userEditRef);

    const temFirebaseId =
      userAtual &&
      userAtual.idDoc &&
      !String(userAtual.idDoc).startsWith("local-user-");

    if (isNovoUser) {

      if (window.db) {

        const docRef =
          await db.collection("users").add(payload);

        window.usersData.unshift({
          idDoc: docRef.id,
          ...payload
        });

      } else {

        window.usersData.unshift({
          _ref: `local-user-${Date.now()}`,
          ...payload
        });

      }

    } else if (temFirebaseId && window.db) {

      await db
        .collection("users")
        .doc(userAtual.idDoc)
        .update(payload);

      const idx =
        idxPorRef(window.usersData, userEditRef);

      if (idx >= 0) {

        window.usersData[idx] = {
          ...window.usersData[idx],
          ...payload
        };

      }

    } else {

      if (window.db) {

        const docRef =
          await db.collection("users").add(payload);

        const idx =
          idxPorRef(window.usersData, userEditRef);

        if (idx >= 0) {

          window.usersData[idx] = {
            idDoc: docRef.id,
            ...payload
          };

        }

      } else {

        const idx =
          idxPorRef(window.usersData, userEditRef);

        if (idx >= 0) {

          window.usersData[idx] = {
            ...window.usersData[idx],
            ...payload
          };

        }

      }

    }

    guardarUsersLocal();

    fecharEditarUser();

    filtrarUsersComFiltros();

    mostrarMensagem(
      isNovoUser
        ? "User adicionado com sucesso."
        : "User atualizado com sucesso."
    );

  } catch (e) {

    console.error(e);

    mostrarMensagem(
      "Erro ao atualizar o user.",
      "erro"
    );

  }

}


async function apagarUser(ref) {
  if (!confirm("Queres apagar este user?")) return;
  try {
    if (typeof ref === "string" && window.db) {
      await db.collection("users").doc(ref).delete();
    }
    const idx = idxPorRef(window.usersData, ref);
    if (idx >= 0) window.usersData.splice(idx, 1);
    guardarUsersLocal();
    filtrarUsersComFiltros();
    mostrarMensagem("User apagado com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar o user.", "erro");
  }
}


function formatUserFieldLabel(chave) {
  const labels = {
    nome: "Nome",
    zona: "Zona",
    user_pc_eye: "User PC/EYE",
    pass_remote: "Pass Remote",
    pass_eye_peak: "Pass Eye Peak",
    op_pistola: "Op. Pistola",
    pass_pistola: "Pass Pistola",
    nome_pc: "Nome PC",
    teamviewer: "TeamViewer",
    user_mo365: "User MO365",
    pw_mo365: "Pw MO365",
    email_bragalis: "Email Bragalis",
    pass_bragalis: "Pass Bragalis"
  };
  return labels[chave] || chave;
}

function escapeHtmlAppBraga(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function imprimirUser(user) {

  // =========================
  // VALIDAR
  // =========================

  if (!user) {

    return mostrarMensagem(
      "User não encontrado.",
      "erro"
    );

  }

  // =========================
  // CAMPOS
  // =========================

  const campos = [

    "nome",
    "zona",
    "user_pc_eye",
    "pass_remote",
    "pass_eye_peak",
    "op_pistola",
    "pass_pistola",
    "nome_pc",
    "teamviewer",
    "user_mo365",
    "pw_mo365",
    "email_bragalis",
    "pass_bragalis"

  ];

  // =========================
  // LINHAS
  // =========================

  const linhas = campos

    .filter((campo) => {

      return (
        (user[campo] || "").trim() !== ""
      );

    })

    .map((campo) => `

      <div class="print-row">

        <div class="print-label">

          ${campo
            .replaceAll("_", " ")
            .toUpperCase()}

        </div>

        <div class="print-value">

          ${user[campo] || "-"}

        </div>

      </div>

    `)

    .join("");

  // =========================
  // TÍTULO
  // =========================

  const titulo =
    user.nome || "User";

  // =========================
  // HTML
  // =========================

  const htmlImpressao = `

<!DOCTYPE html>

<html lang="pt">

<head>

<meta charset="UTF-8">

<title>
  Imprimir Dados - ${titulo}
</title>

<style>

@page {

  size: 100mm 150mm;
  margin: 4mm;

}

html,
body {

  width: 100mm;
  height: 150mm;

  margin: 0;
  padding: 0;

  background: #ffffff;
  color: #111827;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

}

body {

  box-sizing: border-box;

}

.label-sheet {

  width: 100mm;
  min-height: 150mm;

  box-sizing: border-box;

  padding: 6mm;

  display: flex;
  flex-direction: column;

  gap: 3mm;

}

.title {

  font-size: 20px;
  font-weight: 700;

  margin: 0 0 2mm 0;

  border-bottom:
    1px solid #d1d5db;

  padding-bottom: 2mm;

}

.subtitle {

  font-size: 11px;
  color: #4b5563;

  margin: 0 0 1mm 0;

}

.content {

  display: flex;
  flex-direction: column;

  gap: 2.2mm;

  margin-top: 2mm;

}

.print-row {

  border:
    1px solid #e5e7eb;

  border-radius: 2mm;

  padding:
    2.2mm 2.5mm;

}

.print-label {

  font-size: 10px;
  font-weight: 700;

  color: #374151;

  margin-bottom: 1mm;

}

.print-value {

  font-size: 12px;

  line-height: 1.3;

  word-break: break-word;

  white-space: pre-wrap;

}

</style>

</head>

<body>

<div class="label-sheet">

<div class="subtitle">
  Etiqueta User - App Braga
</div>

<h1 class="title">
  ${titulo}
</h1>

<div class="content">

  ${linhas || `

    <div class="print-row">

      <div class="print-label">
        Sem dados
      </div>

      <div class="print-value">
        Este user não tem campos preenchidos.
      </div>

    </div>

  `}

</div>

</div>

</body>

</html>

`;

  // =========================
  // IFRAME
  // =========================

  const iframe =
    document.createElement(
      "iframe"
    );

  iframe.style.position =
    "fixed";

  iframe.style.right = "0";

  iframe.style.bottom = "0";

  iframe.style.width = "0";

  iframe.style.height = "0";

  iframe.style.border = "0";

  document.body.appendChild(
    iframe
  );

  const frameWindow =
    iframe.contentWindow;

  if (!frameWindow) {

    iframe.remove();

    return mostrarMensagem(
      "Erro ao abrir impressão",
      "erro"
    );

  }

  iframe.onload = () => {

    setTimeout(() => {

      try {

        frameWindow.focus();

        frameWindow.print();

      } catch (err) {

        console.error(err);

      }

      setTimeout(() => {

        iframe.remove();

      }, 1500);

    }, 300);

  };

  frameWindow.document.open();

  frameWindow.document.write(
    htmlImpressao
  );

  frameWindow.document.close();

}

/* Pistolas */
let pistolaEditRef = null;

function abrirAdicionarPistola() {
  pistolaEditRef = "__new__";
  ["num","nome","password","cn","sn","mac","operador","armazem","prontas"].forEach(f => { const node = el("editP_" + f); if (node) node.value = ""; });
  const h3 = document.querySelector('#modalEditarPistola h3'); if (h3) h3.textContent = 'Adicionar Pistola CK65';
  const sub = document.querySelector('#modalEditarPistola .section-subtitle'); if (sub) sub.textContent = 'Criar uma nova pistola';
  if (el("modalEditarPistola")) el("modalEditarPistola").style.display = "flex";
}

function editarPistola(ref) {
  const item = itemPorRef(window.pistolasData, ref);
  if (!item) return mostrarMensagem("Pistola não encontrada.", "erro");
  pistolaEditRef = ref;
  ["num","nome","password","cn","sn","mac","operador","armazem","prontas"].forEach(f => {
    const node = el("editP_" + f);
    if (node) node.value = item[f] || "";
  });
  if (el("modalEditarPistola")) el("modalEditarPistola").style.display = "flex";
}

function fecharEditarPistola() {
  pistolaEditRef = null;
  const h3 = document.querySelector('#modalEditarPistola h3'); if (h3) h3.textContent = 'Editar Pistola CK65';
  const sub = document.querySelector('#modalEditarPistola .section-subtitle'); if (sub) sub.textContent = 'Editar a pistola selecionada';
  if (el("modalEditarPistola")) el("modalEditarPistola").style.display = "none";
}

async function guardarEdicaoPistola() {
  if (pistolaEditRef === null || typeof pistolaEditRef === "undefined") return mostrarMensagem("Nenhuma pistola selecionada.", "erro");
  const isNovaPistola = pistolaEditRef === "__new__";
  const payload = {};
  ["num","nome","password","cn","sn","mac","operador","armazem","prontas"].forEach(f => {
    payload[f] = el("editP_" + f) ? el("editP_" + f).value : "";
  });

  try {
    if (isNovaPistola) {
      if (window.db) {
        const docRef = await db.collection("pistolas").add(payload);
        window.pistolasData.unshift({ idDoc: docRef.id, ...payload });
      } else {
        window.pistolasData.unshift({ _ref: `local-pistola-${Date.now()}`, ...payload });
      }
    } else if (typeof pistolaEditRef === "string" && window.db) {
      await db.collection("pistolas").doc(pistolaEditRef).update(payload);
      const idx = idxPorRef(window.pistolasData, pistolaEditRef);
      if (idx >= 0) window.pistolasData[idx] = { ...window.pistolasData[idx], ...payload };
    } else {
      const idx = idxPorRef(window.pistolasData, pistolaEditRef);
      if (idx >= 0) window.pistolasData[idx] = { ...window.pistolasData[idx], ...payload };
    }
    guardarPistolasLocal();
    fecharEditarPistola();
    filtrarPistolasComFiltros();
    mostrarMensagem(isNovaPistola ? "Pistola adicionada com sucesso." : "Pistola atualizada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar a pistola.", "erro");
  }
}

async function apagarPistola(ref) {
  if (!confirm("Queres apagar esta pistola?")) return;
  try {
    if (typeof ref === "string" && window.db) {
      await db.collection("pistolas").doc(ref).delete();
    }
    const idx = idxPorRef(window.pistolasData, ref);
    if (idx >= 0) window.pistolasData.splice(idx, 1);
    guardarPistolasLocal();
    filtrarPistolasComFiltros();
    mostrarMensagem("Pistola apagada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar a pistola.", "erro");
  }
}


function abrirAdicionarImpressora() {
  [["addImp_modelo",""],["addImp_serie",""],["addImp_armazem",""],["addImp_localizacao",""],["addImp_ip",""]].forEach(([id,v]) => { const node = el(id); if (node) node.value = v; });
  if (el("modalAdicionarImpressora")) el("modalAdicionarImpressora").style.display = "flex";
}

function fecharAdicionarImpressora() {
  if (el("modalAdicionarImpressora")) el("modalAdicionarImpressora").style.display = "none";
}

async function guardarNovaImpressora() {
  const payload = {
    modelo: el("addImp_modelo")?.value || "",
    serie: el("addImp_serie")?.value || "",
    armazem: el("addImp_armazem")?.value || "",
    localizacao: el("addImp_localizacao")?.value || "",
    ip: el("addImp_ip")?.value || ""
  };
  if (!normalizarTexto(payload.modelo) || !normalizarTexto(payload.serie) || !normalizarTexto(payload.ip)) {
    return mostrarMensagem("Preenche pelo menos Modelo, Série e IP.", "erro");
  }
  impressorasData.unshift({ _ref: `local-impressora-${Date.now()}`, ...payload });
  guardarImpressorasLocal();
  fecharAdicionarImpressora();
  filtrarImpressoras();
  mostrarMensagem("Impressora adicionada com sucesso.");
}

window.editarPorta = editarPorta;
window.fecharEditarPorta = fecharEditarPorta;
window.guardarEdicaoPorta = guardarEdicaoPorta;
window.apagarPorta = apagarPorta;
window.abrirAdicionarPorta = abrirAdicionarPorta;
window.abrirAdicionarImpressora = abrirAdicionarImpressora;
window.fecharAdicionarImpressora = fecharAdicionarImpressora;
window.guardarNovaImpressora = guardarNovaImpressora;

window.editarUser = editarUser;
window.fecharEditarUser = fecharEditarUser;
window.guardarEdicaoUser = guardarEdicaoUser;
window.apagarUser = apagarUser;

window.editarPistola = editarPistola;
window.fecharEditarPistola = fecharEditarPistola;
window.guardarEdicaoPistola = guardarEdicaoPistola;
window.apagarPistola = apagarPistola;
window.abrirAdicionarPistola = abrirAdicionarPistola;


/* ===== MODO VISUAL ===== */
function modoVisualInit() {
  document.body.classList.add("modo-visual-on");
  document.querySelectorAll(".panel, .pc-card, .dashboard-card, .stock-card, .history-card").forEach((node, index) => {
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
    setTimeout(() => {
      node.style.transition = "opacity 0.24s ease, transform 0.24s ease";
      node.style.opacity = "1";
      node.style.transform = "translateY(0)";
    }, 25 * Math.min(index, 10));
  });
}

window.addEventListener("load", modoVisualInit);


/* ===== MODO GESTOR EXTREMO ===== */
function getTopConsumoEquipamentos(limit = 4) {
  const map = new Map();
  historicoGlobal.forEach(item => {
    const key = `${item.equipamento || "-"} · ${item.localizacao || "-"}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a,b) => b[1]-a[1]).slice(0, limit);
}

function getTopProblemasDoDia(limit = 3) {
  const buckets = getCriticalityBucketsAppBraga();
  const topLocs = getTopLocalizacoesHistorico(2);
  const ultimos = getUltimosMovimentos(1);
  const problems = [];

  if (buckets.critical > 0) {
    problems.push(`Existem ${buckets.critical} impressoras em estado crítico.`);
  }
  if (buckets.warning > 0) {
    problems.push(`Existem ${buckets.warning} impressoras em zona de atenção.`);
  }
  if (topLocs.length) {
    problems.push(`Maior pressão recente em ${topLocs[0][0]} com ${topLocs[0][1]} movimentos.`);
  }
  if (ultimos.length) {
    const u = ultimos[0];
    problems.push(`Último movimento: ${u.equipamento || "-"} · ${u.cor || "-"} · ${u.localizacao || "-"}.`);
  }

  return problems.slice(0, limit);
}

function getPrioridadeMaximaGestor(limit = 4) {
  const rows = [];
  impressorasData.forEach(item => {
    const info = tonerInfoState[item.ip] || null;
    const colors = Array.isArray(info?.colors) ? info.colors : [];
    const crit = colors.filter(c => typeof c.percent === "number" && c.percent <= 10);
    if (crit.length) {
      rows.push({
        label: `${item.modelo} · ${item.localizacao}`,
        detail: crit.map(c => `${c.label}: ${c.percent}%`).join(" | ")
      });
    }
  });
  return rows.slice(0, limit);
}

function renderModoGestorExtremo() {
  const board = el("gestorExtremeBoard");
  const prioridade = el("gestorPrioridadeMaxima");
  const consumo = el("gestorTopConsumo");
  const problemas = el("gestorTopProblemas");
  if (!board && !prioridade && !consumo && !problemas) return;

  const buckets = getCriticalityBucketsAppBraga();
  const topLocs = getTopLocalizacoesHistorico(4);
  const topEquip = getTopConsumoEquipamentos(4);
  const topProb = getTopProblemasDoDia(3);
  const maxRows = getPrioridadeMaximaGestor(4);

  if (board) {
    board.innerHTML = `
      <div class="gestor-grid-hero">
        <div class="gestor-hero-card">
          <div class="gestor-hero-title">Estado executivo</div>
          <div class="gestor-hero-value">${buckets.critical > 0 ? "Pressão" : "Estável"}</div>
          <div class="gestor-hero-note">Visão imediata da operação para decidir onde agir primeiro.</div>
          <div class="gestor-chip-row">
            <span class="gestor-chip red">Críticos: ${buckets.critical}</span>
            <span class="gestor-chip yellow">Atenção: ${buckets.warning}</span>
            <span class="gestor-chip green">Stock: ${stockGlobal.length}</span>
          </div>
        </div>
        <div class="gestor-card">
          <h4>Movimento recente</h4>
          <div class="gestor-mini-value">${historicoGlobal.length}</div>
          <div class="meta-line">Total de registos usados no histórico.</div>
        </div>
        <div class="gestor-card">
          <h4>Capacidade atual</h4>
          <div class="gestor-mini-value">${stockGlobal.length}</div>
          <div class="meta-line">Itens disponíveis agora em stock.</div>
        </div>
        <div class="gestor-card">
          <h4>Base instalada</h4>
          <div class="gestor-mini-value">${pcsGlobal.length}</div>
          <div class="meta-line">PCs registados no sistema.</div>
        </div>
      </div>
    `;
  }

  if (prioridade) {
    prioridade.innerHTML = maxRows.length
      ? maxRows.map(item => `<div class="gestor-priority-card"><h4>${item.label}</h4><div class="meta-line">${item.detail}</div></div>`).join("")
      : `<div class="gestor-priority-card"><h4>Sem prioridade máxima</h4><div class="meta-line">Não existem impressoras abaixo de 10% neste momento.</div></div>`;
  }

  if (consumo) {
    consumo.innerHTML = `
      <div class="gestor-card">
        <h4>Top Localizações</h4>
        <ul class="gestor-list">
          ${topLocs.length ? topLocs.map(([k,v]) => `<li>${k} — ${v} movimentos</li>`).join("") : "<li>Sem dados suficientes</li>"}
        </ul>
      </div>
      <div class="gestor-card">
        <h4>Top Equipamentos</h4>
        <ul class="gestor-list">
          ${topEquip.length ? topEquip.map(([k,v]) => `<li>${k} — ${v}</li>`).join("") : "<li>Sem dados suficientes</li>"}
        </ul>
      </div>
    `;
  }

  if (problemas) {
    problemas.innerHTML = topProb.length
      ? topProb.map(txt => `<div class="gestor-alert-card"><h4>Ponto de gestão</h4><div class="meta-line">${txt}</div></div>`).join("")
      : `<div class="gestor-alert-card"><h4>Sem alertas do dia</h4><div class="meta-line">Ainda não há dados suficientes para destacar problemas.</div></div>`;
  }
}



/* ===== MELHORIAS 1 2 3 4 5 7 8 10 ===== */
const STOCK_MIN_DEFAULTS = {
  "Braga - Ilha 01": 1,
  "Braga - Ilha 02": 1,
  "Braga - Ilha 03": 1,
  "Braga - Ilha 04": 1,
  "Braga - Ilha 05": 1,
  "Braga - Balcão 01": 2,
  "Braga - Balcão 02": 2,
  "Braga - Dep. Logistica": 2,
  "Braga - G/Encomendas": 1,
  "Braga - Devoluções": 1,
  "Braga - Escritorio": 1,
  "Vila Real - Ilha 01": 1,
  "Vila Real - Ilha 02": 1,
  "Vila Real - Ilha 03": 1,
  "Sem Localização": 1
};

let stockEditModalId = null;
let historicoEditModalId = null;

function debounceAppBraga(fn, wait = 180) {
  let t = null;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function tryRenderAppBraga(fn) {
  try { fn(); } catch (e) { console.error(e); }
}

function loadStockMinConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("stockMinConfig") || "{}");
    return { ...STOCK_MIN_DEFAULTS, ...saved };
  } catch (e) {
    console.error(e);
    return { ...STOCK_MIN_DEFAULTS };
  }
}

function saveStockMinConfig(cfg) {
  localStorage.setItem("stockMinConfig", JSON.stringify(cfg || {}));
}

function normalizeLocMin(loc) {
  const raw = String(loc || "Sem Localização");
  if (raw.includes(" - ")) {
    const parts = raw.split(" - ");
    if (parts.length >= 3) return `${parts[1]} - ${parts[2]}`;
  }
  return raw;
}

function getStockByLocationCounts() {
  const map = {};
  stockGlobal.forEach(item => {
    const key = normalizeLocMin(item.localizacao);
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function renderStockMinimoPainel() {
  const host = el("stockMinimoPainel");
  if (!host) return;
  const config = loadStockMinConfig();
  const counts = getStockByLocationCounts();
  host.innerHTML = Object.keys(config).map(loc => {
    const atual = counts[loc] || 0;
    const minimo = Number(config[loc] || 0);
    const cls = atual < minimo ? "item-danger" : atual === minimo ? "item-warning" : "item-ok";
    const estado = atual < minimo ? "Abaixo do mínimo" : atual === minimo ? "No mínimo" : "Acima do mínimo";
    return `<div class="stock-min-card"><strong>${loc}</strong><div class="meta-line">Atual: <span class="meta-value ${cls}">${atual}</span></div><div class="meta-line">Mínimo: <span class="meta-value">${minimo}</span></div><div class="meta-line">${estado}</div></div>`;
  }).join("");
}

function renderStockMinimoConfig() {
  const host = el("stockMinimoConfigList");
  if (!host) return;
  const cfg = loadStockMinConfig();
  host.innerHTML = `<div class="minimo-grid">${
    Object.keys(cfg).map(loc => `
      <div class="minimo-item">
        <label>${loc}</label>
        <input type="number" min="0" value="${cfg[loc]}" data-stock-min-loc="${loc}">
      </div>
    `).join("")
  }</div>`;
}

function guardarStockMinimoConfig() {
  const inputs = document.querySelectorAll("[data-stock-min-loc]");
  const cfg = {};
  inputs.forEach(inp => { cfg[inp.getAttribute("data-stock-min-loc")] = Math.max(0, parseInt(inp.value || "0", 10) || 0); });
  saveStockMinConfig(cfg);
  mostrarMensagem("Stock mínimo guardado com sucesso.");
  tryRenderAppBraga(renderStockMinimoPainel);
  tryRenderAppBraga(renderAlertasInteligentes);
}

function resetStockMinimoConfig() {
  saveStockMinConfig(STOCK_MIN_DEFAULTS);
  renderStockMinimoConfig();
  renderStockMinimoPainel();
  renderAlertasInteligentes();
  mostrarMensagem("Stock mínimo reposto.");
}

function ensureLoteFieldOnEdit() {
  const item = localStorage.getItem("editarToner");
  if (!item || !el("lote")) return;
  try {
    const toner = JSON.parse(item);
    el("lote").value = toner.lote || "";
    if (el("dataFolha")) el("dataFolha").value = toner.dataFolha || "";
  } catch (e) { console.error(e); }
}

function extractLoteFromText(text) {
  const t = String(text || "").toUpperCase();
  const m = t.match(/(?:LOTE|LOT|BATCH)\s*[:#-]?\s*([A-Z0-9-]{4})/);
  return m ? m[1] : "";
}

function enhanceScannerStatus(extra = "") {
  const box = el("scannerSmartStatus");
  if (!box) return;
  box.innerText = extra || "Leitura pronta.";
}

function exportCsvFile(filename, headers, rows) {
  const content = [headers.join(";"), ...rows.map(r => headers.map(h => String(r[h] ?? "").replace(/\n/g, " ")).join(";"))].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportarExcelStock() {
  if (!stockGlobal.length) return mostrarMensagem("Não há stock para exportar.", "erro");
  exportCsvFile("stock_app_braga.csv", ["idInterno","equipamento","localizacao","cor","lote","data","dataFolha"], stockGlobal);
}

function exportarExcelHistorico() {
  if (!historicoGlobal.length) return mostrarMensagem("Não há histórico para exportar.", "erro");
  exportCsvFile("historico_app_braga.csv", ["idInterno","equipamento","localizacao","cor","lote","data","dataFolha"], historicoGlobal);
}

function exportarExcelTudo() {
  const rows = [...stockGlobal.map(x => ({...x, origem:"stock"})), ...historicoGlobal.map(x => ({...x, origem:"historico"}))];
  if (!rows.length) return mostrarMensagem("Não há dados para exportar.", "erro");
  exportCsvFile("dados_completos_app_braga.csv", ["origem","idInterno","equipamento","localizacao","cor","lote","data","dataFolha"], rows);
}

function filtrarHistoricoAvancado() {
  const texto = normalizarTexto(el("searchHistorico")?.value || "");
  const dFrom = el("filterHistoricoFrom")?.value || "";
  const dTo = el("filterHistoricoTo")?.value || "";
  const fLoc = normalizarTexto(el("filterHistoricoLocal")?.value || "");
  const fEq = normalizarTexto(el("filterHistoricoEquipamento")?.value || "");
  const fCor = normalizarTexto(el("filterHistoricoCor")?.value || "");

  const items = historicoGlobal.filter(t => {
    const data = String(t.data || "");
    const okText = !texto || [t.idInterno,t.equipamento,t.localizacao,t.cor,t.lote].some(v => normalizarTexto(v).includes(texto));
    const okFrom = !dFrom || data >= dFrom;
    const okTo = !dTo || data <= dTo;
    const okLoc = !fLoc || normalizarTexto(t.localizacao).includes(fLoc);
    const okEq = !fEq || normalizarTexto(t.equipamento).includes(fEq);
    const okCor = !fCor || normalizarTexto(t.cor).includes(fCor);
    return okText && okFrom && okTo && okLoc && okEq && okCor;
  });
  renderHistoricoCards(items);
}

function abrirEditarStockModal(id) {
  const item = stockGlobal.find(x => x.idDoc === id);
  if (!item) return mostrarMensagem("Item de stock não encontrado.", "erro");
  stockEditModalId = id;
  if (el("editStockEquipamento")) el("editStockEquipamento").value = item.equipamento || "";
  if (el("editStockCor")) el("editStockCor").value = item.cor || "";
  if (el("editStockLocalizacao")) el("editStockLocalizacao").value = item.localizacao || "";
  if (el("editStockLote")) el("editStockLote").value = item.lote || "";
  if (el("editStockData")) el("editStockData").value = item.data || "";
  if (el("editStockDataFolha")) el("editStockDataFolha").value = item.dataFolha || "";
  if (el("modalEditarStock")) el("modalEditarStock").style.display = "flex";
}

function fecharEdicaoStockModal() {
  stockEditModalId = null;
  if (el("modalEditarStock")) el("modalEditarStock").style.display = "none";
}

async function guardarEdicaoStockModal() {
  if (!stockEditModalId) return;
  const payload = {
    equipamento: el("editStockEquipamento")?.value || "",
    cor: el("editStockCor")?.value || "",
    localizacao: el("editStockLocalizacao")?.value || "",
    lote: el("editStockLote")?.value || "",
    data: el("editStockData")?.value || "",
    dataFolha: el("editStockDataFolha")?.value || ""
  };
  try {
    await db.collection("stock").doc(stockEditModalId).update(payload);
    fecharEdicaoStockModal();
    mostrarMensagem("Stock atualizado.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar stock.", "erro");
  }
}

async function apagarStockItem(id) {
  if (!confirm("Queres apagar este item do stock?")) return;
  try {
    await db.collection("stock").doc(id).delete();
    mostrarMensagem("Item de stock apagado.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar stock.", "erro");
  }
}

function abrirEditarHistoricoModal(id) {
  const item = historicoGlobal.find(x => x.idDoc === id);
  if (!item) return mostrarMensagem("Histórico não encontrado.", "erro");
  historicoEditModalId = id;
  if (el("editHistoricoEquipamento")) el("editHistoricoEquipamento").value = item.equipamento || "";
  if (el("editHistoricoCor")) el("editHistoricoCor").value = item.cor || "";
  if (el("editHistoricoLocalizacao")) el("editHistoricoLocalizacao").value = item.localizacao || "";
  if (el("editHistoricoLote")) el("editHistoricoLote").value = item.lote || "";
  if (el("editHistoricoData")) el("editHistoricoData").value = item.data || "";
  if (el("editHistoricoDataFolha")) el("editHistoricoDataFolha").value = item.dataFolha || "";
  if (el("modalEditarHistorico")) el("modalEditarHistorico").style.display = "flex";
}

function fecharEdicaoHistoricoModal() {
  historicoEditModalId = null;
  if (el("modalEditarHistorico")) el("modalEditarHistorico").style.display = "none";
}

async function guardarEdicaoHistoricoModal() {
  if (!historicoEditModalId) return;
  const payload = {
    equipamento: el("editHistoricoEquipamento")?.value || "",
    cor: el("editHistoricoCor")?.value || "",
    localizacao: el("editHistoricoLocalizacao")?.value || "",
    lote: el("editHistoricoLote")?.value || "",
    data: el("editHistoricoData")?.value || "",
    dataFolha: el("editHistoricoDataFolha")?.value || ""
  };
  try {
    await db.collection("historico").doc(historicoEditModalId).update(payload);
    fecharEdicaoHistoricoModal();
    mostrarMensagem("Histórico atualizado.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar histórico.", "erro");
  }
}

function buildAlertasInteligentes() {
  const cfg = loadStockMinConfig();
  const counts = getStockByLocationCounts();
  const rows = [];
  Object.keys(cfg).forEach(loc => {
    const atual = counts[loc] || 0;
    const minimo = Number(cfg[loc] || 0);
    if (atual < minimo) rows.push({ tipo: "stock", titulo: loc, detalhe: `Stock abaixo do mínimo: ${atual}/${minimo}` });
  });

  if (typeof impressorasData !== "undefined" && typeof tonerInfoState !== "undefined") {
    impressorasData.forEach(item => {
      const info = tonerInfoState[item.ip] || null;
      const colors = Array.isArray(info?.colors) ? info.colors : [];
      const crit = colors.filter(c => typeof c.percent === "number" && c.percent <= 20);
      if (crit.length) rows.push({ tipo: "printer", titulo: `${item.modelo} · ${item.localizacao}`, detalhe: crit.map(c => `${c.label}: ${c.percent}%`).join(" | ") });
    });
  }
  return rows.slice(0, 8);
}

function renderAlertasInteligentes() {
  const rows = buildAlertasInteligentes();
  ["alertasInteligentesDashboard","alertasInteligentesImpressoras"].forEach(id => {
    const host = el(id);
    if (!host) return;
    host.innerHTML = rows.length ? rows.map(r => `<div class="alert-inteligente-card"><strong>${r.titulo}</strong><div class="meta-line">${r.detalhe}</div></div>`).join("") : `<div class="alert-inteligente-card"><strong>Sem alertas</strong><div class="meta-line">Não existem alertas inteligentes ativos.</div></div>`;
  });
}

const filtrarStockDebounced = debounceAppBraga(function() {
  const input = el("search");
  if (!input) return;
  const txt = input.value.toLowerCase();
  const filtrados = stockGlobal.filter(t =>
    normalizarTexto(t.idInterno).includes(txt) ||
    normalizarTexto(t.equipamento).includes(txt) ||
    normalizarTexto(t.cor).includes(txt) ||
    normalizarTexto(t.localizacao).includes(txt) ||
    normalizarTexto(t.lote).includes(txt)
  );
  renderStockCards(filtrados);
}, 120);

const filtrarDashDebounced = debounceAppBraga(function() {
  renderDashboardCards();
}, 120);

window.exportarExcelStock = exportarExcelStock;
window.exportarExcelHistorico = exportarExcelHistorico;
window.exportarExcelTudo = exportarExcelTudo;
window.guardarStockMinimoConfig = guardarStockMinimoConfig;
window.resetStockMinimoConfig = resetStockMinimoConfig;
window.filtrarHistoricoAvancado = filtrarHistoricoAvancado;
window.abrirEditarStockModal = abrirEditarStockModal;
window.fecharEdicaoStockModal = fecharEdicaoStockModal;
window.guardarEdicaoStockModal = guardarEdicaoStockModal;
window.apagarStockItem = apagarStockItem;
window.abrirEditarHistoricoModal = abrirEditarHistoricoModal;
window.fecharEdicaoHistoricoModal = fecharEdicaoHistoricoModal;
window.guardarEdicaoHistoricoModal = guardarEdicaoHistoricoModal;




/* =========================
   ETIQUETAS WORD PARTILHADAS
========================= */
try { BACKUP_KEYS_APP_BRAGA.etiquetas = "appBraga_backup_etiquetas"; } catch (e) {}
let etiquetasWordGlobal = [];

function formatDatePTShared(valor) {
  const raw = String(valor || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  return raw;
}

function parseLocalizacaoEtiquetaShared(loc) {
  const raw = String(loc || "").trim();
  let serie = "";
  let localCurto = raw || "Sem Localização";
  let armazem = "";
  const parts = raw.split(" - ").map(v => v.trim()).filter(Boolean);
  if (parts.length >= 3) {
    serie = parts[0] || "";
    armazem = parts[1] || "";
    localCurto = parts.slice(2).join(" - ") || localCurto;
  } else {
    const printer = (typeof impressorasData !== "undefined" && Array.isArray(impressorasData)) ? impressorasData.find(p => normalizarTexto(raw).includes(normalizarTexto(p.localizacao)) || normalizarTexto(raw).includes(normalizarTexto(p.serie))) : null;
    if (printer) {
      serie = printer.serie || "";
      armazem = printer.armazem || "";
      localCurto = printer.localizacao || localCurto;
    }
  }
  return { serie, localCurto, armazem, localizacaoRaw: raw };
}

function montarPayloadEtiquetaPartilhada(extra = {}) {
  const loc = extra.localizacao || ((el("localizacao") && el("localizacao").value) || "");
  const info = parseLocalizacaoEtiquetaShared(loc);
  const dataFolha = extra.dataFolha || ((el("dataFolha") && el("dataFolha").value) || "");
  const dataScan = extra.data || ((el("data") && el("data").value) || "");
  const equipamento = extra.equipamento || ((el("equipamento") && el("equipamento").value) || "");
  const cor = extra.cor || ((el("cor") && el("cor").value) || "");
  const lote = extra.lote || ((el("lote") && el("lote").value) || "");
  const origem = extra.origem || "scan";
  return {
    serie: info.serie || extra.serie || "SEM SÉRIE",
    localCurto: info.localCurto || "Sem Localização",
    armazem: info.armazem || extra.armazem || "",
    localizacao: info.localizacaoRaw || loc || "Sem Localização",
    dataEtiqueta: formatDatePTShared(dataScan || dataFolha) || "Sem Data",
    dataScan: dataScan || "",
    data: dataScan || "",
    dataFolha: dataFolha || "",
    equipamento: equipamento || "",
    cor: cor || "",
    lote: lote || "",
    origem,
    created: Date.now()
  };
}

async function guardarEtiquetaPartilhada(extra = {}) {
  if (!db || !db.collection) return null;
  try {
    const payload = montarPayloadEtiquetaPartilhada(extra);
    const ref = await db.collection("etiquetasWord").add(payload);
    return { idDoc: ref.id, ...payload };
  } catch (e) {
    console.error("Erro ao guardar etiqueta partilhada:", e);
    return null;
  }
}

async function gerarWordEtiquetaPartilhada(dados, opts = {}) {
  try {
    if (typeof docx === "undefined") {
      mostrarMensagem("Biblioteca Word não carregada.", "erro");
      return false;
    }
    const payload = montarPayloadEtiquetaPartilhada(dados || {});
    const { Document, Packer, Paragraph, AlignmentType, TextRun } = docx;
    const doc = new Document({
      creator: "App Braga",
      title: "Etiqueta Toner",
      sections: [{ children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 3200, after: 500 }, children: [ new TextRun({ text: payload.localCurto, bold: true, size: 42 }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 2800 }, children: [ new TextRun({ text: payload.serie, bold: true, size: 64 }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, children: [ new TextRun({ text: payload.dataEtiqueta, bold: true, size: 56 }) ] })
      ] }]
    });
    const blob = await Packer.toBlob(doc);
    const fileName = `Etiqueta_${String(payload.localCurto || "Etiqueta").replace(/\s+/g, "_")}_${payload.serie || "SEM_SERIE"}.docx`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 1200);
    if (opts.saveRecord !== false) await guardarEtiquetaPartilhada(payload);
    if (!opts.silent) mostrarMensagem("Etiqueta guardada e pronta para download.");
    return true;
  } catch (e) {
    console.error("Erro ao gerar etiqueta partilhada:", e);
    mostrarMensagem("Erro ao gerar a etiqueta Word.", "erro");
    return false;
  }
}

window.gerarWordEtiquetaPartilhada = gerarWordEtiquetaPartilhada;

function renderEtiquetasWordCards() {
  const host = el("listaEtiquetasWord");
  if (!host) return;
  const texto = normalizarTexto(el("searchEtiquetasWord")?.value || "");
  const origem = normalizarTexto(el("filterEtiquetasOrigem")?.value || "");
  let items = Array.isArray(etiquetasWordGlobal) ? [...etiquetasWordGlobal] : [];
  if (origem) items = items.filter(x => normalizarTexto(x.origem).includes(origem));
  if (texto) {
    items = items.filter(x => [x.serie,x.localCurto,x.localizacao,x.equipamento,x.cor,x.lote,x.dataEtiqueta].some(v => normalizarTexto(v).includes(texto)));
  }
  setText("countEtiquetasTotal", items.length);
  const hoje = new Date();
  const ymd = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  setText("countEtiquetasStock", items.filter(x => String(x.data || x.dataFolha || "").startsWith(ymd) || String(x.dataEtiqueta || "").includes(`${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`)).length);
  setText("countEtiquetasHistorico", new Set(items.map(x => x.serie || x.localCurto || x.localizacao)).size);
  if (!items.length) {
    host.innerHTML = `<div class="panel empty-state"><h3>Sem etiquetas</h3><p>Faz scan no iPhone e a etiqueta aparece aqui para download no PC.</p></div>`;
    return;
  }
  host.innerHTML = items.map(t => `
    <div class="stock-card">
      <div class="stock-id">${t.localCurto || t.localizacao || 'Etiqueta'}</div>
      <div class="meta-line">Série: <span class="meta-value">${t.serie || '-'}</span></div>
      <div class="meta-line">Armazém: <span class="meta-value">${t.armazem || '-'}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${t.localizacao || '-'}</span></div>
      <div class="meta-line">Equipamento: <span class="meta-value">${t.equipamento || '-'}</span></div>
      <div class="meta-line">Cor: <span class="meta-value">${t.cor || '-'}</span></div>
      <div class="meta-line">Lote: <span class="meta-value">${t.lote || '-'}</span></div>
      <div class="meta-line">Data: <span class="meta-value">${t.dataEtiqueta || '-'}</span></div>
      <div class="meta-line">Origem: <span class="meta-value">${t.origem || 'scan'}</span></div>
      <div class="card-actions">
        <button class="small-btn btn-use" onclick="regerarEtiquetaWordPartilhada('${t.idDoc}')">Imprimir</button>
        <button class="small-btn btn-delete" onclick="apagarEtiquetaWordPartilhada('${t.idDoc}')">Apagar</button>
      </div>
    </div>`).join("");
}


function montarHtmlEtiquetaImpressao(item) {
  const linhas = [
    ["Local", item.localCurto || item.localizacao],
    ["Série", item.serie],
    ["Armazém", item.armazem],
    ["Localização", item.localizacao],
    ["Equipamento", item.equipamento],
    ["Cor", item.cor],
    ["Lote", item.lote],
    ["Data", item.dataScan || item.dataEtiqueta || item.data || item.dataFolha],
    ["Origem", item.origem]
  ].filter(([,v]) => String(v || '').trim());

  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c] || c));
  const rows = linhas.map(([k,v]) => `<div class="etq-row"><div class="etq-key">${escapeHtml(k)}</div><div class="etq-val">${escapeHtml(v)}</div></div>`).join('');
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Etiqueta</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  html, body { margin:0; padding:0; width:100mm; height:150mm; font-family: Arial, sans-serif; }
  body { box-sizing:border-box; padding:8mm; color:#111; }
  .etq-wrap { width:100%; height:100%; display:flex; flex-direction:column; justify-content:flex-start; }
  .etq-title { font-size:20px; font-weight:700; margin:0 0 6mm; }
  .etq-row { display:flex; flex-direction:column; margin:0 0 3.5mm; }
  .etq-key { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; }
  .etq-val { font-size:16px; line-height:1.25; word-break:break-word; }
</style>
</head>
<body>
  <div class="etq-wrap">
    <div class="etq-title">${escapeHtml(item.localCurto || item.localizacao || 'Etiqueta')}</div>
    ${rows}
  </div>
</body>
</html>`;
}

async function regerarEtiquetaWordPartilhada(id) {
  const item = etiquetasWordGlobal.find(x => x.idDoc === id);
  if (!item) return mostrarMensagem("Etiqueta não encontrada.", "erro");
  try {
    const existente = document.getElementById('printAreaEtiquetaAppBraga');
    if (existente) existente.remove();
    const overlay = document.createElement('div');
    overlay.id = 'printAreaEtiquetaAppBraga';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = '#fff';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = montarHtmlEtiquetaOverlay(item);
    document.body.appendChild(overlay);

    const oldTitle = document.title;
    document.title = `Etiqueta-${(item.localCurto || item.localizacao || 'Etiqueta')}`;

    setTimeout(() => {
      try {
        window.print();
        mostrarMensagem('Etiqueta pronta a imprimir.');
      } catch (e) {
        console.error(e);
        mostrarMensagem('Erro ao abrir a impressão.', 'erro');
      } finally {
        setTimeout(() => {
          try { overlay.remove(); } catch (e) {}
          document.title = oldTitle;
        }, 600);
      }
    }, 150);
  } catch (e) {
    console.error(e);
    mostrarMensagem('Erro ao preparar impressão.', 'erro');
  }
}

function montarHtmlEtiquetaOverlay(item) {
  const linhas = [
    ["Local", item.localCurto || item.localizacao],
    ["Série", item.serie],
    ["Armazém", item.armazem],
    ["Localização", item.localizacao],
    ["Equipamento", item.equipamento],
    ["Cor", item.cor],
    ["Lote", item.lote],
    ["Data", item.dataScan || item.dataEtiqueta || item.data || item.dataFolha],
    ["Origem", item.origem]
  ].filter(([,v]) => String(v || '').trim());

  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c));
  const rows = linhas.map(([k,v]) => `<div class="etq-row"><div class="etq-key">${escapeHtml(k)}</div><div class="etq-val">${escapeHtml(v)}</div></div>`).join('');
  return `
    <style>
      @media print {
        @page { size: 100mm 150mm; margin: 0; }
        html, body { width: 100mm !important; height: 150mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #fff !important; }
        body * { visibility: hidden !important; }
        #printAreaEtiquetaAppBraga, #printAreaEtiquetaAppBraga * { visibility: visible !important; }
        #printAreaEtiquetaAppBraga { position: fixed !important; inset: 0 !important; width: 100mm !important; height: 150mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #fff !important; }
      }
      #printAreaEtiquetaAppBraga .etq-sheet { width:100mm; height:150mm; max-width:100mm; max-height:150mm; overflow:hidden; box-sizing:border-box; padding:8mm; color:#111; font-family:Arial, sans-serif; background:#fff; display:flex; flex-direction:column; justify-content:flex-start; break-inside: avoid; page-break-inside: avoid; break-after: avoid-page; page-break-after: avoid; }
      #printAreaEtiquetaAppBraga .etq-title { font-size:20px; font-weight:700; margin:0 0 6mm; }
      #printAreaEtiquetaAppBraga .etq-row { display:flex; flex-direction:column; margin:0 0 3.5mm; }
      #printAreaEtiquetaAppBraga .etq-key { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; }
      #printAreaEtiquetaAppBraga .etq-val { font-size:16px; line-height:1.25; word-break:break-word; }
    </style>
    <div class="etq-sheet">
      <div class="etq-title">${escapeHtml(item.localCurto || item.localizacao || 'Etiqueta')}</div>
      ${rows}
    </div>`;
}


async function apagarEtiquetaWordPartilhada(id) {
  if (!confirm("Queres apagar esta etiqueta?")) return;
  try {
    await db.collection("etiquetasWord").doc(id).delete();
    mostrarMensagem("Etiqueta apagada.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar etiqueta.", "erro");
  }
}
window.regerarEtiquetaWordPartilhada = regerarEtiquetaWordPartilhada;
window.apagarEtiquetaWordPartilhada = apagarEtiquetaWordPartilhada;

function bindEtiquetasWordRealtime() {
  if (!db || !db.collection) return;
  db.collection("etiquetasWord").orderBy("created", "desc").onSnapshot((snap) => {
    etiquetasWordGlobal = [];
    snap.forEach((doc) => {
      const t = ({ firebaseId: doc.id, ...doc.data() }) || {};
      t.idDoc = doc.id;
      etiquetasWordGlobal.push(t);
    });
    try { saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.etiquetas, etiquetasWordGlobal); } catch (e) {}
    renderEtiquetasWordCards();
  }, (error) => {
    console.error(error);
    try { etiquetasWordGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.etiquetas); } catch (e) { etiquetasWordGlobal = []; }
    renderEtiquetasWordCards();
  });
}

window.addEventListener("DOMContentLoaded", () => {
  if (el("searchEtiquetasWord")) el("searchEtiquetasWord").addEventListener("input", renderEtiquetasWordCards);
  if (el("filterEtiquetasOrigem")) el("filterEtiquetasOrigem").addEventListener("change", renderEtiquetasWordCards);
  if (el("listaEtiquetasWord")) renderEtiquetasWordCards();
  bindEtiquetasWordRealtime();
});



/* =========================================================
   APP BRAGA — SIDEBAR BRINKA + DASHBOARD CLEAN
   ========================================================= */
(function(){
  function closestPanel(el){while(el&&el!==document.body){if(el.classList&&el.classList.contains('panel'))return el;el=el.parentElement;}return null;}
  function initBrinkaSidebar(){var sidebar=document.querySelector('.sidebar');if(!sidebar)return;if(!document.querySelector('.app-menu-toggle')){var btn=document.createElement('button');btn.className='app-menu-toggle';btn.type='button';btn.setAttribute('aria-label','Abrir menu');btn.textContent='☰';document.body.appendChild(btn);}if(!document.querySelector('.app-sidebar-overlay')){var ov=document.createElement('div');ov.className='app-sidebar-overlay';document.body.appendChild(ov);}var btn=document.querySelector('.app-menu-toggle');var overlay=document.querySelector('.app-sidebar-overlay');function open(){sidebar.classList.add('app-open');overlay.classList.add('show');btn.textContent='×';}function close(){sidebar.classList.remove('app-open');overlay.classList.remove('show');btn.textContent='☰';}btn.onclick=function(e){e.preventDefault();e.stopPropagation();sidebar.classList.contains('app-open')?close():open();};overlay.onclick=close;sidebar.querySelectorAll('a').forEach(function(a){a.addEventListener('click',close);});}
  function cleanDashboard(){var path=(location.pathname||'').toLowerCase();var isDashboard=path.endsWith('/')||path.endsWith('/index.html')||path.indexOf('index.html')!==-1;if(!isDashboard)return;document.body.classList.add('dashboard-clean');var removeTitles=['Centro Operacional Inteligente','Prioridade Máxima','Top Consumo','Alertas do Dia','Alertas Inteligentes'];document.querySelectorAll('h3').forEach(function(h){var t=(h.textContent||'').trim();if(removeTitles.indexOf(t)>=0){var p=closestPanel(h);if(p)p.classList.add('is-dashboard-removed');}});}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){initBrinkaSidebar();cleanDashboard();});}else{initBrinkaSidebar();cleanDashboard();}
})();


/* =========================
   IMPORT EXCEL FIREBASE
========================= */

async function importarExcelFirebase(){

  const input =
    document.getElementById(
      "excelImportFirebase"
    );

  if(!input){

    alert(
      "Input Excel não encontrado."
    );

    return;
  }

  input.click();

}

window.importarExcelFirebase =
  importarExcelFirebase;

window.addEventListener(
  "DOMContentLoaded",
  () => {

    const excelInput =
      document.getElementById(
        "excelImportFirebase"
      );

    if(!excelInput){
      console.log(
        "Input Excel não encontrado"
      );
      return;
    }

    excelInput.addEventListener(
      "change",
      async (event) => {

        try{

          const file =
            event.target.files?.[0];

          if(!file) return;

          const data =
            await file.arrayBuffer();

          const workbook =
            XLSX.read(data);

          const usersSheet =
            workbook.Sheets["Users"];

          const pistolasSheet =
            workbook.Sheets["Pistolas"];

          const portasSheet =
            workbook.Sheets["Portas"];

          if(usersSheet){

            const users =
              XLSX.utils.sheet_to_json(
                usersSheet
              );

            for(const user of users){

              await window.db
                .collection("users")
                .add(user);

            }

          }

          if(pistolasSheet){

            const pistolas =
              XLSX.utils.sheet_to_json(
                pistolasSheet
              );

            for(const item of pistolas){

              await window.db
                .collection("pistolas")
                .add(item);

            }

          }

          if(portasSheet){

            const portas =
              XLSX.utils.sheet_to_json(
                portasSheet
              );

            for(const item of portas){

              await window.db
                .collection("portas")
                .add(item);

            }

          }

          alert(
            "Excel importado para Firebase."
          );

        }catch(error){

          console.error(error);

          alert(
            "Erro: " + error.message
          );

        }

      }
    );

  }
);



/* =========================
   EXPORT JSON SYSTEM
========================= */

function descarregarJSON(nome, dados){

  try{

    const blob = new Blob(
      [
        JSON.stringify(
          dados || [],
          null,
          2
        )
      ],
      {
        type:"application/json"
      }
    );

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =
      nome + "_" +
      Date.now() +
      ".json";

    document.body.appendChild(a);

    a.click();

    setTimeout(()=>{

      URL.revokeObjectURL(a.href);

      a.remove();

    },1000);

  }catch(error){

    console.error(error);

    alert(
      "Erro ao exportar JSON."
    );

  }

}

/* USERS */

function exportUsersJSON(){

  descarregarJSON(
    "users_backup",
    typeof window.usersData !== "undefined"
      ? window.usersData
      : []
  );

}

/* PISTOLAS */

function exportPistolasJSON(){

  descarregarJSON(
    "pistolas_backup",
    typeof window.pistolasData !== "undefined"
      ? window.pistolasData
      : []
  );

}

/* PORTAS */

function exportPortasJSON(){

  descarregarJSON(
    "portas_backup",
    typeof window.portasData !== "undefined"
      ? window.portasData
      : []
  );

}

window.exportUsersJSON =
  exportUsersJSON;

window.exportPistolasJSON =
  exportPistolasJSON;

window.exportPortasJSON =
  exportPortasJSON;




/* =========================
   IMPORT JSON FIREBASE
========================= */

async function importarUsersJSONFirebase(){

  try{

    if(!window.db){

      alert(
        "Firebase não iniciada."
      );

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const users =
          JSON.parse(text);

        if(!Array.isArray(users)){

          alert(
            "JSON inválido."
          );

          return;

        }

        let total = 0;

        for(const user of users){

          await window.db
            .collection("users")
            .add(user);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " users."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro ao importar JSON."
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

window.importarUsersJSONFirebase =
  importarUsersJSONFirebase;




/* =========================
   EXPORT + IMPORT JSON
========================= */

function descarregarJSON(nome, dados){

  try{

    const blob = new Blob(
      [
        JSON.stringify(
          dados || [],
          null,
          2
        )
      ],
      {
        type:"application/json"
      }
    );

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =
      nome + "_" +
      Date.now() +
      ".json";

    document.body.appendChild(a);

    a.click();

    setTimeout(()=>{

      URL.revokeObjectURL(a.href);

      a.remove();

    },1000);

  }catch(error){

    console.error(error);

    alert("Erro export JSON");

  }

}

/* EXPORTS */

function exportUsersJSON(){

  descarregarJSON(
    "users_backup",
    typeof window.usersData !== "undefined"
      ? window.usersData
      : []
  );

}

function exportPistolasJSON(){

  descarregarJSON(
    "pistolas_backup",
    typeof window.pistolasData !== "undefined"
      ? window.pistolasData
      : []
  );

}

function exportPortasJSON(){

  descarregarJSON(
    "portas_backup",
    typeof window.portasData !== "undefined"
      ? window.portasData
      : []
  );

}

/* IMPORT USERS */

async function importarUsersJSONFirebase(){

  try{

    if(!window.db){

      alert("Firebase não iniciada.");

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const users =
          JSON.parse(text);

        if(!Array.isArray(users)){

          alert("JSON inválido");

          return;

        }

        let total = 0;

        for(const user of users){

          await window.db
            .collection("users")
            .add(user);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " users."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro import users: "
          + error.message
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

/* IMPORT PISTOLAS */

async function importarPistolasJSONFirebase(){

  try{

    if(!window.db){

      alert("Firebase não iniciada.");

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const dados =
          JSON.parse(text);

        let total = 0;

        for(const item of dados){

          await window.db
            .collection("pistolas")
            .add(item);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " pistolas."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro import pistolas: "
          + error.message
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

/* IMPORT PORTAS */

async function importarPortasJSONFirebase(){

  try{

    if(!window.db){

      alert("Firebase não iniciada.");

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const dados =
          JSON.parse(text);

        let total = 0;

        for(const item of dados){

          await window.db
            .collection("portas")
            .add(item);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " portas."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro import portas: "
          + error.message
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

window.exportUsersJSON = exportUsersJSON;
window.exportPistolasJSON = exportPistolasJSON;
window.exportPortasJSON = exportPortasJSON;

window.importarUsersJSONFirebase =
  importarUsersJSONFirebase;

window.importarPistolasJSONFirebase =
  importarPistolasJSONFirebase;

window.importarPortasJSONFirebase =
  importarPortasJSONFirebase;



window.db = firebase.firestore();






// removed old helper
/*
 const el = document.getElementById("InputUser");
 if(el && user){
   el.value = user. || "";
 }
};

*/
/* removed old helper */
function _unused(){
 const el = document.getElementById("InputUser");
 return el ? el.value.trim() : "";
};




/* ORDENAÇÃO ALFANUMÉRICA USERS */
setInterval(() => {
  try{
    if(Array.isArray(window.usersData)){
      window.usersData.sort((a,b)=>{
        const na = String(a?.nome || '').toLowerCase();
        const nb = String(b?.nome || '').toLowerCase();
        return na.localeCompare(nb,'pt',{numeric:true});
      });
    }
  }catch(e){
    console.error(e);
  }
},1000);



/* ===== ORGANIZAÇÃO ALFANUMÉRICA ===== */

function ordenarColecaoAlfaNumerica(lista,campo="nome"){

  try{

    if(!Array.isArray(lista)) return lista;

    return lista.sort((a,b)=>{

      const aTxt =
        String(a?.[campo] || "")
        .toLowerCase();

      const bTxt =
        String(b?.[campo] || "")
        .toLowerCase();

      return aTxt.localeCompare(
        bTxt,
        'pt',
        {
          numeric:true,
          sensitivity:'base'
        }
      );

    });

  }catch(e){

    console.error(e);

    return lista;

  }

}

setInterval(()=>{

  try{

    if(window.usersData){
      ordenarColecaoAlfaNumerica(
        window.usersData,
        "nome"
      );
    }

    if(window.pistolasData){
      ordenarColecaoAlfaNumerica(
        window.pistolasData,
        "nome"
      );
    }

    if(window.portasData){
      ordenarColecaoAlfaNumerica(
        window.portasData,
        "nome"
      );
    }

  }catch(e){

    console.error(e);

  }

},1500);



/* ===== ORDENAÇÃO ALFANUMÉRICA SEGURA ===== */

window.safeOrdenacaoAlfa = function(lista,campo="nome"){

  try{

    if(!Array.isArray(lista)) return lista;

    return lista.sort((a,b)=>{

      const aTxt =
        String(a?.[campo] || "")
          .toLowerCase();

      const bTxt =
        String(b?.[campo] || "")
          .toLowerCase();

      return aTxt.localeCompare(
        bTxt,
        'pt',
        {
          numeric:true,
          sensitivity:'base'
        }
      );

    });

  }catch(e){

    console.error(e);

    return lista;

  }

};



window.addEventListener('error',function(e){
  console.error('GLOBAL APP ERROR:',e.error||e.message);
});





/* ===== PISTOLAS STABLE REALTIME PATCH ===== */

window.getListaPistolas = function(){

  if(Array.isArray(window.pistolas)){
    return window.pistolas;
  }

  if(Array.isArray(window.listaPistolas)){
    return window.listaPistolas;
  }

  if(Array.isArray(window.pistolasData)){
    return window.pistolasData;
  }

  return [];

};

window.renderPistolas = function(lista){

  const container =
    document.querySelector("#listaPistolas");

  if(!container) return;

  lista = Array.isArray(lista)
    ? lista
    : getListaPistolas();

  const total = lista.length;

  const braga = lista.filter(
    p => String(p.armazem || "")
      .toLowerCase()
      .includes("braga")
  ).length;

  const reserva = lista.filter(
    p => String(p.operador || "")
      .toLowerCase()
      .includes("reserva")
  ).length;

  const totalEl =
    document.querySelector("#countPistolas");

  const bragaEl =
    document.querySelector("#countPistolasBraga");

  const reservaEl =
    document.querySelector("#countPistolasReserva");

  if(totalEl) totalEl.textContent = total;
  if(bragaEl) bragaEl.textContent = braga;
  if(reservaEl) reservaEl.textContent = reserva;

  container.innerHTML = lista.map((p,index)=>{

    const id =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return `

      <div class="pc-card">

        <div class="pc-name">
          ${p.nome || "-"}
        </div>

        <div class="meta-line">
          Nº: ${p.num || "-"}
        </div>

        <div class="meta-line">
          Operador:
          ${p.operador || "-"}
        </div>

        <button
          class="secondary-btn"
          onclick="editarPistola('${id}')">

          Editar

        </button>

      </div>

    `;

  }).join("");

};

window.editarPistola = function(id){

  const lista = getListaPistolas();

  const pistola = lista.find((p,index)=>{

    const pid =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return String(pid) === String(id);

  });

  if(!pistola){
    console.error("Pistola não encontrada", id);
    return;
  }

  window.pistolaAtual = pistola;

  const map = {
    num: "#editP_num",
    nome: "#editP_nome",
    password: "#editP_password",
    cn: "#editP_cn",
    sn: "#editP_sn",
    mac: "#editP_mac",
    operador: "#editP_operador",
    armazem: "#editP_armazem",
    prontas: "#editP_prontas"
  };

  Object.entries(map).forEach(([key,selector])=>{

    const el = document.querySelector(selector);

    if(el){
      el.value = pistola[key] || "";
    }

  });

  const modal =
    document.querySelector("#modalEditarPistola");

  if(modal){
    modal.style.display = "flex";
  }

};

console.log("PISTOLAS REALTIME FIX OK");



/* ===== PISTOLAS SAVE + SORT FIX ===== */

window.sortPistolasNaturally = function(lista){

  return [...lista].sort((a,b)=>{

    const aa = String(a.nome || a.num || "");
    const bb = String(b.nome || b.num || "");

    return aa.localeCompare(
      bb,
      "pt",
      {
        numeric:true,
        sensitivity:"base"
      }
    );

  });

};

const oldRender = window.renderPistolas;

window.renderPistolas = function(lista){

  lista = Array.isArray(lista)
    ? sortPistolasNaturally(lista)
    : sortPistolasNaturally(getListaPistolas());

  return oldRender(lista);

};

window.guardarEdicaoPistola = async function(){

  try{

    const pistola = window.pistolaAtual;

    if(!pistola){

      alert("Nenhuma Pistola foi selecionada");
      return;

    }

    const id =
      pistola.idDoc ||
      pistola.id ||
      pistola.docId;

    if(!id){

      alert("ID da pistola inválido");
      return;

    }

    const dados = {

      nome:
        document.querySelector("#editP_nome")?.value || "",

      num:
        document.querySelector("#editP_num")?.value || "",

      password:
        document.querySelector("#editP_password")?.value || "",

      cn:
        document.querySelector("#editP_cn")?.value || "",

      sn:
        document.querySelector("#editP_sn")?.value || "",

      mac:
        document.querySelector("#editP_mac")?.value || "",

      operador:
        document.querySelector("#editP_operador")?.value || "",

      armazem:
        document.querySelector("#editP_armazem")?.value || "",

      prontas:
        document.querySelector("#editP_prontas")?.value || ""

    };

    await window.db
      .collection("pistolas")
      .doc(id)
      .update(dados);

    Object.assign(
      pistola,
      dados
    );

    renderPistolas();

    const modal =
      document.querySelector("#modalEditarPistola");

    if(modal){
      modal.style.display = "none";
    }

    console.log("PISTOLA GUARDADA");

  }catch(err){

    console.error(err);
    alert("Erro ao guardar pistola");

  }

};

document.addEventListener("click", e => {

  const btn = e.target.closest("button");

  if(!btn) return;

  if(
    btn.textContent
      .toLowerCase()
      .includes("guardar")
  ){

    const modal =
      document.querySelector("#modalEditarPistola");

    if(modal &&
      modal.style.display !== "none"){

      e.preventDefault();

      guardarEdicaoPistola();

    }

  }

});

console.log("PISTOLAS SAVE FIX OK");



/* ===== PISTOLAS VIEW + DELETE + SEARCH FIX ===== */

window.verMaisPistola = function(id){

  const lista = getListaPistolas();

  const pistola = lista.find((p,index)=>{

    const pid =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return String(pid) === String(id);

  });

  if(!pistola){
    alert("Pistola não encontrada");
    return;
  }

  alert(
`Nome: ${pistola.nome || "-"}

Nº: ${pistola.num || "-"}

Password: ${pistola.password || "-"}

CN: ${pistola.cn || "-"}

SN: ${pistola.sn || "-"}

MAC: ${pistola.mac || "-"}

Operador: ${pistola.operador || "-"}

Armazém: ${pistola.armazem || "-"}

Prontas: ${pistola.prontas || "-"}`
  );

};

window.apagarPistola = async function(id){

  const confirmar = confirm(
    "Deseja apagar esta pistola?"
  );

  if(!confirmar) return;

  try{

    await window.db
      .collection("pistolas")
      .doc(id)
      .delete();

    console.log("PISTOLA APAGADA");

  }catch(err){

    console.error(err);
    alert("Erro ao apagar pistola");

  }

};

const oldRenderPistolas2 = window.renderPistolas;

window.renderPistolas = function(lista){

  lista = Array.isArray(lista)
    ? lista
    : getListaPistolas();

  lista = sortPistolasNaturally(lista);

  const container =
    document.querySelector("#listaPistolas");

  if(!container){
    return oldRenderPistolas2(lista);
  }

  const total = lista.length;

  const totalEl =
    document.querySelector("#countPistolas");

  if(totalEl){
    totalEl.textContent = total;
  }

  container.innerHTML = lista.map((p,index)=>{

    const id =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return `

      <div class="pc-card">

        <div class="pc-name">
          ${p.nome || "-"}
        </div>

        <div class="meta-line">
          Nº:
          <span class="meta-value">
            ${p.num || "-"}
          </span>
        </div>

        <div class="meta-line">
          Operador:
          <span class="meta-value">
            ${p.operador || "-"}
          </span>
        </div>

        <div class="item-actions">

          <button
            class="secondary-btn"
            onclick="editarPistola('${id}')">
            Editar
          </button>

          <button
            class="secondary-btn"
            onclick="verMaisPistola('${id}')">
            Ver Mais
          </button>

          <button
            class="secondary-btn"
            onclick="apagarPistola('${id}')">
            Apagar
          </button>

        </div>

      </div>

    `;

  }).join("");

};

window.filtrarPistolas = function(txt=""){

  const termo =
    String(txt || "")
      .toLowerCase()
      .trim();

  const lista = getListaPistolas();

  const filtradas = lista.filter(p => {

    return [
      p.nome,
      p.num,
      p.password,
      p.cn,
      p.sn,
      p.mac,
      p.operador,
      p.armazem,
      p.prontas
    ].some(v =>

      String(v || "")
        .toLowerCase()
        .includes(termo)

    );

  });

  renderPistolas(filtradas);

};

window.filtrarPistolasComFiltros = function(){

  const input =
    document.querySelector("#searchPistolas");

  const txt = input
    ? input.value
    : "";

  filtrarPistolas(txt);

};

document.addEventListener("input", e => {

  if(
    e.target &&
    e.target.id === "searchPistolas"
  ){

    filtrarPistolas(e.target.value);

  }

});

console.log("PISTOLAS VIEW/DELETE/SEARCH FIX OK");


// ===== APP_BRAGA_THEME_SYSTEM =====

window.loadTheme = function(){

  try{

    const savedTheme =
      localStorage.getItem("app-theme") || "dark";

    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");

    if(savedTheme === "dark"){
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    }

  }catch(e){
    console.log(e);
  }

};

window.saveTheme = function(theme){

  try{
    localStorage.setItem("app-theme", theme);
  }catch(e){
    console.log(e);
  }

};

window.toggleTheme = function(){

  const isDark =
    document.body.classList.contains("dark");

  const newTheme =
    isDark ? "light" : "dark";

  window.saveTheme(newTheme);
  window.loadTheme();

};

document.addEventListener(
  "DOMContentLoaded",
  window.loadTheme
);

window.addEventListener(
  "pageshow",
  window.loadTheme
);


function verInformacao(id) {
  const item = informacoesData.find(info => info.id === id);
  if (!item) return;
  document.getElementById("modalInfoTitulo").innerText = item.titulo || "Informação";
  document.getElementById("modalInfoDescricao").innerText = item.obs || "Sem observações";
  document.getElementById("infoModal").classList.remove("hidden");
}

function fecharInfoModal() {
  document.getElementById("infoModal")?.classList.add("hidden");
}

function editarInformacao(id) {
  informacaoSelecionada = id;
  editarInformacaoSelecionada();
}

function apagarInformacao(id) {
  informacaoSelecionada = id;
  apagarInformacaoSelecionada();
}

window.verInformacao = verInformacao;
window.fecharInfoModal = fecharInfoModal;
window.editarInformacao = editarInformacao;
window.apagarInformacao = apagarInformacao;








// ===== ENTERPRISE RADIOS FIREBASE =====

window.radiosRealtime = [];

function abrirModalRadio() {

    const modal = document.getElementById('radioModal');

    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function fecharModalRadio() {

    const modal = document.getElementById('radioModal');

    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }

    ['radioNome','radioMac','radioSerial'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

async function criarRadioRealtime() {

    const nome =
      document.getElementById('radioNome')?.value?.trim() || '';

    const mac =
      document.getElementById('radioMac')?.value?.trim() || '';

    const serial =
      document.getElementById('radioSerial')?.value?.trim() || '';

    if (!nome) {
        alert('Preenche o nome do rádio');
        return;
    }

    try {

        await 

// ===== FIM ENTERPRISE RADIOS FIREBASE =====


// ===== ENTERPRISE RADIOS UI =====

function renderRadiosRealtime(radios) {

    const container =
      document.getElementById('radiosRealtimeList');

    if (!container) return;

    container.innerHTML = '';

    radios.sort((a,b)=>
      (a.nome || '').localeCompare(b.nome || '')
    );

    radios.forEach(radio => {

        const card = document.createElement('div');

        card.style.background = '#111827';
        card.style.border = '1px solid rgba(255,255,255,.08)';
        card.style.borderRadius = '16px';
        card.style.padding = '18px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '10px';

        card.innerHTML = `
            <div style="font-size:18px;font-weight:700;color:white;">
                ${radio.nome || ''}
            </div>

            <div style="color:#9ca3af;">
                MAC: ${radio.mac || ''}
            </div>

            <div style="color:#9ca3af;">
                Série: ${radio.serial || ''}
            </div>

            <div style="display:flex;gap:10px;margin-top:10px;">

                <button class="enterprise-btn primary"
                    onclick="editarRadio('${radio.id}')">
                    Editar
                </button>

                <button class="enterprise-btn delete"
                    onclick="apagarRadio('${radio.id}')">
                    Apagar
                </button>

            </div>
        `;

        container.appendChild(card);
    });

    renderRelatorioSemanal(radios);
}

async function apagarRadio(id) {

    const confirmar = confirm('Apagar rádio?');

    if (!confirmar) return;

    await firebase.firestore()
      .collection('radios')
      .doc(id)
      .delete();
}

function editarRadio(id) {

    const radio =
      window.radiosRealtime.find(r => r.id === id);

    if (!radio) return;

    abrirModalRadio();

    document.getElementById('radioNome').value =
      radio.nome || '';

    document.getElementById('radioMac').value =
      radio.mac || '';

    document.getElementById('radioSerial').value =
      radio.serial || '';

    window.radioEditarId = id;
}

function renderRelatorioSemanal(radios) {

    const container =
      document.getElementById('relatorioSemanalList');

    if (!container) return;

    const hoje = new Date();

    const semana = `Semana 1 - ${hoje.toLocaleDateString()}`;

    container.innerHTML = `
        <div style="background:#111827;padding:18px;border-radius:16px;">

            <div style="display:flex;justify-content:space-between;align-items:center;">

                <div style="color:white;font-weight:700;">
                    ${semana}
                </div>

                <button class="enterprise-btn primary"
                    onclick="abrirRelatorioSemanal()">
                    Ver Detalhes
                </button>

            </div>

        </div>
    `;
}

function abrirRelatorioSemanal() {

    const radios =
      window.radiosRealtime || [];

    const detalhes = radios.map(r =>
      `${r.nome} | ${r.user || 'Sem User'}`
    ).join('\n');

    alert(detalhes || 'Sem rádios');
}

document.addEventListener('DOMContentLoaded', () => {

    const novoBtn =
      document.getElementById('novoRadioBtn');

    if (novoBtn) {
        novoBtn.onclick = abrirModalRadio;
    }
});

// ===== FIM ENTERPRISE RADIOS UI =====


// ===== FIREBASE RADIOS RECONNECT =====

window.radiosRealtime = [];

function startRadiosRealtime() {

    if (!window.firebase || !firebase.firestore) {
        console.error('Firebase indisponível');
        return;
    }

    const db = firebase.firestore();

    db.collection('radios')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {

          const radios = [];

          snapshot.forEach((doc) => {
              radios.push({
                  id: doc.id,
                  ...doc.data()
              });
          });

          window.radiosRealtime = radios;

          if (typeof renderRadiosRealtime === 'function') {
              renderRadiosRealtime(radios);
          }

      }, (error) => {
          console.error('Erro Firestore radios:', error);
      });
}

document.addEventListener('DOMContentLoaded', () => {

    setTimeout(() => {
        startRadiosRealtime();
    }, 500);

});

// ===== FIM FIREBASE RADIOS RECONNECT =====


// ===== RADIOS ENTERPRISE FINAL =====

window.radiosRealtime = [];
window.radioEditarId = null;

function abrirModalRadio() {
    const modal = document.getElementById('radioModal');
    if(modal) modal.style.display = 'flex';
}

function fecharModalRadio() {
    const modal = document.getElementById('radioModal');
    if(modal) modal.style.display = 'none';

    ['radioNome','radioMac','radioSerial']
    .forEach(id=>{
        const el = document.getElementById(id);
        if(el) el.value = '';
    });

    window.radioEditarId = null;
}

async function guardarRadioRealtime(){

    const nome =
      document.getElementById('radioNome').value.trim();

    const mac =
      document.getElementById('radioMac').value.trim();

    const serial =
      document.getElementById('radioSerial').value.trim();

    if(!nome) return alert('Preenche o nome do rádio');

    const db = firebase.firestore();

    if(window.radioEditarId){

        await db.collection('radios')
        .doc(window.radioEditarId)
        .update({
            nome,
            mac,
            serial
        });

    }else{

        await db.collection('radios')
        .add({
            nome,
            mac,
            serial,
            createdAt: Date.now()
        });
    }

    fecharModalRadio();
}

async function apagarRadio(id){

    const confirmar = confirm('Apagar rádio?');

    if(!confirmar) return;

    await firebase.firestore()
    .collection('radios')
    .doc(id)
    .delete();
}

function editarRadio(id){

    const radio =
      window.radiosRealtime.find(r=>r.id===id);

    if(!radio) return;

    window.radioEditarId = id;

    abrirModalRadio();

    document.getElementById('radioNome').value =
      radio.nome || '';

    document.getElementById('radioMac').value =
      radio.mac || '';

    document.getElementById('radioSerial').value =
      radio.serial || '';
}

function renderRelatorio(radios){

    const div =
      document.getElementById('relatorioSemanal');

    if(!div) return;

    const hoje = new Date();

    div.innerHTML = `
        <div style="background:#111827;
            padding:18px;
            border-radius:18px;">

            <div style="display:flex;
                justify-content:space-between;
                align-items:center;">

                <div>
                    Semana 1 de
                    ${hoje.toLocaleDateString()}
                </div>

                <button class="enterprise-btn primary"
                    onclick="verRelatorioDetalhes()">

                    Ver Detalhes

                </button>

            </div>

        </div>
    `;
}

function verRelatorioDetalhes(){

    const radios = window.radiosRealtime || [];

    const texto = radios.map(r=>`
Rádio: ${r.nome}
MAC: ${r.mac}
Série: ${r.serial}
User: ${r.user || 'Sem User'}
    `).join('\n');

    alert(texto || 'Sem rádios');
}

function renderRadiosRealtime(radios){

    const container =
      document.getElementById('radiosList');

    if(!container) return;

    container.innerHTML = '';

    radios.sort((a,b)=>
      (a.nome || '').localeCompare(b.nome || '')
    );

    radios.forEach(radio=>{

        const card = document.createElement('div');

        card.className = 'radio-card';

        card.innerHTML = `
            <div style="font-size:20px;
                font-weight:700;
                margin-bottom:10px;">

                ${radio.nome || ''}

            </div>

            <div style="margin-bottom:6px;">
                MAC: ${radio.mac || ''}
            </div>

            <div>
                Série: ${radio.serial || ''}
            </div>

            <div style="display:flex;
                gap:10px;
                margin-top:16px;">

                <button class="enterprise-btn edit"
                    onclick="editarRadio('${radio.id}')">

                    Editar

                </button>

                <button class="enterprise-btn delete"
                    onclick="apagarRadio('${radio.id}')">

                    Apagar

                </button>

            </div>
        `;

        container.appendChild(card);
    });

    renderRelatorio(radios);
}

function startRadiosRealtime(){

    firebase.firestore()
    .collection('radios')
    .orderBy('createdAt','desc')
    .onSnapshot(snapshot=>{

        const radios = [];

        snapshot.forEach(doc=>{
            radios.push({
                id: doc.id,
                ...doc.data()
            });
        });

        window.radiosRealtime = radios;

        renderRadiosRealtime(radios);
    });
}

document.addEventListener('DOMContentLoaded', ()=>{

    document.getElementById('novoRadioBtn')
    ?.addEventListener('click', abrirModalRadio);

    document.getElementById('fecharModalBtn')
    ?.addEventListener('click', fecharModalRadio);

    document.getElementById('guardarRadioBtn')
    ?.addEventListener('click', guardarRadioRealtime);

    setTimeout(()=>{
        startRadiosRealtime();
    },500);

});

// ===== FIM RADIOS ENTERPRISE FINAL =====
