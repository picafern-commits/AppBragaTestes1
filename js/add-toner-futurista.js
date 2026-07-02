
(function(){
  const byId = (id) => document.getElementById(id);
  const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  function globalArray(names) {
    for (const name of names) {
      try {
        const value = window[name];
        if (Array.isArray(value)) return value;
      } catch(e) {}
    }
    return [];
  }

  function setText(id, value) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  function getColorClass(value) {
    const n = norm(value);
    if (n.includes('amarelo')) return 'amarelo';
    if (n.includes('azul') || n.includes('ciano')) return 'ciano';
    if (n.includes('vermelho') || n.includes('magenta')) return 'magenta';
    return 'black';
  }

  function updatePreview() {
    const equipamento = byId('equipamento')?.value || '-';
    const localizacao = byId('localizacao')?.value || '-';
    const cor = byId('cor')?.value || '-';
    const data = byId('data')?.value || '-';
    const qtd = byId('quantidade')?.value || '1';
    const unidade = byId('unidade')?.value || 'Unidade';
    const obs = byId('observacoes')?.value || '-';

    setText('previewEquipamento', equipamento || '-');
    setText('previewLocalizacao', localizacao || '-');
    setText('previewCor', cor || '-');
    setText('previewData', data || '-');
    setText('previewQtd', `${qtd} ${qtd === '1' ? unidade.replace(/s$/, '') : unidade}`);
    setText('previewObs', obs || '-');

    const dot = byId('previewColorDot');
    if (dot) {
      dot.className = 'color-dot ' + getColorClass(cor);
    }

    setText('obsCounter', String((byId('observacoes')?.value || '').length));
  }

  function hydrateDate() {
    const data = byId('data');
    if (data && !data.value) {
      const now = new Date();
      data.value = now.toISOString().slice(0, 10);
    }
  }

  function renderRecent() {
    const list = byId('recentTonerList');
    if (!list) return;

    const stock = globalArray(['stockTonersData','stockData','tonersStockData','registosStockData']);
    const sample = stock.length ? stock.slice(-5).reverse().map(item => ({
      nome: item.equipamento || item.modelo || item.nome || 'Toner',
      cor: item.cor || 'Preto',
      qtd: item.quantidade || item.qtd || 1,
      hora: item.hora || 'Hoje, 09:10'
    })) : [
      { nome:'Kyocera ECOSYS M2040dn', cor:'Preto', qtd:1, hora:'Hoje, 09:10' },
      { nome:'TASKalfa 4052ci', cor:'Magenta', qtd:1, hora:'Hoje, 08:50' },
      { nome:'Kyocera P3260dn', cor:'Amarelo', qtd:1, hora:'Hoje, 08:30' },
      { nome:'Kyocera PA5500x', cor:'Ciano', qtd:1, hora:'Hoje, 08:15' },
      { nome:'Kyocera ECOSYS M5526cdw', cor:'Preto', qtd:2, hora:'Hoje, 07:55' }
    ];

    list.innerHTML = sample.map(item => `<div class="row"><span><span class="dot ${getColorClass(item.cor)}"></span>${item.nome}</span><small>${item.cor} • ${item.qtd} un.</small><small>${item.hora}</small><b>Válido</b></div>`).join('');
  }

  function hydrateKpis() {
    const impressoras = globalArray(['impressorasData']);
    const stock = globalArray(['stockTonersData','stockData','tonersStockData','registosStockData']);
    if (impressoras.length) setText('kpiEquipamentos', impressoras.length);
    if (stock.length) setText('kpiRegistosHoje', stock.length);
  }

  function attach() {
    ['equipamento','localizacao','cor','data','quantidade','unidade','observacoes'].forEach(id => {
      const el = byId(id);
      if (el) {
        el.addEventListener('input', updatePreview);
        el.addEventListener('change', updatePreview);
      }
    });
  }

  function init() {
    hydrateDate();
    attach();
    updatePreview();
    renderRecent();
    hydrateKpis();
    setTimeout(() => { renderRecent(); hydrateKpis(); updatePreview(); }, 800);
    setTimeout(() => { renderRecent(); hydrateKpis(); updatePreview(); }, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


// v1.58.70 — integração com AppBragaSystems para movimentos de toner
(function(){
  function collectTonerPayload(){
    return {
      equipamento: document.querySelector("#equipamento,#tonerEquipamento,#addTonerEquipamento")?.value || "",
      localizacao: document.querySelector("#localizacao,#tonerLocalizacao,#addTonerLocalizacao")?.value || "",
      cor: document.querySelector("#cor,#tonerCor,#addTonerCor")?.value || "",
      quantidade: document.querySelector("#quantidade,#tonerQuantidade,#addTonerQuantidade")?.value || 1,
      referencia: document.querySelector("#codigoEtiqueta,#sdsRef,#sdsReferencia")?.value || "",
      area: "Adicionar Toner"
    };
  }
  document.addEventListener("click", function(ev){
    const btn = ev.target.closest("button");
    if (!btn) return;
    const text = (btn.textContent || "").toLowerCase();
    if (text.includes("guardar") && text.includes("registo")) {
      setTimeout(function(){
        try { if (window.registarTonerAdicionadoAppBraga) window.registarTonerAdicionadoAppBraga(collectTonerPayload()); } catch(e) {}
      }, 800);
    }
  }, true);
})();
