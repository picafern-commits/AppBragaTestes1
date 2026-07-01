(function(){
  "use strict";

  const TEAMS_COLLECTION = "equipasSemanais";
  const CONFIG_COLLECTION = "config";
  const CONFIG_DOC = "equipasSemanais";
  const LOCAL_TEAMS_KEY = "appBraga_equipasSemanais_local";
  const LOCAL_CONFIG_KEY = "appBraga_equipasSemanais_config";

  let teams = [];
  let users = [];
  let selectedMembers = [];
  let editingId = null;
  let unsubscribeTeams = null;
  let unsubscribeConfig = null;
  let rotationStart = mondayOf(new Date()).toISOString().slice(0, 10);
  let firstTeamId = "";

  const $ = (id) => document.getElementById(id);
  const db = () => window.db || null;

  function escapeHtml(value){
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toast(message, type){
    if (typeof window.mostrarMensagem === "function") return window.mostrarMensagem(message, type || "sucesso");
    console[type === "erro" ? "error" : "log"](message);
    alert(message);
  }

  function userId(user){
    return String(user.idDoc || user._ref || user.id || user.nome || user.email_bragalis || "");
  }

  function userName(user){
    return String(user.nome || user.name || user.displayName || user.email_bragalis || userId(user) || "Sem nome");
  }

  function memberKey(member){
    return String(member?.id || member?.idDoc || member?.nome || "");
  }

  function mondayOf(date){
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function addDays(date, days){
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function formatDate(date){
    try { return new Intl.DateTimeFormat("pt-PT", { day:"2-digit", month:"2-digit", year:"numeric" }).format(date); }
    catch { return date.toISOString().slice(0,10); }
  }

  function weekLabel(start){
    const end = addDays(start, 6);
    return `${formatDate(start)} a ${formatDate(end)}`;
  }

  function orderedTeams(){
    return [...teams].sort((a,b)=>{
      const ao = Number(a.ordem || 9999);
      const bo = Number(b.ordem || 9999);
      if (ao !== bo) return ao - bo;
      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt");
    });
  }

  function getRotationInfo(){
    let list = orderedTeams();
    if (!list.length) return { list, current:null, next:null, currentIndex:-1, weekStart:mondayOf(new Date()), nextWeekStart:addDays(mondayOf(new Date()),7) };
    const firstIndex = firstTeamId ? list.findIndex(t => t.idDoc === firstTeamId) : -1;
    if (firstIndex > 0) list = [...list.slice(firstIndex), ...list.slice(0, firstIndex)];
    const start = mondayOf(new Date(rotationStart + "T00:00:00"));
    const nowWeek = mondayOf(new Date());
    const diffWeeks = Math.floor((nowWeek - start) / (7 * 24 * 60 * 60 * 1000));
    const idx = ((diffWeeks % list.length) + list.length) % list.length;
    const nextIdx = (idx + 1) % list.length;
    return { list, current:list[idx], next:list[nextIdx], currentIndex:idx, weekStart:nowWeek, nextWeekStart:addDays(nowWeek,7) };
  }

  function saveLocal(){
    try { localStorage.setItem(LOCAL_TEAMS_KEY, JSON.stringify(teams)); } catch {}
    try { localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify({ rotationStart, firstTeamId })); } catch {}
  }

  function loadLocal(){
    try { teams = JSON.parse(localStorage.getItem(LOCAL_TEAMS_KEY) || "[]") || []; } catch { teams = []; }
    try {
      const cfg = JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY) || "{}") || {};
      if (cfg.rotationStart) rotationStart = cfg.rotationStart;
      if (cfg.firstTeamId) firstTeamId = String(cfg.firstTeamId);
    } catch {}
  }

  async function loadUsers(){
    const select = $("equipaUserSelect");
    try {
      if (db()?.collection) {
        const snap = await db().collection("users").get();
        users = snap.docs.map(doc => ({ idDoc: doc.id, ...doc.data() }));
      } else if (Array.isArray(window.usersData)) {
        users = window.usersData;
      }
    } catch (error) {
      console.error("Erro ao carregar users para equipas:", error);
      users = Array.isArray(window.usersData) ? window.usersData : [];
    }
    users.sort((a,b)=>userName(a).localeCompare(userName(b), "pt"));
    if (select) {
      select.innerHTML = `<option value="">Selecionar user...</option>` + users.map(u => {
        const id = userId(u);
        const label = userName(u);
        const zona = u.zona ? ` — ${u.zona}` : "";
        return `<option value="${escapeHtml(id)}">${escapeHtml(label + zona)}</option>`;
      }).join("");
    }
  }

  function hydrateConfig(data){
    if (data?.rotationStart) rotationStart = String(data.rotationStart).slice(0,10);
    if (data?.firstTeamId) firstTeamId = String(data.firstTeamId);
    const input = $("equipasRotationStart");
    if (input) input.value = rotationStart || mondayOf(new Date()).toISOString().slice(0,10);
    const firstSelect = $("equipasFirstTeam");
    if (firstSelect) firstSelect.value = firstTeamId || "";
  }

  function renderFirstTeamOptions(){
    const select = $("equipasFirstTeam");
    if (!select) return;
    const currentValue = firstTeamId || select.value || "";
    const list = orderedTeams();
    select.innerHTML = `<option value="">Escolher equipa...</option>` + list.map(team =>
      `<option value="${escapeHtml(team.idDoc)}">${escapeHtml(team.nome || "Equipa sem nome")}</option>`
    ).join("");
    if (currentValue && list.some(t => t.idDoc === currentValue)) select.value = currentValue;
    else select.value = "";
  }

  function hydrateTeams(snapshot){
    teams = snapshot.docs.map(doc => ({ idDoc: doc.id, ...doc.data() }));
    saveLocal();
    render();
  }

  function listenData(){
    loadLocal();
    hydrateConfig({ rotationStart });
    render();
    if (!db()?.collection) return;
    try {
      unsubscribeTeams?.();
      unsubscribeTeams = db().collection(TEAMS_COLLECTION).onSnapshot(hydrateTeams, (error)=>{
        console.error("Erro realtime equipas:", error);
        toast("Erro ao carregar equipas semanais.", "erro");
      });
      unsubscribeConfig?.();
      unsubscribeConfig = db().collection(CONFIG_COLLECTION).doc(CONFIG_DOC).onSnapshot((doc)=>{
        if (doc.exists) hydrateConfig(doc.data());
        render();
      });
    } catch (error) {
      console.error(error);
    }
  }

  function renderWeekSummary(){
    const info = getRotationInfo();
    const currentName = $("equipaAtualNome");
    const currentDates = $("equipaAtualDatas");
    const nextName = $("proximaEquipaNome");
    const nextDates = $("proximaEquipaDatas");
    const currentMembers = $("equipaAtualMembros");
    const nextMembers = $("proximaEquipaMembros");
    if (currentName) currentName.textContent = info.current?.nome || "Sem equipa definida";
    if (currentDates) currentDates.textContent = info.current ? `Semana ${weekLabel(info.weekStart)}` : "Cria a primeira equipa para iniciar.";
    if (nextName) nextName.textContent = info.next?.nome || "-";
    if (nextDates) nextDates.textContent = info.next ? `Começa ${formatDate(info.nextWeekStart)}` : "-";
    if (currentMembers) currentMembers.innerHTML = info.current ? renderMembers(info.current.members) : "Sem membros definidos.";
    if (nextMembers) nextMembers.innerHTML = info.next ? renderMembers(info.next.members) : "-";
  }

  function renderMembers(members){
    const list = Array.isArray(members) ? members : [];
    if (!list.length) return `<span class="equipas-empty-pill">Sem membros</span>`;
    return list.map(m => `<span class="member-pill">${escapeHtml(m.nome || m.name || memberKey(m))}</span>`).join("");
  }

  function weeksUntilTeam(team, info){
    if (!team || !info.list.length) return "-";
    const index = info.list.findIndex(item => item.idDoc === team.idDoc);
    if (index < 0) return "-";
    let diff = index - info.currentIndex;
    if (diff < 0) diff += info.list.length;
    if (diff === 0) return "Esta semana";
    if (diff === 1) return "Próxima semana";
    return `Daqui a ${diff} semanas`;
  }

  function render(){
    renderFirstTeamOptions();
    renderWeekSummary();
    const box = $("equipasCards");
    if (!box) return;
    const info = getRotationInfo();
    const query = String($("searchEquipas")?.value || "").toLowerCase().trim();
    let list = info.list;
    if (query) {
      list = list.filter(team => {
        const hay = [team.nome, ...(team.members || []).map(m => m.nome)].join(" ").toLowerCase();
        return hay.includes(query);
      });
    }
    if (!list.length) {
      box.innerHTML = `<div class="equipas-empty panel"><strong>Sem equipas para mostrar.</strong><span>Carrega em Adicionar Equipa para criar a primeira rotação.</span></div>`;
      return;
    }
    box.innerHTML = list.map((team, idx)=>{
      const isCurrent = info.current?.idDoc === team.idDoc;
      const members = Array.isArray(team.members) ? team.members : [];
      return `<article class="equipa-card ${isCurrent ? "is-current" : ""}">
        <div class="equipa-card-top">
          <div>
            <span class="equipa-card-label">${isCurrent ? "⭐ Esta semana" : "Equipa"}</span>
            <h3>${escapeHtml(team.nome || "Equipa sem nome")}</h3>
          </div>
          <span class="equipa-order">#${Number(team.ordem || idx + 1)}</span>
        </div>
        <div class="equipa-members">${renderMembers(members)}</div>
        <div class="equipa-meta">
          <span>${members.length} membro(s)</span>
          <span>${escapeHtml(weeksUntilTeam(team, info))}</span>
        </div>
        <div class="equipa-actions">
          <button type="button" class="primary-btn equipa-current-btn" data-action="current" data-id="${escapeHtml(team.idDoc)}" ${isCurrent ? "disabled" : ""}>${isCurrent ? "Atual" : "Esta semana"}</button>
          <button type="button" class="secondary-btn" data-action="up" data-id="${escapeHtml(team.idDoc)}">Subir</button>
          <button type="button" class="secondary-btn" data-action="down" data-id="${escapeHtml(team.idDoc)}">Descer</button>
          <button type="button" class="secondary-btn" data-action="edit" data-id="${escapeHtml(team.idDoc)}">Editar</button>
          <button type="button" class="danger-btn" data-action="delete" data-id="${escapeHtml(team.idDoc)}">Apagar</button>
        </div>
      </article>`;
    }).join("");
  }

  function renderSelectedMembers(){
    const box = $("equipaMembersSelected");
    const count = $("equipaMembersCount");
    if (count) count.textContent = `${selectedMembers.length} membro(s)`;
    if (!box) return;
    if (!selectedMembers.length) {
      box.classList.add("empty");
      box.innerHTML = "Ainda não escolheste nenhum user.";
      return;
    }
    box.classList.remove("empty");
    box.innerHTML = selectedMembers.map(m => `<button type="button" class="member-chip" data-remove-member="${escapeHtml(memberKey(m))}">${escapeHtml(m.nome)} <span>×</span></button>`).join("");
  }

  function openModal(team){
    editingId = team?.idDoc || null;
    selectedMembers = Array.isArray(team?.members) ? team.members.map(m => ({...m})) : [];
    if ($("modalEquipaTitulo")) $("modalEquipaTitulo").textContent = editingId ? "Editar Equipa" : "Adicionar Equipa";
    if ($("equipaNome")) $("equipaNome").value = team?.nome || "";
    if ($("equipaOrdem")) $("equipaOrdem").value = team?.ordem || (teams.length + 1);
    renderSelectedMembers();
    const modal = $("modalEquipa");
    if (modal) modal.style.display = "flex";
  }

  function closeModal(){
    editingId = null;
    selectedMembers = [];
    const modal = $("modalEquipa");
    if (modal) modal.style.display = "none";
  }

  function addSelectedUser(){
    const id = $("equipaUserSelect")?.value;
    if (!id) return;
    const user = users.find(u => userId(u) === id);
    if (!user) return;
    if (selectedMembers.some(m => memberKey(m) === id)) return toast("Esse user já está na equipa.", "erro");
    selectedMembers.push({ id, nome: userName(user), zona: user.zona || "" });
    renderSelectedMembers();
    if ($("equipaUserSelect")) $("equipaUserSelect").value = "";
  }

  async function saveTeam(){
    const nome = String($("equipaNome")?.value || "").trim();
    const ordem = Number($("equipaOrdem")?.value || teams.length + 1);
    if (!nome) return toast("Escreve o nome da equipa.", "erro");
    if (!selectedMembers.length) return toast("Escolhe pelo menos um user.", "erro");
    const payload = {
      nome,
      ordem: Number.isFinite(ordem) && ordem > 0 ? ordem : teams.length + 1,
      members: selectedMembers,
      updatedAtMs: Date.now()
    };
    try {
      if (db()?.collection) {
        if (editingId) await db().collection(TEAMS_COLLECTION).doc(editingId).set(payload, { merge:true });
        else await db().collection(TEAMS_COLLECTION).add({ ...payload, createdAtMs: Date.now() });
        await saveRotationStart(false);
      } else {
        if (editingId) {
          const idx = teams.findIndex(t => t.idDoc === editingId);
          if (idx >= 0) teams[idx] = { ...teams[idx], ...payload };
        } else teams.push({ idDoc:`local-equipa-${Date.now()}`, createdAtMs: Date.now(), ...payload });
        saveLocal();
        render();
      }
      closeModal();
      toast(editingId ? "Equipa atualizada." : "Equipa criada.");
    } catch (error) {
      console.error(error);
      toast("Erro ao gravar equipa.", "erro");
    }
  }

  async function deleteTeam(id){
    const team = teams.find(t => t.idDoc === id);
    if (!team) return;
    if (!confirm(`Apagar ${team.nome || "esta equipa"}?`)) return;
    try {
      if (db()?.collection && !String(id).startsWith("local-")) await db().collection(TEAMS_COLLECTION).doc(id).delete();
      teams = teams.filter(t => t.idDoc !== id);
      saveLocal();
      render();
      toast("Equipa apagada.");
    } catch (error) {
      console.error(error);
      toast("Erro ao apagar equipa.", "erro");
    }
  }

  async function swapOrder(id, dir){
    const list = orderedTeams();
    const index = list.findIndex(t => t.idDoc === id);
    const other = list[index + dir];
    const current = list[index];
    if (!current || !other) return;
    const a = Number(current.ordem || index + 1);
    const b = Number(other.ordem || index + dir + 1);
    try {
      if (db()?.collection) {
        await Promise.all([
          db().collection(TEAMS_COLLECTION).doc(current.idDoc).set({ ordem:b, updatedAtMs: Date.now() }, { merge:true }),
          db().collection(TEAMS_COLLECTION).doc(other.idDoc).set({ ordem:a, updatedAtMs: Date.now() }, { merge:true })
        ]);
      } else {
        current.ordem = b; other.ordem = a; saveLocal(); render();
      }
    } catch (error) {
      console.error(error);
      toast("Erro ao alterar ordem.", "erro");
    }
  }

  async function saveRotationStart(showToast = true){
    const selectedTeamId = $("equipasFirstTeam")?.value || firstTeamId || "";
    if (!selectedTeamId) return toast("Escolhe a equipa que está a trabalhar nessa semana.", "erro");
    return setTeamForWeek(selectedTeamId, $("equipasRotationStart")?.value || new Date(), showToast);
  }

  async function setTeamForWeek(teamId, dateValue = new Date(), showToast = true){
    const team = teams.find(t => t.idDoc === teamId);
    if (!team) return toast("Equipa não encontrada.", "erro");
    const baseDate = dateValue instanceof Date
      ? dateValue
      : new Date(String(dateValue || "").includes("T") ? dateValue : String(dateValue || "") + "T00:00:00");
    rotationStart = mondayOf(baseDate).toISOString().slice(0,10);
    firstTeamId = String(teamId);
    const input = $("equipasRotationStart");
    if (input) input.value = rotationStart;
    const select = $("equipasFirstTeam");
    if (select) select.value = firstTeamId;
    try {
      if (db()?.collection) {
        await db().collection(CONFIG_COLLECTION).doc(CONFIG_DOC).set({ rotationStart, firstTeamId, updatedAtMs: Date.now() }, { merge:true });
      }
      saveLocal();
      render();
      if (showToast) toast(`${team.nome || "Equipa"} definida para a semana de ${weekLabel(mondayOf(rotationStart + "T00:00:00"))}.`);
    } catch (error) {
      console.error(error);
      toast("Erro ao definir equipa da semana.", "erro");
    }
  }

  function bindEvents(){
    document.querySelectorAll(".js-open-equipa, #btnAbrirEquipa").forEach(btn => btn.addEventListener("click", () => openModal(null)));
    $("btnFecharEquipa")?.addEventListener("click", closeModal);
    $("btnCancelarEquipa")?.addEventListener("click", closeModal);
    $("btnAdicionarUserEquipa")?.addEventListener("click", addSelectedUser);
    $("btnGuardarEquipa")?.addEventListener("click", saveTeam);
    $("btnGuardarRotacao")?.addEventListener("click", () => saveRotationStart(true));
    $("equipasFirstTeam")?.addEventListener("change", () => { firstTeamId = $("equipasFirstTeam")?.value || ""; render(); });
    $("btnEquipasReload")?.addEventListener("click", () => { loadUsers(); render(); toast("Equipas atualizadas."); });
    $("searchEquipas")?.addEventListener("input", render);
    $("equipasCards")?.addEventListener("click", (event)=>{
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === "edit") openModal(teams.find(t => t.idDoc === id));
      if (action === "delete") deleteTeam(id);
      if (action === "up") swapOrder(id, -1);
      if (action === "down") swapOrder(id, 1);
      if (action === "current") setTeamForWeek(id, new Date(), true);
    });
    $("equipaMembersSelected")?.addEventListener("click", (event)=>{
      const btn = event.target.closest("[data-remove-member]");
      if (!btn) return;
      const id = btn.dataset.removeMember;
      selectedMembers = selectedMembers.filter(m => memberKey(m) !== id);
      renderSelectedMembers();
    });
    $("modalEquipa")?.addEventListener("click", (event)=>{
      if (event.target.id === "modalEquipa") closeModal();
    });
    window.addEventListener("beforeunload", () => { try { unsubscribeTeams?.(); unsubscribeConfig?.(); } catch {} });
  }

  function init(){
    bindEvents();
    loadUsers();
    listenData();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
