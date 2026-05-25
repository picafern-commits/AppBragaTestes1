const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const http = require("http");
const https = require("https");
const snmp = require("net-snmp");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.ico"),
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile("index.html");

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function requestUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith("https://") ? https : http;
    const req = client.get(
      url,
      { timeout: 6000, headers: { "User-Agent": "AppBragaDesktop/1.0" } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk.toString("utf8"); });
        res.on("end", () => resolve({ ok: true, statusCode: res.statusCode || 0, body: data, url }));
      }
    );
    req.on("error", (error) => resolve({ ok: false, statusCode: 0, body: "", error: error.message, url }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, statusCode: 0, body: "", error: "Timeout", url });
    });
  });
}

ipcMain.handle("printer:get-html", async (_event, ip) => {
  if (!ip) return { ok: false, body: "", error: "IP inválido" };
  const cleanIp = String(ip).trim();
  const paths = ["/", "/startwlm/Start_Wlm.htm", "/status", "/home", "/monitor", "/mainte/supplies.cgi"];
  for (const p of paths) {
    const res = await requestUrl(`http://${cleanIp}${p}`);
    if (res.ok && res.body) return res;
  }
  return { ok: false, body: "", error: "Sem resposta HTML" };
});

function snmpGet(session, oids) {
  return new Promise((resolve, reject) => {
    session.get(oids, (error, varbinds) => {
      if (error) return reject(error);
      resolve(varbinds || []);
    });
  });
}

function snmpSubtree(session, oid) {
  return new Promise((resolve, reject) => {
    const rows = [];
    session.subtree(
      oid,
      (varbind) => {
        if (varbind && varbind.value !== undefined && varbind.value !== null) {
          rows.push(varbind);
        }
      },
      (error) => {
        if (error) return reject(error);
        resolve(rows);
      }
    );
  });
}

function normalizeSnmpString(value) {
  if (Buffer.isBuffer(value)) return value.toString("utf8").trim();
  return String(value || "").trim();
}

function extractIndex(oid) {
  return String(oid || "").split(".").pop();
}

async function getByIndex(session, index) {
  const vars = await snmpGet(session, [
    `1.3.6.1.2.1.43.11.1.1.9.1.${index}`,
    `1.3.6.1.2.1.43.11.1.1.8.1.${index}`
  ]);

  const level = Number(vars[0] && vars[0].value);
  const max = Number(vars[1] && vars[1].value);

  if (!Number.isFinite(level) || !Number.isFinite(max) || max <= 0 || level < 0) return null;

  return {
    level,
    max,
    percent: Math.max(0, Math.min(100, Math.round((level / max) * 100)))
  };
}

ipcMain.handle("printer:get-toner-snmp", async (_event, ip) => {
  const cleanIp = String(ip || "").trim();
  if (!cleanIp) return { ok: false, error: "IP inválido", colors: [], residue: null };

  const session = snmp.createSession(cleanIp, "public", {
    timeout: 3000,
    retries: 1,
    version: snmp.Version2c
  });

  try {
    const descs = await snmpSubtree(session, "1.3.6.1.2.1.43.11.1.1.6.1");

    const colorsConfig = [
      { key: "black", label: "Preto", re: /(black|preto)/i },
      { key: "cyan", label: "Ciano", re: /(cyan|ciano|blue|azul)/i },
      { key: "magenta", label: "Magenta", re: /(magenta|red|vermelho)/i },
      { key: "yellow", label: "Amarelo", re: /(yellow|amarelo)/i }
    ];

    const colors = [];
    for (const cfg of colorsConfig) {
      const desc = descs.find(v => cfg.re.test(normalizeSnmpString(v.value)));
      if (!desc) continue;
      const info = await getByIndex(session, extractIndex(desc.oid));
      if (!info) continue;
      colors.push({ key: cfg.key, label: cfg.label, percent: info.percent });
    }

    let residue = null;
    const residueDesc = descs.find(v => /(waste|resid|resíduo|residual|used toner|waste toner)/i.test(normalizeSnmpString(v.value)));
    if (residueDesc) {
      const info = await getByIndex(session, extractIndex(residueDesc.oid));
      if (info) residue = { key: "waste", label: "Resíduo", percent: info.percent };
    }

    if (!colors.length) {
      const fallback = await snmpGet(session, [
        "1.3.6.1.2.1.43.11.1.1.9.1.1",
        "1.3.6.1.2.1.43.11.1.1.8.1.1"
      ]);
      const level = Number(fallback[0] && fallback[0].value);
      const max = Number(fallback[1] && fallback[1].value);
            if (Number.isFinite(level) && Number.isFinite(max) && max > 0 && level >= 0) {
        colors.push({ key: "black", label: "Preto", percent: Math.max(0, Math.min(100, Math.round((level / max) * 100))) });
      }
    }

    if (!colors.length && !residue) {
      return { ok: false, error: "Sem leitura SNMP", colors: [], residue: null };
    }

    return { ok: true, colors, residue };
  } catch (error) {
    return { ok: false, error: error.message, colors: [], residue: null };
  } finally {
    try { session.close(); } catch {}
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
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

