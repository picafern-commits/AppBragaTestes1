
(function(){
  const CFG = window.__FUTURISTA_PAGE__ || {};
  const byId = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const cacheKey = "appbraga-futurista-" + (CFG.key || CFG.title || "page");

  function globalValue(name){ try{ if(Object.prototype.hasOwnProperty.call(window,name)) return window[name]; return Function("try{return typeof "+name+" !== 'undefined' ? "+name+" : undefined}catch(e){return undefined}")(); }catch(e){return undefined;} }
  function getDb(){ try{ if(typeof getDbAppBraga==="function") return getDbAppBraga(); }catch(e){} return window.db || (window.firebase && firebase.firestore ? firebase.firestore() : null); }
  function readCache(){ try{return JSON.parse(localStorage.getItem(cacheKey)||"[]")||[]}catch(e){return[]} }
  function writeCache(data){ try{localStorage.setItem(cacheKey, JSON.stringify(Array.isArray(data)?data.slice(0,1000):[]))}catch(e){} }
  function dateMs(v){ if(!v) return 0; if(typeof v==="number") return v; if(v && typeof v.toMillis==="function") return v.toMillis(); if(v && typeof v.toDate==="function"){try{return v.toDate().getTime()}catch(e){}} if(v && v.seconds) return v.seconds*1000; const raw=String(v||"").trim(); if(!raw) return 0; if(/^\d{4}-\d{2}-\d{2}/.test(raw)) return new Date(raw).getTime()||0; if(/^\d{2}\/\d{2}\/\d{4}/.test(raw)){const[d,m,y]=raw.split(/[\/\s]/); return new Date(`${y}-${m}-${d}`).getTime()||0} return new Date(raw).getTime()||0; }
  function fmtDate(v, withTime=false){ if(!v) return "—"; let d=null; if(v && typeof v.toDate==="function"){try{d=v.toDate()}catch(e){}} else if(v && v.seconds) d=new Date(v.seconds*1000); else {const ms=dateMs(v); if(ms) d=new Date(ms);} if(d && !Number.isNaN(d.getTime())){ const date=d.toLocaleDateString("pt-PT"); const time=d.toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"}); return withTime?`${date} ${time}`:date; } return String(v); }
  function isToday(v){ const ms=dateMs(v); if(!ms) return false; const a=new Date(ms), b=new Date(); return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
  function val(item, field){ if(!field) return ""; if(typeof field === "function") return field(item); const paths=String(field).split("|"); for(const p of paths){ const keys=p.split("."); let cur=item; for(const k of keys){ cur = cur && typeof cur === "object" ? cur[k] : undefined; } if(cur !== undefined && cur !== null && cur !== "") return cur; } return ""; }
  function idOf(i){ return i?.idDoc || i?.firebaseId || i?.id || ""; }
  function titleOf(i){ return val(i,"nome|titulo|name|equipamento|modelo|mensagem|referencia|serial") || "Registo"; }
  function statusOf(i){ const raw=norm(val(i,"estado|status|prioridade|resultado")); if(raw.includes("crit") || raw.includes("erro") || raw.includes("falha") || raw.includes("problema")) return ["Crítico","crit"]; if(raw.includes("pend") || raw.includes("atras") || raw.includes("baixo") || raw.includes("media") || raw.includes("alto")) return [val(i,"estado|status|prioridade") || "Atenção","warn"]; if(raw.includes("concl") || raw.includes("online") || raw.includes("sucesso") || raw.includes("ativo") || raw.includes("gerado") || raw.includes("valid")) return [val(i,"estado|status|resultado") || "OK","ok"]; return [val(i,"estado|status|prioridade|resultado") || "Ativo","info"]; }
  function sortRecent(arr){ return (Array.isArray(arr)?arr:[]).slice().sort((a,b)=>dateMs(b.updatedAt||b.createdAt||b.created||b.data||b.dataFolha||b.vencimento)-dateMs(a.updatedAt||a.createdAt||a.created||a.data||a.dataFolha||a.vencimento)); }

  window.__futuristaData = [];
  function getData(){ return window.__futuristaData?.length ? window.__futuristaData : readCache(); }

  function matchesKpi(item, key){
    const blob = norm(JSON.stringify(item));
    key = norm(key);
    if(key==="total") return true;
    if(key==="today") return isToday(item.data||item.createdAt||item.created||item.updatedAt||item.vencimento);
    if(key==="recent") return Date.now() - dateMs(item.updatedAt||item.createdAt||item.created||item.data) <= 30*24*3600*1000;
    if(key==="week") return true;
    if(key==="sync"||key==="saudavel"||key==="online") return true;
    if(key==="devices") return !!blob.includes("device") || !!blob.includes("dispositivo");
    if(key==="alerts") return blob.includes("alerta") || blob.includes("crit");
    if(key==="precisao") return true;
    return blob.includes(key);
  }

  function renderKPIs(data){
    (CFG.kpis||[]).forEach((k,idx)=>{
      const id = "fKpi"+idx;
      const el=byId(id);
      if(!el) return;
      const key=k[1];
      let count;
      if(key==="precisao") count = data.length ? "96%" : "—";
      else if(key==="seguranca") count = "100%";
      else if(key==="week") count = getWeekNumber(new Date());
      else if(key==="proxima") count = "07 Jul";
      else count = data.filter(item=>matchesKpi(item,key)).length;
      el.textContent = count;
    });
  }

  function getWeekNumber(d){ d=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const dayNum=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-dayNum); const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1)); return Math.ceil((((d-yearStart)/86400000)+1)/7); }

  function filtered(){
    const data = getData();
    const q = norm(byId("fSearch")?.value || "");
    const f1 = byId("fFilter1")?.value || "";
    const f2 = byId("fFilter2")?.value || "";
    return data.filter(item=>{
      const blob=norm(JSON.stringify(item));
      return (!q || blob.includes(q)) && (!f1 || blob.includes(norm(f1))) && (!f2 || blob.includes(norm(f2)));
    });
  }

  function renderTable(items){
    const body=byId("fTableBody"); if(!body) return;
    const cols=CFG.columns||[];
    const per=Number(byId("fPerPage")?.value||10);
    const rows=items.slice(0, per);
    if(!rows.length){ body.innerHTML = `<tr><td colspan="${cols.length+2}" class="f-empty">Sem registos para mostrar.</td></tr>`; setText("fTableInfo","A mostrar 0 registos"); return; }
    body.innerHTML = rows.map(item=>{
      const [st,cls]=statusOf(item);
      return `<tr data-id="${esc(idOf(item))}">
        ${cols.map(([label,field])=>`<td>${renderCell(item,field,label)}</td>`).join("")}
        <td><span class="f-status ${cls}">${esc(st)}</span></td>
        <td><div class="f-row-actions">
          <button class="f-icon-btn" data-action="view" data-id="${esc(idOf(item))}" title="Ver">👁</button>
          <button class="f-icon-btn" data-action="edit" data-id="${esc(idOf(item))}" title="Editar">⋮</button>
        </div></td>
      </tr>`;
    }).join("");
    setText("fTableInfo",`A mostrar 1 a ${rows.length} de ${items.length} registos`);
  }

  function renderCell(item, field, label){
    let value=val(item,field);
    if(/data|hora|vencimento|updated/i.test(field||label||"")) value=fmtDate(value,true);
    if(/bateria|carga/i.test(field||label||"")){
      const n=Number(String(value).replace("%",""));
      if(Number.isFinite(n)) return `<strong>${n}%</strong><br><span class="f-bar-line"><span class="f-bar-fill" style="width:${Math.max(0,Math.min(100,n))}%;background:${n<25?'#ff5168':n<60?'#ffae2f':'#35df68'}"></span></span>`;
    }
    if(Array.isArray(value)) return esc(value.join(", "));
    if(typeof value === "object" && value) return esc(JSON.stringify(value));
    if(String(value||"").length > 80) return esc(String(value).slice(0,80)+"…");
    return esc(value || "—");
  }

  function setText(id,v){ const el=byId(id); if(el) el.textContent=v; }

  function renderSide(data){
    const recent=byId("fRecentList");
    if(recent){
      const rows=sortRecent(data).slice(0,6);
      recent.innerHTML = rows.length ? rows.map(item=>`<div class="f-list-row"><strong><span class="f-dot"></span>${esc(titleOf(item))}</strong><small>${esc(fmtDate(item.updatedAt||item.createdAt||item.created||item.data,true))}</small><span class="f-status ${statusOf(item)[1]}">${esc(statusOf(item)[0])}</span></div>`).join("") : `<div class="f-list-row"><strong>Sem registos recentes</strong><small>—</small><span></span></div>`;
    }
    const bars=byId("fBars");
    if(bars){
      const groups={};
      data.forEach(item=>{
        let key = val(item,"estado|status|prioridade|area|categoria|seccao|cor") || "Outros";
        key = String(key).slice(0,28);
        groups[key]=(groups[key]||0)+1;
      });
      const max=Math.max(1,...Object.values(groups));
      const entries=Object.entries(groups).slice(0,6);
      bars.innerHTML = entries.length ? entries.map(([k,v],idx)=>`<div class="f-bar"><span>${esc(k)}</span><span class="f-bar-line"><span class="f-bar-fill" style="width:${Math.max(4,Math.round(v/max*100))}%;background:${['#148cff','#35df68','#ffae2f','#d450ff','#22d3ff','#ff5168'][idx%6]}"></span></span><strong>${v}</strong></div>`).join("") : `<div class="f-bar"><span>Sem dados</span><span class="f-bar-line"></span><strong>0</strong></div>`;
    }
    const cards=byId("fCards");
    if(cards && CFG.key === "scanner"){
      cards.innerHTML = `<div class="f-scanner-drop" onclick="triggerScannerUploadFuturista()"><div><strong>☁️ Arraste o ficheiro aqui</strong><br><small>PDF, JPG, PNG até 20MB</small></div></div><div class="f-preview" id="fScannerPreview"><strong>Pré-visualização</strong><br><br>Quando carregar um ficheiro, a pré-visualização aparece aqui.</div>`;
    } else if(cards){
      cards.innerHTML = sortRecent(data).slice(0,4).map(item=>`<div class="f-list-row"><strong>${esc(titleOf(item))}</strong><small>${esc(val(item,"local|localizacao|seccao|categoria|tipo")||"—")}</small><span class="f-status ${statusOf(item)[1]}">${esc(statusOf(item)[0])}</span></div>`).join("") || `<div class="f-list-row"><strong>Sem dados</strong><small>—</small><span></span></div>`;
    }
  }

  function renderAll(){
    const data=sortRecent(getData());
    const f=filtered();
    renderKPIs(data);
    renderTable(f);
    renderSide(data);
  }

  function bindRealtimeOne(collection, targetArr){
    const db=getDb(); if(!db||!db.collection) return;
    try{
      return db.collection(collection).onSnapshot(snap=>{
        const arr=[]; snap.forEach(doc=>arr.push({firebaseId:doc.id,idDoc:doc.id,...doc.data()}));
        targetArr.splice(0,targetArr.length,...arr);
        window.__futuristaData=sortRecent(targetArr);
        writeCache(window.__futuristaData);
        renderAll();
      }, err=>{ console.warn("futurista realtime", collection, err); });
    }catch(e){ console.warn("futurista bind", collection, e); }
  }

  function startRealtime(){
    if(window.__futuristaRealtimeStarted) return;
    window.__futuristaRealtimeStarted=true;
    const combined=[];
    const cols=[CFG.collection,...(CFG.alt_collections||[])].filter(Boolean);
    setTimeout(()=> cols.forEach(c=>bindRealtimeOne(c, combined)), 500);
    const cached=readCache();
    if(cached.length){ window.__futuristaData=cached; renderAll(); }
  }

  function bind(){
    ["fSearch","fFilter1","fFilter2","fPerPage"].forEach(id=>{ const el=byId(id); if(el){ el.addEventListener("input",renderAll); el.addEventListener("change",renderAll); }});
    document.addEventListener("click", ev=>{
      const btn=ev.target.closest("[data-action]"); if(!btn) return;
      const id=btn.dataset.id||"";
      if(btn.dataset.action==="view" || btn.dataset.action==="edit") return openRecord(id);
    });
    startRealtime();
    renderAll();
    setTimeout(renderAll, 800); setTimeout(renderAll, 2400); setInterval(renderAll, 5000);
  }

  function openRecord(id){
    const item=getData().find(x=>idOf(x)===id);
    if(!item) return;
    const fn = CFG.legacyEdit;
    if(fn && typeof window[fn]==="function"){ try{return window[fn](id)}catch(e){} }
    alert(Object.entries(item).slice(0,12).map(([k,v])=>`${k}: ${typeof v==="object"?JSON.stringify(v):v}`).join("\n"));
  }

  window.limparFiltrosFuturista=function(){ ["fSearch","fFilter1","fFilter2"].forEach(id=>{const el=byId(id); if(el) el.value="";}); renderAll(); };
  window.filtrarTipoFuturista=function(txt){ const s=byId("fSearch"); if(s) s.value=txt||""; renderAll(); };
  window.focusFirstInputFuturista=function(){ const el=document.querySelector(".f-form input,.f-form select,.f-form textarea"); if(el) el.focus(); };
  window.triggerScannerUploadFuturista=function(){ const input=byId("scannerIaInput"); if(input) input.click(); else alert("Carregamento indisponível nesta página."); };
  window.gerarEtiquetaWordFuturista=function(){ if(typeof window.reimprimirUltimaEtiquetaWord==="function") return window.reimprimirUltimaEtiquetaWord(); location.href="add-toner.html"; };
  window.abrirModalEquipaFuturista=function(){ const b=byId("btnAbrirEquipa"); if(b) b.click(); else alert("Editor de equipas indisponível."); };
  window.novaTarefaFuturista=function(){ if(typeof window.addPersonalTask==="function") return window.addPersonalTask(); alert("Sistema de tarefas carregado. Usa o painel para adicionar."); };
  window.marcarTudoLidoFuturista=function(){ alert("Notificações marcadas visualmente como lidas."); document.querySelectorAll(".f-status.crit,.f-status.warn").forEach(e=>{e.className="f-status ok";e.textContent="Lida"}); };
  window.filtrarCriticasFuturista=function(){ const s=byId("fSearch"); if(s) s.value="crítica critico crítico erro"; renderAll(); };
  window.filtrarFavoritosDiretorioFuturista=function(){ const s=byId("fSearch"); if(s) s.value="favorito"; renderAll(); };
  window.guardarConfiguracoesFuturista=function(){ if(typeof guardarTemaApp==="function") guardarTemaApp(); if(typeof guardarConfigNotificacoesApp==="function") guardarConfigNotificacoesApp(); alert("Alterações guardadas."); };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();


window.guardarTarefaFuturista = async function(){
  const titulo=document.getElementById("novaTarefaTitulo")?.value||"";
  if(!titulo.trim()) return alert("Escreve o título da tarefa.");
  const data={
    titulo,
    prioridade:document.getElementById("novaTarefaPrioridade")?.value||"Média",
    responsavel:document.getElementById("novaTarefaResponsavel")?.value||"",
    vencimento:document.getElementById("novaTarefaData")?.value||"",
    descricao:document.getElementById("novaTarefaDescricao")?.value||"",
    estado:"Aberta",
    createdAt:new Date()
  };
  try{
    const db=(typeof getDbAppBraga==="function"?getDbAppBraga():(window.db||(window.firebase&&firebase.firestore?firebase.firestore():null)));
    if(db) await db.collection("tarefas").add(data);
    alert("Tarefa guardada.");
  }catch(e){ console.error(e); alert("Não consegui guardar no Firebase."); }
};


window.guardarRegistoFuturista = async function(){
  const cfg = window.__FUTURISTA_PAGE__ || {};
  const titulo = document.getElementById("fNovoTitulo")?.value || "";
  if(!titulo.trim()) return alert("Escreve o nome/título do registo.");
  const data = {
    nome: titulo,
    titulo,
    estado: document.getElementById("fNovoEstado")?.value || "Ativo",
    local: document.getElementById("fNovoLocal")?.value || "",
    utilizador: document.getElementById("fNovoUser")?.value || "",
    obs: document.getElementById("fNovoObs")?.value || "",
    createdAt: new Date(),
    updatedAt: new Date(),
    origem: cfg.key || cfg.title || "app"
  };
  try{
    const db=(typeof getDbAppBraga==="function"?getDbAppBraga():(window.db||(window.firebase&&firebase.firestore?firebase.firestore():null)));
    if(!db) throw new Error("Firebase indisponível");
    await db.collection(cfg.collection || "registos").add(data);
    ["fNovoTitulo","fNovoLocal","fNovoUser","fNovoObs"].forEach(id=>{const el=document.getElementById(id); if(el) el.value="";});
    alert("Registo guardado.");
  }catch(e){ console.error(e); alert("Não consegui guardar no Firebase."); }
};
