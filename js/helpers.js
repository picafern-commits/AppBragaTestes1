/* =========================
   CORE HELPERS
========================= */

window.el = function(id){
  return document.getElementById(id );
};

window.q1 = function(sel){
  return document.querySelector(sel );
};

window.qAll = function(sel){
  return document.querySelectorAll(sel );
};

window.setText = function(id, value){

  const node = el(id );

  if(node){
    node.textContent = value;
  }

};

window.show = function(id){

  const node = el(id );

  if(node){
    node.style.display = "flex";
  }

};

window.hide = function(id){

  const node = el(id );

  if(node){
    node.style.display = "none";
  }

};

window.normalizarTexto = function(v){

  return String(v || "")
    .toLowerCase()
    .trim( );

};


// ===== APP_BRAGA_THEME_SYSTEM =====

window.loadTheme = function(){

  try{

    const savedTheme =
      localStorage.getItem("app-theme") || "dark";

    document.documentElement.classList.remove("dark" );
    document.body.classList.remove("dark" );

    if(savedTheme === "dark"){
      document.documentElement.classList.add("dark" );
      document.body.classList.add("dark" );
    }

  }catch(e){
    console.log(e );
  }

};

window.saveTheme = function(theme){

  try{
    localStorage.setItem("app-theme", theme );
  }catch(e){
    console.log(e );
  }

};

window.toggleTheme = function(){

  const isDark =
    document.body.classList.contains("dark" );

  const newTheme =
    isDark ? "light" : "dark";

  window.saveTheme(newTheme );
  window.loadTheme( );

};

document.addEventListener(
  "DOMContentLoaded",
  window.loadTheme
 );

window.addEventListener(
  "pageshow",
  window.loadTheme
 );

