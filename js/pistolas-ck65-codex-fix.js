
/* =========================================================
   APP BRAGA - PISTOLAS CK65 CODEX FIX
   Corrige Editar / Ver Mais no ZIP atual do Codex
   ========================================================= */

(function () {
  function safeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c;
    });
  }

  function notify(msg, type) {
    if (typeof window.mostrarMensagem === "function") {
      window.mostrarMensagem(msg, type || "ok");
    } else {
      alert(msg);
    }
  }

  function listaPistolas() {
    if (!Array.isArray(window.pistolasData)) window.pistolasData = [];
    return window.pistolasData;
  }

  function idPistola(p, index) {
    return p?.idDoc ||
      p?.firebaseId ||
      p?.id ||
      p?.docId ||
      p?._ref ||
      `local-pistola-${index}`;
  }

  function cleanId(value) {
    return String(value ?? "").trim();
  }

  function encontrarPistola(ref) {
    if (ref && typeof ref === "object") return ref;

    const wanted = cleanId(ref);
    const lista = listaPistolas();

    return lista.find(function (p, index) {
      return [
        p.idDoc,
        p.firebaseId,
        p.id,
        p.docId,
        p._ref,
        `local-pistola-${index}`,
        String(index)
      ].filter(Boolean).map(cleanId).includes(wanted);
    });
  }

  function setField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  }

  function getField(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  function fillForm(p) {
    setField("editP_num", p.num);
    setField("editP_nome", p.nome);
    setField("editP_password", p.password);
    setField("editP_cn", p.cn);
    setField("editP_sn", p.sn);
    setField("editP_mac", p.mac);
    setField("editP_operador", p.operador);
    setField("editP_armazem", p.armazem);
    setField("editP_prontas", p.prontas);
  }

  function readForm() {
    return {
      num: getField("editP_num"),
      nome: getField("editP_nome"),
      password: getField("editP_password"),
      cn: getField("editP_cn"),
      sn: getField("editP_sn"),
      mac: getField("editP_mac"),
      operador: getField("editP_operador"),
      armazem: getField("editP_armazem"),
      prontas: getField("editP_prontas"),
      updatedAt: Date.now()
    };
  }

  function openModal(title) {
    const h3 = document.querySelector("#modalEditarPistola h3");
    if (h3) h3.textContent = title || "Editar Pistola CK65";

    const sub = document.querySelector("#modalEditarPistola .section-subtitle");
    if (sub) sub.textContent = title && title.includes("Adicionar") ? "Criar uma nova pistola" : "Editar a pistola selecionada";

    const modal = document.getElementById("modalEditarPistola");
    if (modal) {
      modal.style.display = "flex";
      modal.classList.add("open");
    }
  }

  window.abrirAdicionarPistola = function () {
    window.pistolaAtual = null;
    window.pistolaEditRef = "__new__";
    window.pistolaEditId = null;
    window.currentEditingPistolaId = null;
    fillForm({});
    openModal("Adicionar Pistola CK65");
  };

  window.editarPistola = function (ref) {
    const pistola = encontrarPistola(ref);

    if (!pistola) {
      console.error("Pistola não encontrada para editar:", ref, listaPistolas());
      notify("Pistola não encontrada.", "erro");
      return;
    }

    const index = listaPistolas().indexOf(pistola);
    const id = idPistola(pistola, index);

    window.pistolaAtual = pistola;
    window.pistolaEditRef = id;
    window.pistolaEditId = id;
    window.currentEditingPistolaId = id;

    fillForm(pistola);
    openModal("Editar Pistola CK65");
  };

  window.verMaisPistola = function (ref) {
    const p = encontrarPistola(ref);

    if (!p) {
      console.error("Pistola não encontrada para Ver Mais:", ref, listaPistolas());
      alert("Pistola não encontrada.");
      return;
    }

    alert(
`Pistola CK65

Nº: ${p.num || "-"}
Nome: ${p.nome || "-"}
Password: ${p.password || "-"}
CN: ${p.cn || "-"}
SN: ${p.sn || "-"}
MAC: ${p.mac || "-"}
Operador: ${p.operador || "-"}
Armazém: ${p.armazem || "-"}
Prontas: ${p.prontas || "-"}`
    );
  };

  window.fecharEditarPistola = function () {
    const modal = document.getElementById("modalEditarPistola");
    if (modal) {
      modal.style.display = "none";
      modal.classList.remove("open");
    }

    window.pistolaAtual = null;
    window.pistolaEditRef = null;
    window.pistolaEditId = null;
    window.currentEditingPistolaId = null;
  };

  window.guardarEdicaoPistola = async function () {
    const data = readForm();

    if (!data.nome && !data.num) {
      notify("Preenche pelo menos o número ou o nome da pistola.", "erro");
      return;
    }

    try {
      const ref = window.pistolaEditRef;

      if (ref === "__new__") {
        const payload = { ...data, createdAt: Date.now() };

        if (window.db?.collection) {
          const docRef = await window.db.collection("pistolas").add(payload);
          listaPistolas().unshift({ idDoc: docRef.id, firebaseId: docRef.id, ...payload });
        } else {
          listaPistolas().unshift({ _ref: `local-pistola-${Date.now()}`, ...payload });
        }
      } else {
        if (window.db?.collection && ref && !String(ref).startsWith("local-pistola-")) {
          await window.db.collection("pistolas").doc(String(ref)).set(data, { merge: true });
        }

        const idx = listaPistolas().findIndex(function (item, index) {
          return cleanId(idPistola(item, index)) === cleanId(ref);
        });

        if (idx >= 0) listaPistolas()[idx] = { ...listaPistolas()[idx], ...data };
      }

      window.fecharEditarPistola();
      window.renderPistolas(listaPistolas());
      notify("Pistola guardada.");
    } catch (err) {
      console.error("Erro ao guardar pistola:", err);
      notify("Erro ao guardar pistola.", "erro");
    }
  };

  window.apagarPistola = async function (ref) {
    const pistola = encontrarPistola(ref);
    const index = pistola ? listaPistolas().indexOf(pistola) : -1;
    const id = pistola ? idPistola(pistola, index) : ref;

    if (!confirm("Apagar esta pistola?")) return;

    try {
      if (window.db?.collection && id && !String(id).startsWith("local-pistola-")) {
        await window.db.collection("pistolas").doc(String(id)).delete();
      }

      window.pistolasData = listaPistolas().filter(function (item, idx) {
        return cleanId(idPistola(item, idx)) !== cleanId(id);
      });

      window.renderPistolas(window.pistolasData);
    } catch (err) {
      console.error("Erro ao apagar pistola:", err);
      alert("Erro ao apagar pistola.");
    }
  };

  window.renderPistolas = function (lista) {
    const container = document.getElementById("listaPistolas");
    if (!container) return;

    const items = (Array.isArray(lista) ? lista.slice() : listaPistolas().slice())
      .sort(function (a, b) {
        return String(a.nome || a.num || "").localeCompare(
          String(b.nome || b.num || ""),
          "pt",
          { numeric: true, sensitivity: "base" }
        );
      });

    const totalEl = document.getElementById("countPistolas");
    const bragaEl = document.getElementById("countPistolasBraga");
    const reservaEl = document.getElementById("countPistolasReserva");

    if (totalEl) totalEl.textContent = String(items.length);
    if (bragaEl) bragaEl.textContent = String(items.filter(p => String(p.armazem || "").toLowerCase().includes("braga")).length);
    if (reservaEl) reservaEl.textContent = String(items.filter(p => String(p.armazem || "").toLowerCase().includes("vila") || String(p.operador || "").toLowerCase().includes("reserva")).length);

    if (!items.length) {
      container.innerHTML = '<div class="reference-empty">Sem pistolas registadas.</div>';
      return;
    }

    container.innerHTML = items.map(function (p, index) {
      const id = idPistola(p, index);
      const jsId = JSON.stringify(String(id));

      return `
        <div class="pc-card pistol-card">
          <div class="pc-name">${safeHtml(p.nome || "Pistola CK65")}</div>
          <div class="meta-line">Nº: <span class="meta-value">${safeHtml(p.num || "-")}</span></div>
          <div class="meta-line">Operador: <span class="meta-value">${safeHtml(p.operador || "-")}</span></div>
          <div class="meta-line">Armazém: <span class="meta-value">${safeHtml(p.armazem || "-")}</span></div>
          <div class="meta-line">CN: <span class="meta-value">${safeHtml(p.cn || "-")}</span></div>
          <div class="meta-line">SN: <span class="meta-value">${safeHtml(p.sn || "-")}</span></div>
          <div class="item-actions">
            <button class="secondary-btn" type="button" onclick='editarPistola(${jsId})'>Editar</button>
            <button class="secondary-btn reference-outline" type="button" onclick='verMaisPistola(${jsId})'>Ver Mais</button>
            <button class="secondary-btn btn-delete" type="button" onclick='apagarPistola(${jsId})'>Apagar</button>
          </div>
        </div>
      `;
    }).join("");
  };

  function rerenderLater() {
    if (!document.getElementById("listaPistolas")) return;
    setTimeout(function () { window.renderPistolas(listaPistolas()); }, 300);
    setTimeout(function () { window.renderPistolas(listaPistolas()); }, 900);
  }

  document.addEventListener("DOMContentLoaded", rerenderLater);
  window.addEventListener("pageshow", rerenderLater);
})();
