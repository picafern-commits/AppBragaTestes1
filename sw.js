const APP_BRAGA_SW = "app-braga-runtime-v117";
const APP_SHELL = [
  "./",
  "./index.html",
  "./html/index.html",
  "./html/notificacoes.html",
  "./html/computadores.html",
  "./html/impressoras.html",
  "./html/radios.html",
  "./html/tarefas.html",
  "./html/equipas-semanais.html",
  "./html/stock.html",
  "./manifest.json",
  "./css/style.css",
  "./css/autozitania-bragalis.css",
  "./css/app-theme-pro.css",
  "./css/enterprise/ops.css",
  "./css/systems/global-search.css",
  "./css/systems/personal-tools.css",
  "./css/iphone-force-final.css",
  "./css/iphone-sidebar-final.css",
  "./css/dashboard-widgets.css",
  "./css/app-clean-pages.css",
  "./css/operational-improvements.css",
  "./css/premium-polish.css",
  "./js/app.js",
  "./js/sidebar-editor.js",
  "./js/dashboard-widgets.js",
  "./js/operational-improvements.js",
  "./js/equipas-semanais.js",
  "./js/app-theme-pro.js",
  "./js/enterprise/ops.js",
  "./js/systems/global-search/global-search.js",
  "./js/systems/backup/local-backup.js",
  "./js/systems/personal-tools.js",
  "./js/core/helpers.js",
  "./js/iphone-force-final.js",
  "./js/iphone-sidebar-final.js",
  "./js/scanner-ia.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_BRAGA_SW)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== APP_BRAGA_SW).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(APP_BRAGA_SW)
          .then((cache) => cache.put(request, clone))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { title: "App Braga", body: event.data ? event.data.text() : "Nova notificacao" };
  }
  const title = payload.title || payload.notification?.title || "App Braga";
  const body = payload.body || payload.notification?.body || "Nova notificacao App Braga";
  const data = payload.data || payload;
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: payload.tag || data.tag || "app-braga",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: {
      url: data.url || payload.url || "./html/index.html",
      requestId: data.requestId || payload.requestId || ""
    }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "./html/index.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) {
          client.navigate(target).catch(() => null);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// APP BRAGA V1.51.0 iphone-fit-update
