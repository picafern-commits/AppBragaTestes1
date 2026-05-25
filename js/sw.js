self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));await self.clients.claim();})()));self.addEventListener('fetch',()=>{});

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

