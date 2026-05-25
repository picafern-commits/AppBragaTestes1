(() => {
  const pages = [
    { type: "section", label: "Operação" },
    { href: "index.html", label: "Dashboard" },
    { href: "add-toner.html", label: "Adicionar Toner" },
    { href: "stock.html", label: "Stock" },
    { href: "historico.html", label: "Histórico" },
    { href: "etiquetas-word.html", label: "Etiquetas Word" },

    { type: "section", label: "Infraestrutura" },
    { href: "impressoras.html", label: "Impressoras" },
    { href: "manutencao-impressoras.html", label: "Manutenção Impressoras" },
    { href: "portas.html", label: "Portas Rede" },

    { type: "section", label: "Equipamentos" },
    { href: "computadores.html", label: "Computadores" },
    { href: "pistolas.html", label: "Pistolas CK65" },

    { type: "section", label: "Administração" },
    { href: "users.html", label: "Users" },
    { href: "config.html", label: "Configurações" },
  ];

  function currentFile() {
    const file = location.pathname.split("/").pop();
    return file || "index.html";
  }

  function renderSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    const active = currentFile();

    sidebar.innerHTML = `
      <div class="brand premium-brand">
        <div class="brand-badge">BR</div>
        <div>
          <h2>App Braga</h2>
          
        </div>
      </div>

      ${pages.map(item => {
        if (item.type === "section") {
          return `<div class="nav-group-label">${item.label}</div>`;
        }

        const isActive = active === item.href;
        return `<a href="${item.href}" class="${isActive ? "active" : ""}">${item.label}</a>`;
      }).join("")}
    `;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderSidebar);
  } else {
    renderSidebar();
  }
})();


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

