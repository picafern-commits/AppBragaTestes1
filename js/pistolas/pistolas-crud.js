
window.editarPistola = function(idDoc){

  const p =
    (window.pistolasData || []).find(
      x => x.idDoc === idDoc
    );

  if(!p) return;

  [
    "num",
    "nome",
    "password",
    "cn",
    "sn",
    "mac",
    "operador",
    "armazem",
    "prontas"
  ].forEach(f => {

    const node = el("editP_" + f);

    if(node){
      node.value = p[f] || "";
    }

  });

  window.pistolaEditId = idDoc;

  show("modalEditarPistola");

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

