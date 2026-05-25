
window.filtrarPistolasComFiltros = function(){

  const texto =
    normalizarTexto(
      el("searchPistolas")?.value
    );

  const filtradas =
    (window.pistolasData || []).filter(p => {

      return [
        p.nome,
        p.num,
        p.operador,
        p.armazem
      ].some(v =>
        normalizarTexto(v)
          .includes(texto)
      );

    });

  renderPistolas(filtradas);

}


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

