const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onUpdateAvailable: (cb) => ipcRenderer.on("update_available", cb),
  onProgress: (cb) => ipcRenderer.on("download_progress", (_e, p) => cb(p)),
  onDownloaded: (cb) => ipcRenderer.on("update_downloaded", cb),
  installUpdate: () => ipcRenderer.send("install_update"),
  getPrinterHTML: (ip) => ipcRenderer.invoke("printer:get-html", ip),
  getTonerSNMP: (ip) => ipcRenderer.invoke("printer:get-toner-snmp", ip)
});


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

