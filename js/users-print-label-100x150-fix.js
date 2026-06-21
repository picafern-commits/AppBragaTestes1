
/* =========================================================
   APP BRAGA - USERS PRINT LABEL 100x150 + FIELD SELECTOR
   Zebra ZD421 - etiqueta única 100mm x 150mm
   ========================================================= */

(function () {
  const USER_PRINT_FIELDS = [
    ["zona", "Zona"],
    ["user_pc_eye", "User PC/EYE"],
    ["pass_remote", "Pass Remote"],
    ["pass_eye_peak", "Pass Eye Peak"],
    ["op_pistola", "Op. Pistola"],
    ["pass_pistola", "Pass Pistola"],
    ["nome_pc", "Nome PC"],
    ["teamviewer", "TeamViewer"],
    ["user_mo365", "User MO365"],
    ["pw_mo365", "PW MO365"],
    ["email_bragalis", "Email Bragalis"],
    ["pass_bragalis", "Pass Bragalis"]
  ];

  function esc(value) {
    return String(value ?? "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c;
    });
  }

  function clean(value) {
    return String(value ?? "").trim();
  }

  function ensureSelectorStyles() {
    if (document.getElementById("userPrintSelectorStyles")) return;

    const style = document.createElement("style");
    style.id = "userPrintSelectorStyles";
    style.textContent = `
      .user-print-modal-overlay{
        position:fixed;
        inset:0;
        z-index:99999;
        background:rgba(0,0,0,.72);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:18px;
      }

      .user-print-modal{
        width:min(560px,96vw);
        max-height:min(760px,92dvh);
        overflow:hidden;
        display:flex;
        flex-direction:column;
        background:linear-gradient(145deg,rgba(15,23,42,.98),rgba(30,41,59,.96));
        border:1px solid rgba(255,255,255,.14);
        border-radius:24px;
        box-shadow:0 30px 90px rgba(0,0,0,.55);
        color:#fff;
      }

      .user-print-modal-header{
        padding:20px;
        border-bottom:1px solid rgba(255,255,255,.10);
      }

      .user-print-modal-header h3{
        margin:0 0 6px 0;
        color:#fff!important;
        font-size:22px;
      }

      .user-print-modal-header p{
        margin:0;
        color:#cbd5e1!important;
        font-size:14px;
      }

      .user-print-fields{
        padding:16px 20px;
        overflow-y:auto;
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(210px,1fr));
        gap:10px;
      }

      .user-print-field{
        display:flex;
        align-items:center;
        gap:10px;
        min-height:46px;
        padding:10px 12px;
        border-radius:16px;
        background:rgba(255,255,255,.07);
        border:1px solid rgba(255,255,255,.10);
        cursor:pointer;
      }

      .user-print-field input{
        width:20px;
        height:20px;
        accent-color:var(--app-accent,#2563eb);
      }

      .user-print-field span{
        color:#fff!important;
        font-weight:800;
        font-size:14px;
      }

      .user-print-actions{
        padding:16px 20px 20px;
        border-top:1px solid rgba(255,255,255,.10);
        display:flex;
        gap:10px;
        flex-wrap:wrap;
      }

      .user-print-actions button{
        flex:1 1 140px;
        min-height:46px;
        border-radius:16px!important;
        font-weight:900;
      }

      .user-print-select-all{
        background:rgba(255,255,255,.08)!important;
        color:#fff!important;
        border:1px solid rgba(255,255,255,.14)!important;
      }

      .user-print-cancel{
        background:rgba(239,68,68,.14)!important;
        color:#fecaca!important;
        border:1px solid rgba(239,68,68,.30)!important;
      }

      .user-print-confirm{
        background:linear-gradient(135deg,var(--app-accent,#2563eb),var(--app-accent-hover,#1d4ed8))!important;
        color:var(--app-button-text,#fff)!important;
        border:0!important;
      }
    `;
    document.head.appendChild(style);
  }

  function getAvailableFields(user) {
    return USER_PRINT_FIELDS.filter(function ([key]) {
      return clean(user[key]) !== "";
    });
  }

  function defaultSelectedFields(user) {
    const available = getAvailableFields(user).map(([key]) => key);

    // Se tiver muitos campos, começa com os mais importantes para evitar cortar.
    const recommended = [
      "zona",
      "user_pc_eye",
      "pass_remote",
      "pass_eye_peak",
      "op_pistola",
      "pass_pistola",
      "nome_pc",
      "teamviewer"
    ];

    const recommendedAvailable = recommended.filter(key => available.includes(key));

    return available.length > 8 ? recommendedAvailable : available;
  }

  function openFieldSelector(user) {
    ensureSelectorStyles();

    const available = getAvailableFields(user);
    const selectedDefault = defaultSelectedFields(user);

    if (!available.length) {
      imprimirUserComCampos(user, []);
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "user-print-modal-overlay";

    overlay.innerHTML = `
      <div class="user-print-modal">
        <div class="user-print-modal-header">
          <h3>Escolher campos para imprimir</h3>
          <p>${esc(user.nome || "User")} · Etiqueta 100mm x 150mm</p>
        </div>

        <div class="user-print-fields">
          ${available.map(([key, label]) => `
            <label class="user-print-field">
              <input type="checkbox" value="${esc(key)}" ${selectedDefault.includes(key) ? "checked" : ""}>
              <span>${esc(label)}</span>
            </label>
          `).join("")}
        </div>

        <div class="user-print-actions">
          <button type="button" class="user-print-select-all" data-action="all">Todos</button>
          <button type="button" class="user-print-select-all" data-action="recommended">Recomendado</button>
          <button type="button" class="user-print-cancel" data-action="cancel">Cancelar</button>
          <button type="button" class="user-print-confirm" data-action="print">Imprimir</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    overlay.querySelector('[data-action="cancel"]').addEventListener("click", close);

    overlay.querySelector('[data-action="all"]').addEventListener("click", function () {
      overlay.querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = true);
    });

    overlay.querySelector('[data-action="recommended"]').addEventListener("click", function () {
      overlay.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = selectedDefault.includes(input.value);
      });
    });

    overlay.querySelector('[data-action="print"]').addEventListener("click", function () {
      const selected = Array.from(overlay.querySelectorAll('input[type="checkbox"]:checked'))
        .map(input => input.value);

      if (!selected.length) {
        alert("Escolhe pelo menos um campo para imprimir.");
        return;
      }

      close();
      imprimirUserComCampos(user, selected);
    });
  }

  function buildRows(user, selectedKeys) {
    const selected = Array.isArray(selectedKeys) ? selectedKeys : [];

    const fields = USER_PRINT_FIELDS
      .filter(([key]) => selected.includes(key))
      .filter(([key]) => clean(user[key]) !== "");

    const rows = fields.map(function ([key, label]) {
      return `
        <div class="label-row">
          <div class="label-key">${esc(label)}</div>
          <div class="label-value">${esc(user[key])}</div>
        </div>
      `;
    }).join("");

    return rows || `
      <div class="label-row">
        <div class="label-key">Sem dados</div>
        <div class="label-value">Nenhum campo foi selecionado.</div>
      </div>
    `;
  }

  function imprimirUserComCampos(user, selectedKeys) {
    const nome = clean(user.nome) || "User";
    const rows = buildRows(user, selectedKeys);
    const rowCount = Array.isArray(selectedKeys) ? selectedKeys.length : 0;

    // Ajusta ligeiramente tamanhos se o utilizador escolher muitos campos.
    const compactClass = rowCount > 8 ? "compact" : "";

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Etiqueta User - ${esc(nome)}</title>
<style>
  @page {
    size: 100mm 150mm;
    margin: 0;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html,
  body {
    width: 100mm;
    height: 150mm;
    max-width: 100mm;
    max-height: 150mm;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: #fff !important;
    color: #000 !important;
    font-family: Arial, Helvetica, sans-serif;
  }

  .sheet {
    width: 100mm;
    height: 150mm;
    max-width: 100mm;
    max-height: 150mm;
    overflow: hidden;
    padding: 5mm;
    background: #fff;
    color: #000;
    page-break-before: avoid;
    page-break-after: avoid;
    page-break-inside: avoid;
    break-before: avoid;
    break-after: avoid;
    break-inside: avoid;
  }

  .label-box {
    position: relative;
    width: 90mm;
    height: 140mm;
    max-height: 140mm;
    overflow: hidden;
    border: 0.6mm solid #000;
    border-radius: 2mm;
    padding: 3.5mm;
    background: #fff;
  }

  .label-header {
    border-bottom: 0.45mm solid #000;
    padding-bottom: 2.2mm;
    margin-bottom: 2.5mm;
  }

  .label-small {
    font-size: 9px;
    line-height: 1.1;
    font-weight: 900;
    letter-spacing: .03em;
    color: #000;
    text-transform: uppercase;
  }

  h1 {
    margin: 1.2mm 0 0 0;
    padding: 0;
    font-size: 18px;
    line-height: 1.05;
    font-weight: 900;
    color: #000;
    word-break: break-word;
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 1.35mm;
    max-height: 112mm;
    overflow: hidden;
  }

  .label-row {
    border: 0.38mm solid #000;
    border-radius: 1.3mm;
    padding: 1.35mm 1.6mm;
    min-height: 7.2mm;
    background: #fff;
    overflow: hidden;
  }

  .label-key {
    font-size: 8.4px;
    line-height: 1;
    font-weight: 900;
    color: #000;
    text-transform: uppercase;
    margin-bottom: .75mm;
  }

  .label-value {
    font-size: 10.8px;
    line-height: 1.12;
    font-weight: 800;
    color: #000;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .compact .rows {
    gap: .9mm;
  }

  .compact .label-row {
    padding: .95mm 1.25mm;
    min-height: 6.2mm;
  }

  .compact .label-key {
    font-size: 7.6px;
    margin-bottom: .45mm;
  }

  .compact .label-value {
    font-size: 9.8px;
    line-height: 1.05;
  }

  .footer {
    position: absolute;
    left: 3.5mm;
    right: 3.5mm;
    bottom: 2.2mm;
    border-top: 0.35mm solid #000;
    padding-top: 1.1mm;
    font-size: 8px;
    line-height: 1;
    color: #000;
    font-weight: 900;
    text-transform: uppercase;
    background:#fff;
  }

  @media print {
    html,
    body,
    .sheet {
      width: 100mm !important;
      height: 150mm !important;
      overflow: hidden !important;
    }

    body > * {
      page-break-after: avoid !important;
      page-break-before: avoid !important;
      page-break-inside: avoid !important;
      break-after: avoid !important;
      break-before: avoid !important;
      break-inside: avoid !important;
    }
  }
</style>
</head>
<body>
  <div class="sheet ${compactClass}">
    <div class="label-box">
      <div class="label-header">
        <div class="label-small">Etiqueta User · App Braga</div>
        <h1>${esc(nome)}</h1>
      </div>

      <div class="rows">
        ${rows}
      </div>

      <div class="footer">Autozitania / Bragalis</div>
    </div>
  </div>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "100mm";
    iframe.style.height = "150mm";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(function () {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        setTimeout(function () {
          if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1500);
      }
    }, 500);
  }

  window.imprimirUser = function (user) {
    if (!user) {
      if (typeof mostrarMensagem === "function") {
        mostrarMensagem("User não encontrado.", "erro");
      } else {
        alert("User não encontrado.");
      }
      return;
    }

    openFieldSelector(user);
  };

  window.imprimirUserComCampos = imprimirUserComCampos;
})();
