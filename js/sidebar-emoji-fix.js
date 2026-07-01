/* APP BRAGA v1.58.0 - SIDEBAR EMOJI FINAL GUARD */
(function(){
  const ICONS={"index.html":"🏠","add-toner.html":"➕","stock.html":"📦","historico.html":"🕒","tarefas.html":"✅","scanner-ia.html":"📄","etiquetas-word.html":"🏷️","impressoras.html":"🖨️","manutencao-impressoras.html":"🛠️","computadores.html":"💻","pistolas.html":"📱","radios.html":"📡","portas.html":"🌐","diretorio.html":"📇","informacoes.html":"ℹ️","users.html":"👥","diagnostico.html":"🩺","config.html":"⚙️","notificacoes.html":"🔔","equipas-semanais.html":"👥","equipamento.html":"🧾","zonas.html":"🗺️"};
  const GROUPS={"opera-o":"🧰","operacao":"🧰","operação":"🧰","equipamentos":"🖨️","infraestrutura":"🌐","administra-o":"⚙️","administracao":"⚙️","administração":"⚙️"};
  function file(h){return String(h||"").split("?")[0].split("#")[0].split("/").pop().toLowerCase()||"index.html";}
  function fix(){
    document.querySelectorAll("aside.sidebar a[href],.sidebar a[href],.app-mobile-sidebar-new a[href]").forEach(a=>{const i=ICONS[file(a.getAttribute("href"))];if(i)a.setAttribute("data-icon",i);});
    document.querySelectorAll(".sidebar-group[data-sidebar-group]").forEach(g=>{const n=g.querySelector(".sidebar-group-icon");const i=GROUPS[String(g.getAttribute("data-sidebar-group")||"").toLowerCase()];if(n&&i)n.textContent=i;});
    document.querySelectorAll(".sidebar-group-toggle").forEach(b=>{const n=b.querySelector(".sidebar-group-icon");const t=(b.textContent||"").toLowerCase();if(!n)return;if(t.includes("opera"))n.textContent="🧰";else if(t.includes("equip"))n.textContent="🖨️";else if(t.includes("infra"))n.textContent="🌐";else if(t.includes("admin"))n.textContent="⚙️";});
    document.querySelectorAll(".sidebar-section-title>span").forEach(n=>{if(/favoritos/i.test(n.parentElement?.textContent||""))n.textContent="⭐";});
  }
  window.AppBragaApplySidebarEmojis=fix;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fix);else fix();
  [20,80,180,400,900,1800,3500].forEach(t=>setTimeout(fix,t));
  if(window.MutationObserver&&document.body){let tm=null;new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(fix,20);}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["data-icon","class"]});}
})();
