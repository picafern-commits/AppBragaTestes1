import {
  collection,
  onSnapshot,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.pistolasData = [];

document.addEventListener("app-ready", ()=>{

  const pistolasRef =
    collection(window.db, "pistolas");

  onSnapshot(pistolasRef, (snapshot)=>{

    window.pistolasData =
      snapshot.docs.map(d => ({
        idDoc: d.id,
        ...d.data()
      }));

    if(window.renderPistolas){
      window.renderPistolas(
        window.pistolasData
      );
    }

  });

  console.log("Pistolas connected");

});

window.guardarEdicaoPistola =
async function(){



  const payload = {};

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
  ].forEach(f=>{

    payload[f] =
      el("editP_" + f)?.value || "";

  });

  await updateDoc(
    doc(
      window.db,
      "pistolas",
      window.pistolaEditId
    ),
    payload
  );

  hide("modalEditarPistola");

};


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



window.pistolaEditId = null;
