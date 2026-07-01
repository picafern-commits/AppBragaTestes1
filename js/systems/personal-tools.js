(function () {
  "use strict";

  const DB_NAME = "app-braga-offline-queue";
  const DB_STORE = "queue";
  const TASK_NOTIFY_URL = "https://europe-west1-toner-manager-756c4.cloudfunctions.net/sendNotificationBroadcast";
  const DATE_FMT = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const TIME_FMT = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const state = {
    collections: {},
    unsubs: [],
    tasksUnsub: null,
    queueCount: 0,
    taskFilter: "open",
    taskSearch: ""
  };

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function isDashboard() {
    return /\/html\/index\.html$/i.test(location.pathname) || /\/index\.html$/i.test(location.pathname) || !!document.getElementById("listaDashboardStock");
  }

  function isTasksPage() {
    return /\/html\/tarefas\.html$/i.test(location.pathname) || /\/tarefas\.html$/i.test(location.pathname) || !!document.getElementById("personalTasksPage");
  }

  function db() {
    return window.db && typeof window.db.collection === "function" ? window.db : null;
  }

  async function notifyTaskCreated(task = {}, taskId = "") {
    if (!navigator.onLine || !task?.title) return;
    const priority = String(task.priority || "").toLowerCase();
    const high = priority === "alta" || priority === "high" || priority === "urgente";
    const details = [task.owner ? `Responsavel: ${task.owner}` : "", task.dueDate ? `Prazo: ${task.dueDate}` : ""].filter(Boolean).join(" - ");
    try {
      const response = await fetch(TASK_NOTIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: `task-client-${taskId || Date.now()}`,
          title: high ? "Tarefa importante" : "Nova tarefa",
          body: `${task.title}${details ? ` - ${details}` : ""}`,
          event: high ? "task-client-high" : "task-client-created",
          url: "https://picafern-commits.github.io/App-Tablet/html/tarefas.html",
          tag: `task-client-${taskId || task.title}`
        })
      });
      return response.ok;
    } catch (error) {
      console.warn("Não foi possível enviar notificação da tarefa:", error);
    }
    return false;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function todayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function weekRange(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    const start = new Date(d);
    start.setDate(d.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: `${DATE_FMT.format(start)} a ${DATE_FMT.format(end)}` };
  }

  function getTimestamp(value) {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value.toMillis === "function") return value.toMillis();
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getPercent(item = {}) {
    const values = [
      item.percent, item.tonerPercent, item.toner_percent, item.nivelToner, item.nivel,
      item.toner?.black, item.toner?.preto, item.toner?.percent
    ];
    for (const value of values) {
      const n = Number(String(value ?? "").replace(",", ".").match(/\d{1,3}(?:\.\d+)?/)?.[0]);
      if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
    }
    return null;
  }

  function equipmentLabel(item = {}, fallback = "Equipamento") {
    return item.modelo || item.model || item.nome || item.name || item.hostname || item.ip || item.serial || item.serie || fallback;
  }

  function equipmentKey(collection, item = {}) {
    return `${collection}:${item.id || item.ip || item.serial || item.serie || equipmentLabel(item)}`;
  }

  function toast(title, body) {
    if (typeof window.mostrarMensagem === "function") {
      window.mostrarMensagem(body || title);
      return;
    }
    let host = document.querySelector(".app-toast-stack");
    if (!host) {
      host = document.createElement("div");
      host.className = "app-toast-stack";
      document.body.appendChild(host);
    }
    const node = document.createElement("div");
    node.className = "app-toast";
    node.innerHTML = `<strong>${escapeHtml(title)}</strong><div>${escapeHtml(body || "")}</div>`;
    host.appendChild(node);
    setTimeout(() => node.remove(), 4200);
  }

  function observeCollection(name, limit = 250) {
    if (!db() || state.unsubs[name]) return;
    try {
      state.unsubs[name] = db().collection(name).onSnapshot((snap) => {
        const items = [];
        snap.docs.slice(0, limit).forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
        state.collections[name] = items;
        renderAll();
      }, () => {
        state.collections[name] = [];
        renderAll();
      });
    } catch {
      state.collections[name] = [];
    }
  }

  function bootRealtime() {
    if (!isDashboard() && !isTasksPage()) return;
    const collections = isTasksPage()
      ? ["personalTasks", "dailyChecks", "printers", "impressoras", "manutencoes"]
      : ["personalTasks", "printers", "impressoras", "manutencoes"];
    collections.forEach((name) => observeCollection(name));
  }

  function dashboardRoot() {
    if (!isDashboard()) return null;
    let root = document.getElementById("personalToolsDashboard");
    const main = document.querySelector("main");
    if (!main) return null;

    if (!root) {
      root = document.createElement("section");
      root.id = "personalToolsDashboard";
      root.className = "personal-dashboard dashboard-tasks-only";
      root.innerHTML = `
        <section class="personal-dashboard-overview" id="personalDashboardOverview"></section>
        <section class="personal-alert-strip" id="personalInternalAlerts"></section>
        <section class="personal-panel personal-priority-panel">
          <div class="personal-panel-head">
            <div>
              <h2>Prioridade operacional</h2>
              <p>Tarefas, toners e manutenções que merecem atenção primeiro.</p>
            </div>
            <a href="zonas.html" class="secondary-btn">Ver zonas</a>
          </div>
          <div id="personalOperationalPriority" class="personal-list"></div>
        </section>
        <section class="personal-panel dashboard-task-panel">
          <div class="personal-panel-head">
            <div>
              <h2>Tarefas em aberto</h2>
              <p>Prioridades do dia sincronizadas com a página Tarefas.</p>
            </div>
            <a href="tarefas.html" class="secondary-btn">Ver todas</a>
          </div>
          <div id="personalTaskList" class="personal-list personal-task-list dashboard-task-list"></div>
        </section>
        <section class="personal-dashboard-actions">
          <a href="add-toner.html">Adicionar toner</a>
          <a href="tarefas.html">Criar tarefa</a>
          <a href="stock.html">Ver stock</a>
          <a href="impressoras.html">Impressoras</a>
        </section>
      `;
      const metrics = document.querySelector(".enterprise-metrics");
      if (metrics?.parentNode) metrics.parentNode.insertBefore(root, metrics.nextSibling);
      else main.appendChild(root);
    } else if (!root.dataset.dashboardReady) {
      root.classList.add("dashboard-tasks-only");
      if (!root.querySelector("#personalTaskList")) {
        root.innerHTML = `
          <section class="personal-dashboard-overview" id="personalDashboardOverview"></section>
          <section class="personal-alert-strip" id="personalInternalAlerts"></section>
          <section class="personal-panel personal-priority-panel">
            <div class="personal-panel-head">
              <div>
                <h2>Prioridade operacional</h2>
                <p>Tarefas, toners e manutenções que merecem atenção primeiro.</p>
              </div>
              <a href="zonas.html" class="secondary-btn">Ver zonas</a>
            </div>
            <div id="personalOperationalPriority" class="personal-list"></div>
          </section>
          <section class="personal-panel dashboard-task-panel">
            <div class="personal-panel-head">
              <div>
                <h2>Tarefas em aberto</h2>
                <p>Prioridades do dia sincronizadas com a página Tarefas.</p>
              </div>
              <a href="tarefas.html" class="secondary-btn">Ver todas</a>
            </div>
            <div id="personalTaskList" class="personal-list personal-task-list dashboard-task-list"></div>
          </section>
          <section class="personal-dashboard-actions">
            <a href="add-toner.html">Adicionar toner</a>
            <a href="tarefas.html">Criar tarefa</a>
            <a href="stock.html">Ver stock</a>
            <a href="impressoras.html">Impressoras</a>
          </section>
        `;
      }
    }

    if (!root.querySelector("#personalOperationalPriority")) {
      const taskPanel = root.querySelector(".dashboard-task-panel");
      const priorityPanel = document.createElement("section");
      priorityPanel.className = "personal-panel personal-priority-panel";
      priorityPanel.innerHTML = `
        <div class="personal-panel-head">
          <div>
            <h2>Prioridade operacional</h2>
            <p>Tarefas, toners e manutenções que merecem atenção primeiro.</p>
          </div>
          <a href="zonas.html" class="secondary-btn">Ver zonas</a>
        </div>
        <div id="personalOperationalPriority" class="personal-list"></div>
      `;
      if (taskPanel?.parentNode) taskPanel.parentNode.insertBefore(priorityPanel, taskPanel);
      else root.appendChild(priorityPanel);
    }

    root.dataset.dashboardReady = "1";
    return root;
  }
  function tasksPageRoot() {
    if (!isTasksPage()) return null;
    let root = document.getElementById("personalTasksPage");
    if (root?.dataset.bound) return root;
    if (!root) return null;
    root.dataset.bound = "1";
    root.innerHTML = `
      <section class="personal-task-metrics" id="personalTaskStats"></section>
      <section class="personal-task-layout">
        <section class="personal-panel personal-tasks-board">
          <div class="personal-panel-head">
            <div>
              <h2>Tarefas</h2>
              <p>Organização diária para manutenção, stock e seguimento.</p>
            </div>
            <button type="button" class="primary-btn" data-personal-add-task>Adicionar tarefa</button>
          </div>
          <div class="personal-task-composer">
            <input id="personalTaskQuickTitle" type="text" placeholder="Nova tarefa rápida">
            <input id="personalTaskOwner" type="text" placeholder="Responsável">
            <input id="personalTaskDue" type="date" aria-label="Data limite">
            <select id="personalTaskPriority">
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="baixa">Baixa</option>
            </select>
            <button type="button" class="primary-btn" data-personal-quick-task>Guardar</button>
          </div>
          <div class="personal-task-toolbar">
            <input id="personalTaskSearch" type="search" placeholder="Pesquisar tarefas">
            <div class="personal-task-tabs" role="tablist" aria-label="Filtro de tarefas">
              <button type="button" data-task-filter="open" class="active">Abertas</button>
              <button type="button" data-task-filter="priority">Prioridade</button>
              <button type="button" data-task-filter="today">Hoje</button>
              <button type="button" data-task-filter="overdue">Atrasadas</button>
              <button type="button" data-task-filter="done">Concluidas</button>
              <button type="button" data-task-filter="all">Todas</button>
            </div>
          </div>
          <div id="personalTaskList" class="personal-list personal-task-list"></div>
        </section>
        <section class="personal-task-side">
          <div class="personal-panel">
            <div class="personal-panel-head">
              <h2>Estado</h2>
              <button type="button" class="secondary-btn" data-personal-sync>Sincronizar</button>
            </div>
            <div id="personalOfflineStatus" class="personal-list"></div>
          </div>
          <div class="personal-panel">
            <div class="personal-panel-head">
              <h2>Plano rapido</h2>
            </div>
            <div id="personalTaskPlan" class="personal-list"></div>
          </div>
          <div class="personal-panel personal-priority-panel">
            <div class="personal-panel-head">
              <h2>Prioridades</h2>
            </div>
            <div id="personalPriorityPanel" class="personal-list"></div>
          </div>
          <div class="personal-panel">
            <div class="personal-panel-head">
              <h2>Relatorio semanal</h2>
              <button type="button" class="secondary-btn" data-personal-weekly>Gerar</button>
            </div>
            <div id="personalWeeklySummary" class="personal-list"></div>
          </div>
        </section>
      </section>
    `;
    bindDashboard(root);
    bindTasksPage(root);
    return root;
  }

  function bindDashboard(root) {
    root.querySelector("[data-personal-add-task]")?.addEventListener("click", addTask);
    root.querySelector("[data-personal-weekly]")?.addEventListener("click", generateWeeklyReport);
    root.querySelector("[data-personal-export]")?.addEventListener("click", exportResumo);
    root.querySelector("[data-personal-open-equipment]")?.addEventListener("click", openEquipmentModal);
    root.querySelector("[data-personal-sync]")?.addEventListener("click", syncOfflineQueue);
  }

  function bindTasksPage(root) {
    root.querySelector("[data-personal-quick-task]")?.addEventListener("click", addTaskFromPage);
    root.querySelector("#personalTaskQuickTitle")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") addTaskFromPage();
    });
    root.querySelector("#personalTaskSearch")?.addEventListener("input", (event) => {
      state.taskSearch = event.target.value || "";
      renderTasks();
    });
    root.querySelectorAll("[data-task-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.taskFilter = button.dataset.taskFilter || "open";
        renderTasks();
      });
    });
  }

  function renderMorning() {
    const host = document.getElementById("personalMorning");
    if (!host) return;
    const printers = [...(state.collections.printers || []), ...(state.collections.impressoras || [])];
    const lowToner = printers.filter((item) => {
      const percent = getPercent(item);
      return percent !== null && percent < 25;
    });
    const stockLow = (state.collections.stock || []).filter((item) => Number(item.quantidade ?? item.qtd ?? item.stock ?? 1) <= Number(item.minimo ?? item.min ?? 0));
    const maintenance = (state.collections.manutencoes || []).filter((item) => !/resolvido|fechado|concluido|concluído/i.test(String(item.estado || "")));
    const week = weekRange();
    const weeklyRecords = (state.collections.radioWeeklyRecords || []).filter((item) => {
      const t = getTimestamp(item.createdAt || item.updatedAt || item.weekStart);
      return t >= week.start.getTime() && t <= week.end.getTime();
    });
    const today = todayKey();
    const checked = (state.collections.dailyChecks || []).some((item) => item.id === today || item.date === today);
    host.innerHTML = `
      <article class="personal-card ${lowToner.length ? "is-warn" : "is-ok"}"><span>Toners criticos</span><strong>${lowToner.length}</strong><small>Abaixo de 25%</small></article>
      <article class="personal-card ${stockLow.length ? "is-warn" : "is-ok"}"><span>Stock baixo</span><strong>${stockLow.length}</strong><small>Minimos atingidos</small></article>
      <article class="personal-card ${maintenance.length ? "is-warn" : "is-ok"}"><span>Manutencoes</span><strong>${maintenance.length}</strong><small>Abertas</small></article>
      <article class="personal-card ${weeklyRecords.length ? "is-ok" : "is-warn"}"><span>Radios semanais</span><strong>${weeklyRecords.length}</strong><small>${escapeHtml(week.label)}</small></article>
      <article class="personal-card ${checked ? "is-ok" : "is-warn"}"><span>Check diario</span><strong>${checked ? "OK" : "Pendente"}</strong><button type="button" class="secondary-btn" data-personal-daily-check>Tudo OK</button></article>
    `;
    host.querySelector("[data-personal-daily-check]")?.addEventListener("click", markDailyCheck);
  }

  async function markDailyCheck() {
    const payload = {
      date: todayKey(),
      checkedAt: Date.now(),
      lowToner: document.getElementById("personalMorning")?.querySelector(".personal-card strong")?.textContent || ""
    };
    if (!db() || !navigator.onLine) return queueOperation("dailyChecks", todayKey(), payload, "set");
    await db().collection("dailyChecks").doc(todayKey()).set(payload, { merge: true });
    toast("Check diario", "Estado diario guardado.");
  }

  async function addTask() {
    const title = window.prompt("Nova tarefa");
    if (!title) return;
    const payload = { title: title.trim(), done: false, createdAt: Date.now(), updatedAt: Date.now() };
    if (!db() || !navigator.onLine) return queueOperation("personalTasks", null, payload, "add");
    const ref = await db().collection("personalTasks").add(payload);
    if (await notifyTaskCreated(payload, ref.id)) {
      await ref.set({ notificationClientSent: true, notificationClientSentAt: Date.now() }, { merge: true });
    }
  }

  async function addTaskFromPage() {
    const input = document.getElementById("personalTaskQuickTitle");
    const select = document.getElementById("personalTaskPriority");
    const owner = document.getElementById("personalTaskOwner");
    const due = document.getElementById("personalTaskDue");
    const title = input?.value.trim() || "";
    if (!title) return toast("Tarefas", "Escreve uma tarefa primeiro.");
    const payload = {
      title,
      priority: select?.value || "normal",
      owner: owner?.value.trim() || "",
      dueDate: due?.value || "",
      status: "open",
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (!db() || !navigator.onLine) await queueOperation("personalTasks", null, payload, "add");
    else {
      const ref = await db().collection("personalTasks").add(payload);
      if (await notifyTaskCreated(payload, ref.id)) {
        await ref.set({ notificationClientSent: true, notificationClientSentAt: Date.now() }, { merge: true });
      }
    }
    input.value = "";
    if (owner) owner.value = "";
    if (due) due.value = "";
    input.focus();
  }

  function taskPriorityLabel(priority = "normal") {
    const key = String(priority || "normal").toLowerCase();
    if (key === "urgente" || key === "urgent" || key === "critica" || key === "critico") return "Urgente";
    if (key === "alta" || key === "high") return "Alta";
    if (key === "baixa") return "Baixa";
    return "Normal";
  }

  function taskPriorityClass(priority = "normal") {
    const key = String(priority || "normal").toLowerCase();
    if (key === "urgente" || key === "urgent" || key === "critica" || key === "critico") return "urgent";
    return (key === "alta" || key === "high") ? "high" : (key === "baixa" || key === "low" ? "low" : "normal");
  }

  function taskPriorityWeight(priority = "normal") {
    return { urgent: 0, high: 1, normal: 2, low: 3 }[taskPriorityClass(priority)] ?? 2;
  }

  function operationalPriorityItems(tasks = []) {
    const items = [];
    const today = todayKey();
    tasks.filter((task) => !task.done).forEach((task) => {
      const overdue = task.dueDate && task.dueDate < today;
      const cls = overdue ? "urgent" : taskPriorityClass(task.priority);
      if (cls === "low") return;
      items.push({
        title: task.title || "Tarefa",
        detail: `${task.owner || "Sem responsavel"}${task.dueDate ? ` - ${task.dueDate}` : ""}`,
        priority: cls,
        href: "tarefas.html",
        type: "Tarefa"
      });
    });
    [...(state.collections.printers || []), ...(state.collections.impressoras || [])].forEach((printer) => {
      const pct = getPercent(printer);
      if (pct === null || pct > 25) return;
      items.push({
        title: equipmentLabel(printer, "Impressora"),
        detail: `Toner ${pct}%${printer.localizacao ? ` - ${printer.localizacao}` : ""}`,
        priority: pct <= 0 ? "urgent" : "high",
        href: "impressoras.html",
        type: "Toner"
      });
    });
    (state.collections.manutencoes || []).forEach((item) => {
      if (/resolvido|fechado|concluido|concluído/i.test(String(item.estado || ""))) return;
      items.push({
        title: equipmentLabel(item, "Manutencao"),
        detail: `${item.motivo || item.estado || "Manutencao aberta"}${item.localizacao ? ` - ${item.localizacao}` : ""}`,
        priority: "high",
        href: "manutencao-impressoras.html",
        type: "Manutencao"
      });
    });
    return items.sort((a, b) => ({ urgent: 0, high: 1, normal: 2, low: 3 }[a.priority] - ({ urgent: 0, high: 1, normal: 2, low: 3 }[b.priority]))).slice(0, 6);
  }

  function renderOperationalPriority(tasks = []) {
    const host = document.getElementById("personalOperationalPriority");
    if (!host) return;
    const items = operationalPriorityItems(tasks);
    if (!items.length) {
      host.innerHTML = `<div class="empty-state mini">Sem prioridades criticas neste momento.</div>`;
      return;
    }
    host.innerHTML = items.map((item) => `
      <a class="personal-priority-row ${item.priority}" href="${escapeHtml(item.href)}">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.type)} - ${escapeHtml(item.detail || "")}</small>
        </div>
        <span>${escapeHtml(taskPriorityLabel(item.priority))}</span>
      </a>
    `).join("");
  }

  function renderTaskStats(tasks = []) {
    const host = document.getElementById("personalTaskStats");
    const open = tasks.filter((item) => !item.done).length;
    const done = tasks.filter((item) => item.done).length;
    const high = tasks.filter((item) => !item.done && ["urgent", "high"].includes(taskPriorityClass(item.priority))).length;
    const today = todayKey();
    const todayCount = tasks.filter((item) => {
      const created = getTimestamp(item.createdAt || item.updatedAt);
      return item.dueDate === today || (created && new Date(created).toISOString().slice(0, 10) === today);
    }).length;
    const overdue = tasks.filter((item) => !item.done && item.dueDate && item.dueDate < today).length;
    const html = `
      <article class="personal-card ${open ? "is-warn" : "is-ok"}"><span>Abertas</span><strong>${open}</strong><small>Por concluir</small></article>
      <article class="personal-card ${high ? "is-warn" : "is-ok"}"><span>Alta prioridade</span><strong>${high}</strong><small>Atencao primeiro</small></article>
      <article class="personal-card ${overdue ? "is-warn" : "is-ok"}"><span>Atrasadas</span><strong>${overdue}</strong><small>Com prazo vencido</small></article>
      <article class="personal-card ${todayCount ? "is-ok" : "is-warn"}"><span>Hoje</span><strong>${todayCount}</strong><small>Criadas ou previstas</small></article>
    `;
    if (host) host.innerHTML = html;
    const dash = document.getElementById("personalDashboardOverview");
    if (dash) dash.innerHTML = html;
    renderTaskPlan(tasks, { open, done, high, todayCount, overdue });
    renderInternalAlerts(tasks, { open, done, high, todayCount, overdue });
    renderOperationalPriority(tasks);
  }

  function renderInternalAlerts(tasks = [], stats = {}) {
    const today = todayKey();
    const urgentTasks = tasks.filter((item) => !item.done && taskPriorityClass(item.priority) === "urgent");
    const highTasks = tasks.filter((item) => !item.done && taskPriorityClass(item.priority) === "high");
    const overdueTasks = tasks.filter((item) => !item.done && item.dueDate && item.dueDate < today);
    const todayTasks = tasks.filter((item) => !item.done && item.dueDate === today);
    const alerts = [];
    if (urgentTasks.length) alerts.push({ level: "danger", title: `${urgentTasks.length} urgente(s)`, body: "Tratar agora." });
    if (overdueTasks.length) alerts.push({ level: "danger", title: `${overdueTasks.length} atrasada(s)`, body: "Resolver antes de novas tarefas." });
    if (highTasks.length) alerts.push({ level: "warn", title: `${highTasks.length} alta prioridade`, body: "Atencao primeiro." });
    if (todayTasks.length) alerts.push({ level: "info", title: `${todayTasks.length} para hoje`, body: "Plano diario ativo." });
    if (!navigator.onLine || state.queueCount) alerts.push({ level: "warn", title: navigator.onLine ? "Fila offline" : "Sem rede", body: `${state.queueCount} item(ns) por sincronizar.` });
    if (!alerts.length) alerts.push({ level: "ok", title: "Sem alertas internos", body: "Prioridades controladas." });

    const html = alerts.slice(0, 4).map((alert) => `
      <article class="personal-alert-card is-${alert.level}">
        <strong>${escapeHtml(alert.title)}</strong>
        <small>${escapeHtml(alert.body)}</small>
      </article>
    `).join("");
    const dash = document.getElementById("personalInternalAlerts");
    if (dash) dash.innerHTML = html;
    const side = document.getElementById("personalPriorityPanel");
    if (side) side.innerHTML = html;
  }

  function renderTaskPlan(tasks = [], stats = {}) {
    const host = document.getElementById("personalTaskPlan");
    if (!host) return;
    const next = tasks
      .filter((item) => !item.done)
      .sort((a, b) => taskPriorityWeight(a.priority) - taskPriorityWeight(b.priority) || String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31")) || getTimestamp(b.createdAt) - getTimestamp(a.createdAt))
      .slice(0, 4);
    if (!next.length) {
      host.innerHTML = `<div class="empty-state mini">Sem tarefas abertas. Bom estado de trabalho.</div>`;
      return;
    }
    host.innerHTML = next.map((task) => `
      <div class="personal-plan-row">
        <strong>${escapeHtml(task.title)}</strong>
        <small>${escapeHtml(task.owner || "Sem responsavel")} ${task.dueDate ? "- " + escapeHtml(task.dueDate) : ""}</small>
      </div>
    `).join("");
  }

  function setDashboardTasksEmpty(isEmpty) {
    if (!isDashboard()) return;
    document.getElementById("personalToolsDashboard")?.classList.toggle("is-empty-dashboard-block", !!isEmpty);
  }

  function renderTasks() {
    const host = document.getElementById("personalTaskList");
    if (!host) return;
    const limit = isTasksPage() ? 80 : 8;
    const allTasks = (state.collections.personalTasks || []).sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
    renderTaskStats(allTasks);
    const filter = isTasksPage() ? state.taskFilter : "open";
    const query = normalize(state.taskSearch);
    document.querySelectorAll("[data-task-filter]").forEach((button) => button.classList.toggle("active", button.dataset.taskFilter === filter));
    const tasks = allTasks.filter((item) => {
      if (filter === "open" && item.done) return false;
      if (filter === "done" && !item.done) return false;
      if (filter === "priority" && (item.done || !["urgent", "high"].includes(taskPriorityClass(item.priority)))) return false;
      if (filter === "today" && item.dueDate !== todayKey()) return false;
      if (filter === "overdue" && (item.done || !item.dueDate || item.dueDate >= todayKey())) return false;
      if (!query) return true;
      return normalize(`${item.title || ""} ${item.priority || ""} ${item.owner || ""} ${item.dueDate || ""}`).includes(query);
    }).sort((a, b) => taskPriorityWeight(a.priority) - taskPriorityWeight(b.priority) || getTimestamp(b.createdAt) - getTimestamp(a.createdAt)).slice(0, limit);
    if (!tasks.length) {
      host.innerHTML = `<div class="empty-state mini">Sem tarefas para este filtro.</div>`;
      setDashboardTasksEmpty(true);
      return;
    }
    setDashboardTasksEmpty(false);
    host.innerHTML = tasks.map((task) => `
      <div class="personal-row personal-task-row ${task.done ? "is-done" : ""}">
        <div>
          <strong>${escapeHtml(task.title)}</strong>
          <small>${escapeHtml(task.owner || "Sem responsavel")} - ${task.dueDate ? "Prazo " + escapeHtml(task.dueDate) : TIME_FMT.format(new Date(getTimestamp(task.createdAt) || Date.now()))}</small>
        </div>
        <span class="personal-task-priority ${taskPriorityClass(task.priority)}">${taskPriorityLabel(task.priority)}</span>
        <div class="personal-task-actions">
          ${task.done
            ? `<button type="button" class="secondary-btn" data-task-reopen="${escapeHtml(task.id)}">Reabrir</button>`
            : `<button type="button" class="secondary-btn" data-task-done="${escapeHtml(task.id)}">OK</button>`}
        </div>
      </div>
    `).join("");
    host.querySelectorAll("[data-task-done]").forEach((button) => {
      button.addEventListener("click", async () => {
        await db()?.collection("personalTasks").doc(button.dataset.taskDone).set({ done: true, updatedAt: Date.now() }, { merge: true });
      });
    });
    host.querySelectorAll("[data-task-reopen]").forEach((button) => {
      button.addEventListener("click", async () => {
        await db()?.collection("personalTasks").doc(button.dataset.taskReopen).set({ done: false, updatedAt: Date.now() }, { merge: true });
      });
    });
  }

  function renderPreventive() {
    const host = document.getElementById("personalPreventiveList");
    if (!host) return;
    const now = Date.now();
    const ninety = 90 * 24 * 60 * 60 * 1000;
    const printers = [...(state.collections.printers || []), ...(state.collections.impressoras || [])];
    const items = printers.map((item) => {
      const last = getTimestamp(item.lastMaintenanceAt || item.ultimaManutencao || item.dataResolucao || item.updatedAt || item.createdAt);
      return { item, last, overdue: !last || now - last > ninety };
    }).filter((entry) => entry.overdue).slice(0, 8);
    if (!items.length) {
      host.innerHTML = `<div class="empty-state mini">Sem manutencoes preventivas pendentes.</div>`;
      return;
    }
    host.innerHTML = items.map(({ item, last }) => `
      <div class="personal-row">
        <div><strong>${escapeHtml(equipmentLabel(item, "Impressora"))}</strong><small>${last ? `Ultima: ${TIME_FMT.format(new Date(last))}` : "Sem data de manutencao"}</small></div>
        <button type="button" class="secondary-btn" data-equipment-open="${escapeHtml(equipmentKey("printers", item))}">Ver</button>
      </div>
    `).join("");
    host.querySelectorAll("[data-equipment-open]").forEach((button) => button.addEventListener("click", () => openEquipmentModal(button.dataset.equipmentOpen)));
  }

  function currentEquipmentOptions() {
    const groups = [
      ["printers", "Impressora", [...(state.collections.printers || []), ...(state.collections.impressoras || [])]],
      ["radios", "Radio", state.collections.radios || []],
      ["manutencoes", "Manutencao", state.collections.manutencoes || []]
    ];
    return groups.flatMap(([collection, label, items]) => items.map((item) => ({
      key: equipmentKey(collection, item),
      collection,
      label: `${label}: ${equipmentLabel(item, label)}`,
      item
    })));
  }

  function ensureModal() {
    let modal = document.getElementById("personalEquipmentModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "personalEquipmentModal";
    modal.className = "personal-modal";
    modal.innerHTML = `
      <div class="personal-modal-card">
        <button type="button" class="personal-modal-close" data-personal-close>&times;</button>
        <h2>Notas, fotos e historico</h2>
        <label class="personal-field"><span>Equipamento</span><select id="personalEquipmentSelect"></select></label>
        <label class="personal-field"><span>Nota</span><textarea id="personalEquipmentNote" rows="4" placeholder="Escreve uma nota..."></textarea></label>
        <div class="personal-actions">
          <input id="personalEquipmentPhoto" type="file" accept="image/*" capture="environment">
          <button type="button" class="primary-btn" data-personal-save-note>Guardar nota/foto</button>
        </div>
        <div id="personalEquipmentHistory" class="personal-list"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("[data-personal-close]")?.addEventListener("click", () => modal.classList.remove("is-open"));
    modal.querySelector("[data-personal-save-note]")?.addEventListener("click", saveEquipmentNote);
    modal.querySelector("#personalEquipmentSelect")?.addEventListener("change", renderEquipmentHistory);
    return modal;
  }

  function openEquipmentModal(forcedKey = "") {
    const modal = ensureModal();
    const select = modal.querySelector("#personalEquipmentSelect");
    const options = currentEquipmentOptions();
    select.innerHTML = options.length ? options.map((opt) => `<option value="${escapeHtml(opt.key)}">${escapeHtml(opt.label)}</option>`).join("") : `<option value="manual:geral">Geral</option>`;
    if (forcedKey && [...select.options].some((opt) => opt.value === forcedKey)) select.value = forcedKey;
    modal.classList.add("is-open");
    renderEquipmentHistory();
  }

  async function compressImage(file) {
    if (!file) return null;
    const bitmap = await loadImageBitmap(file);
    if (!bitmap) return null;
    const max = 900;
    const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.76);
  }

  function loadImageBitmap(file) {
    if (typeof createImageBitmap === "function") {
      return createImageBitmap(file).catch(() => loadImageElement(file));
    }
    return loadImageElement(file);
  }

  function loadImageElement(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = reader.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  async function saveEquipmentNote() {
    const modal = ensureModal();
    const equipment = modal.querySelector("#personalEquipmentSelect")?.value || "manual:geral";
    const note = modal.querySelector("#personalEquipmentNote")?.value.trim() || "";
    const file = modal.querySelector("#personalEquipmentPhoto")?.files?.[0] || null;
    if (!note && !file) return toast("Notas", "Escreve uma nota ou escolhe uma foto.");
    const photoData = file ? await compressImage(file) : null;
    const payload = { equipmentKey: equipment, note, photoData, createdAt: Date.now(), page: location.pathname };
    if (!db() || !navigator.onLine) await queueOperation("equipmentNotes", null, payload, "add");
    else await db().collection("equipmentNotes").add(payload);
    modal.querySelector("#personalEquipmentNote").value = "";
    modal.querySelector("#personalEquipmentPhoto").value = "";
    toast("Notas", "Registo guardado.");
    renderEquipmentHistory();
  }

  function renderEquipmentHistory() {
    const modal = ensureModal();
    const key = modal.querySelector("#personalEquipmentSelect")?.value || "";
    const notes = (state.collections.equipmentNotes || []).filter((item) => item.equipmentKey === key);
    const audit = (state.collections.auditLogs || []).filter((item) => String(item.path || item.documentId || "").includes(key.split(":")[1] || "__none__"));
    const items = [...notes.map((item) => ({ type: "Nota", ...item })), ...audit.map((item) => ({ type: "Evento", note: item.action || item.event, ...item }))]
      .sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt))
      .slice(0, 12);
    const host = modal.querySelector("#personalEquipmentHistory");
    if (!items.length) {
      host.innerHTML = `<div class="empty-state mini">Sem historico para este equipamento.</div>`;
      return;
    }
    host.innerHTML = items.map((item) => `
      <div class="personal-history-item">
        <strong>${escapeHtml(item.type)} - ${TIME_FMT.format(new Date(getTimestamp(item.createdAt) || Date.now()))}</strong>
        <p>${escapeHtml(item.note || item.title || item.action || "")}</p>
        ${item.photoData ? `<img src="${item.photoData}" alt="Foto do equipamento">` : ""}
      </div>
    `).join("");
  }

  function generateWeeklyReport() {
    const week = weekRange();
    const host = document.getElementById("personalWeeklySummary");
    const stock = state.collections.stock || [];
    const hist = (state.collections.historico || []).filter((item) => {
      const t = getTimestamp(item.data || item.createdAt || item.updatedAt);
      return t >= week.start.getTime() && t <= week.end.getTime();
    });
    const radios = (state.collections.radioWeeklyRecords || []).filter((item) => {
      const t = getTimestamp(item.createdAt || item.updatedAt || item.weekStart);
      return t >= week.start.getTime() && t <= week.end.getTime();
    });
    const maintenance = (state.collections.manutencoes || []).filter((item) => {
      const t = getTimestamp(item.createdAt || item.updatedAt || item.dataPedido);
      return t >= week.start.getTime() && t <= week.end.getTime();
    });
    const html = `
      <div class="personal-row"><div><strong>Semana</strong><small>${escapeHtml(week.label)}</small></div></div>
      <div class="personal-row"><div><strong>Toners usados</strong><small>${hist.length}</small></div></div>
      <div class="personal-row"><div><strong>Stock atual</strong><small>${stock.length} referencias</small></div></div>
      <div class="personal-row"><div><strong>Registos de radios</strong><small>${radios.length}</small></div></div>
      <div class="personal-row"><div><strong>Manutencoes</strong><small>${maintenance.length}</small></div></div>
    `;
    if (host) host.innerHTML = html;
    exportFile(`relatorio-semanal-${todayKey()}.html`, `<!doctype html><meta charset="utf-8"><title>Relatorio semanal App Braga</title><body><h1>Relatorio semanal</h1>${html}</body>`, "text/html");
  }

  function exportResumo() {
    const payload = {
      exportedAt: new Date().toISOString(),
      stock: state.collections.stock || [],
      manutencoes: state.collections.manutencoes || [],
      radios: state.collections.radios || [],
      radioWeeklyRecords: state.collections.radioWeeklyRecords || [],
      tasks: state.collections.personalTasks || [],
      notes: state.collections.equipmentNotes || []
    };
    exportFile(`app-braga-resumo-${todayKey()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function exportFile(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function openQueueDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE, { keyPath: "id", autoIncrement: true });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function queueOperation(collection, docId, payload, mode) {
    const qdb = await openQueueDb();
    await new Promise((resolve, reject) => {
      const tx = qdb.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).add({ collection, docId, payload, mode, createdAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    await updateQueueCount();
    toast("Offline", "Guardado na fila. Vai sincronizar quando houver rede.");
  }

  async function getQueueItems() {
    const qdb = await openQueueDb();
    return new Promise((resolve, reject) => {
      const tx = qdb.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteQueueItem(id) {
    const qdb = await openQueueDb();
    return new Promise((resolve, reject) => {
      const tx = qdb.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function updateQueueCount() {
    const items = await getQueueItems().catch(() => []);
    state.queueCount = items.length;
    renderOffline();
  }

  async function syncOfflineQueue() {
    if (!db() || !navigator.onLine) return toast("Offline", "Ainda sem Firestore/rede.");
    const items = await getQueueItems().catch(() => []);
    for (const item of items) {
      try {
        const ref = item.docId ? db().collection(item.collection).doc(item.docId) : db().collection(item.collection).doc();
        if (item.mode === "set") await ref.set(item.payload, { merge: true });
        else await ref.set(item.payload, { merge: true });
        await deleteQueueItem(item.id);
      } catch (error) {
        console.error("Erro ao sincronizar fila offline", error);
      }
    }
    await updateQueueCount();
    toast("Offline", "Fila sincronizada.");
  }

  function renderOffline() {
    const host = document.getElementById("personalOfflineStatus");
    if (!host) return;
    host.innerHTML = `
      <div class="personal-row"><div><strong>${navigator.onLine ? "Online" : "Offline"}</strong><small>${state.queueCount} item(ns) em fila</small></div></div>
    `;
    renderInternalAlerts(state.collections.personalTasks || []);
  }

  function renderAll() {
    dashboardRoot();
    tasksPageRoot();
    renderMorning();
    renderTasks();
    renderPreventive();
    renderOffline();
    if (document.getElementById("personalEquipmentModal")?.classList.contains("is-open")) renderEquipmentHistory();
  }

  function init() {
    dashboardRoot();
    tasksPageRoot();
    bootRealtime();
    updateQueueCount();
    renderAll();
    setTimeout(bootRealtime, 1500);
    setTimeout(bootRealtime, 3500);
  }

  ready(() => {
    setTimeout(init, 900);
    window.addEventListener("online", syncOfflineQueue);
    window.addEventListener("offline", renderOffline);
    window.AppBragaPersonalTools = {
      openEquipmentModal,
      generateWeeklyReport,
      exportResumo,
      syncOfflineQueue
    };
  });
})();
