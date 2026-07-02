
(function(){
  const byId = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  function globalValue(name){
    try {
      if (typeof window[name] !== 'undefined') return window[name];
      return Function('try{return typeof '+name+'!==\"undefined\"?'+name+':undefined}catch(e){return undefined}')();
    } catch(e) { return undefined; }
  }

  function getStock(){
    const v = globalValue('stockGlobal');
    if (Array.isArray(v)) return v;
    return [];
  }

  function getHistorico(){
    const v = globalValue('historicoGlobal');
    if (Array.isArray(v)) return v;
    return [];
  }

  function colorName(item){
    const blob = norm([item.cor,item.color,item.nome,item.modelo,item.equipamento,item.referencia,item.codigoEtiqueta].join(' '));
    if (blob.includes('ciano') || blob.includes('cyan') || blob.includes('azul')) return 'Ciano';
    if (blob.includes('magenta') || blob.includes('vermelho')) return 'Magenta';
    if (blob.includes('amarelo') || blob.includes('yellow')) return 'Amarelo';
    return 'Preto';
  }

  function colorCls(color){
    const n = norm(color);
    if (n.includes('ciano') || n.includes('azul')) return 'ciano';
    if (n.includes('magenta') || n.includes('vermelho')) return 'magenta';
    if (n.includes('amarelo')) return 'amarelo';
    return 'preto';
  }

  function qty(item){
    const fields = ['quantidade','qtd','stock','total','unidades','disponivel','count'];
    for (const f of fields){
      const n = Number(String(item[f] ?? '').replace(',', '.').replace(/[^0-9.-]/g,''));
      if (Number.isFinite(n) && String(item[f] ?? '') !== '') return Math.max(0, Math.round(n));
    }
    return 1;
  }

  function refOf(item){
    return item.referencia || item.ref || item.sdsRef || item.lote || item.codigoEtiqueta || item.idInterno || '—';
  }

  function localOf(item){
    return item.localizacao || item.local || item.armazem || 'Sem localização';
  }

  function equipOf(item){
    return item.equipamento || item.modelo || item.nome || 'Toner';
  }

  function dateOf(item){
    return item.data || item.dataFolha || item.createdAt || item.created || '—';
  }

  function todayLike(v){
    if (!v) return false;
    const s = String(v);
    const d = new Date();
    const iso = d.toISOString().slice(0,10);
    const pt = d.toLocaleDateString('pt-PT');
    return s.includes(iso) || s.includes(pt) || norm(s).includes('hoje');
  }

  function statusFor(q){
    if (q <= 0) return ['Sem stock','zero'];
    if (q <= 5) return ['Baixo','low'];
    return ['Disponível','ok'];
  }

  function filteredStock(){
    const q = norm(byId('search')?.value || '');
    const armazem = byId('stockFilterArmazem')?.value || '';
    const cor = byId('stockFilterCor')?.value || '';
    return getStock().filter(item => {
      const blob = norm([equipOf(item), refOf(item), localOf(item), item.codigoEtiqueta, item.lote, item.sdsRef, item.idInterno].join(' '));
      const itemCor = colorName(item);
      return (!q || blob.includes(q)) &&
             (!armazem || localOf(item) === armazem) &&
             (!cor || norm(itemCor).includes(norm(cor)) || norm(cor).includes(norm(itemCor)));
    });
  }

  function renderArmazens(){
    const sel = byId('stockFilterArmazem');
    if (!sel || sel.dataset.loaded === '1') return;
    const current = sel.value;
    const locais = [...new Set(getStock().map(localOf).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt'));
    sel.innerHTML = '<option value="">Todos os armazéns</option>' + locais.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    sel.value = current;
    sel.dataset.loaded = '1';
  }

  function renderKPIs(items){
    const totalUnits = items.reduce((a,b)=>a+qty(b),0);
    const low = items.filter(i => qty(i) > 0 && qty(i) <= 5).length;
    const zero = items.filter(i => qty(i) <= 0).length;
    const hist = getHistorico();
    const entradasHoje = items.filter(i => todayLike(dateOf(i))).reduce((a,b)=>a+qty(b),0);
    const saidasHoje = hist.filter(i => todayLike(dateOf(i)) || todayLike(i.usadoAt)).length;
    const set=(id,v)=>{ const el=byId(id); if(el) el.textContent=v; };
    set('stockKpiTotal', totalUnits);
    set('stockKpiBaixo', low);
    set('stockKpiSemStock', zero);
    set('stockKpiEntradasHoje', entradasHoje);
    set('stockKpiSaidasHoje', saidasHoje);
    set('stockKpiEtiquetas', Math.max(0, items.filter(i => i.codigoEtiqueta).length));
    const old = byId('countStock'); if(old) old.textContent = String(items.length);
  }

  function renderTable(items){
    const tbody = byId('stockTableBody');
    if (!tbody) return;
    if (!items.length){
      tbody.innerHTML = '<tr><td colspan="8" class="stock-empty-row">Sem toners em stock para os filtros atuais.</td></tr>';
      byId('stockTableInfo').textContent = 'Mostrando 0 referências';
      return;
    }
    tbody.innerHTML = items.slice(0, 40).map(item => {
      const q = qty(item);
      const [label, cls] = statusFor(q);
      const color = colorName(item);
      const id = item.idDoc || item.firebaseId || '';
      return `<tr>
        <td><span class="stock-color-dot ${colorCls(color)}"></span>${esc(color)}</td>
        <td>${esc(equipOf(item))}</td>
        <td>${esc(refOf(item))}</td>
        <td>${esc(localOf(item))}</td>
        <td><strong>${q}</strong> un.</td>
        <td><span class="stock-status ${cls}">${label}</span></td>
        <td>${esc(dateOf(item))}</td>
        <td><div class="stock-actions">
          <button class="stock-action-icon" type="button" onclick="abrirEditarStockModal('${esc(id)}')" title="Editar">👁</button>
          <button class="stock-action-icon" type="button" onclick="usar('${esc(id)}')" title="Marcar usado">↩</button>
          <button class="stock-action-icon" type="button" onclick="apagarStockItem('${esc(id)}')" title="Apagar">⋮</button>
        </div></td>
      </tr>`;
    }).join('');
    byId('stockTableInfo').textContent = `Mostrando 1 a ${Math.min(items.length,40)} de ${items.length} referências`;
  }

  function renderAlerts(items){
    const host = byId('stockAlertsList'); if(!host) return;
    const alerts = items.filter(i => qty(i) <= 5).sort((a,b)=>qty(a)-qty(b)).slice(0,5);
    if(!alerts.length){
      host.innerHTML = '<div class="stock-alert"><span class="stock-alert-dot"></span><span>Sem alertas de stock neste momento</span><small>OK</small></div>';
      return;
    }
    host.innerHTML = alerts.map(item => {
      const q = qty(item);
      const crit = q <= 0;
      return `<div class="stock-alert ${crit?'crit':''}"><span class="stock-alert-dot"></span><span>${esc(colorName(item))} — ${esc(equipOf(item))} — ${esc(localOf(item))}</span><small>${crit?'Sem stock':'Baixo'}</small></div>`;
    }).join('');
  }

  function renderColorBars(items){
    const host = byId('stockColorBars'); if(!host) return;
    const counts = {Preto:0,Ciano:0,Magenta:0,Amarelo:0};
    items.forEach(i => counts[colorName(i)] += qty(i));
    const max = Math.max(1, ...Object.values(counts));
    host.innerHTML = Object.entries(counts).map(([color,val]) => {
      const cls = colorCls(color);
      const w = Math.max(5, Math.round((val/max)*100));
      return `<div class="stock-bar"><span>${color}</span><span class="stock-bar-line"><span class="stock-bar-fill ${cls}" style="width:${w}%"></span></span><strong>${val} un.</strong></div>`;
    }).join('');
  }

  function renderMovements(items){
    const host = byId('stockMovementsBody'); if(!host) return;
    const hist = getHistorico();
    const movements = [
      ...items.slice(-8).reverse().map(i => ({ tipo:'Entrada', cor:colorName(i), ref:refOf(i), quantidade:qty(i), local:localOf(i), user:'Sistema', data:dateOf(i) })),
      ...hist.slice(-8).reverse().map(i => ({ tipo:'Saída', cor:colorName(i), ref:refOf(i), quantidade:qty(i), local:localOf(i), user:i.user || i.utilizador || 'Sistema', data:dateOf(i) }))
    ].slice(0,10);
    if(!movements.length){
      host.innerHTML = '<tr><td colspan="7" class="stock-empty-row">Sem movimentos recentes.</td></tr>';
      return;
    }
    host.innerHTML = movements.map(m => `<tr>
      <td>${esc(m.data || '—')}</td>
      <td><span class="stock-status ${m.tipo==='Entrada'?'ok':'low'}">${esc(m.tipo)}</span></td>
      <td><span class="stock-color-dot ${colorCls(m.cor)}"></span>${esc(m.cor)}</td>
      <td>${esc(m.ref)}</td>
      <td>${esc(m.quantidade)} un.</td>
      <td>${esc(m.local)}</td>
      <td>${esc(m.user)}</td>
    </tr>`).join('');
  }

  function renderLabels(items){
    const host = byId('stockLabelsList'); if(!host) return;
    const list = items.filter(i => i.codigoEtiqueta || i.lote || i.sdsRef).slice(-4).reverse();
    if(!list.length){
      host.innerHTML = '<div class="stock-label-row"><strong>Sem etiquetas recentes</strong><span>—</span><span>—</span><span></span></div>';
      return;
    }
    host.innerHTML = list.map(item => `<div class="stock-label-row">
      <strong>Etiquetas Toner — ${esc(refOf(item))}.docx</strong>
      <span>${esc(refOf(item))}</span>
      <span>${esc(dateOf(item))}</span>
      <span class="stock-label-actions"><button type="button" title="Download">↓</button><button type="button" title="Imprimir">🖨</button></span>
    </div>`).join('');
  }


  function alinharEtiquetasComMovimentos(){
    const movements = document.querySelector('.stock-movements-wide');
    const labels = document.querySelector('.stock-labels-panel');
    const mainGrid = document.querySelector('.stock-main-grid');

    if (!movements || !labels || !mainGrid) return;

    const isStacked = window.matchMedia('(max-width: 1500px)').matches;
    if (isStacked) {
      labels.style.setProperty('--stock-labels-align-offset', '0px');
      return;
    }

    // Primeiro limpa para medir a posição natural.
    labels.style.setProperty('--stock-labels-align-offset', '0px');

    requestAnimationFrame(() => {
      const movementTop = movements.getBoundingClientRect().top;
      const labelTop = labels.getBoundingClientRect().top;
      const delta = Math.round(movementTop - labelTop);

      // Só desce o card de etiquetas. Não sobe por cima dos cards anteriores.
      const offset = Math.max(0, delta);
      labels.style.setProperty('--stock-labels-align-offset', offset + 'px');
    });
  }

  function renderAll(){
    renderArmazens();
    const items = filteredStock();
    renderKPIs(items);
    renderTable(items);
    renderAlerts(items);
    renderColorBars(items);
    renderMovements(items);
    renderLabels(items);
    alinharEtiquetasComMovimentos();
  }

  window.filtrarStockFuturista = renderAll;
  window.limparFiltrosStockFuturista = function(){
    if(byId('search')) byId('search').value = '';
    if(byId('stockFilterArmazem')) byId('stockFilterArmazem').value = '';
    if(byId('stockFilterCor')) byId('stockFilterCor').value = '';
    renderAll();
  };

  const oldFiltrar = window.filtrar;
  window.filtrar = function(){
    renderAll();
    if (typeof oldFiltrar === 'function') {
      try { oldFiltrar(); } catch(e) {}
    }
  };

  function bind(){
    ['search','stockFilterArmazem','stockFilterCor'].forEach(id => {
      const el = byId(id);
      if(el && el.dataset.stockFuturistaBound !== '1'){
        el.dataset.stockFuturistaBound = '1';
        el.addEventListener('input', renderAll);
        el.addEventListener('change', renderAll);
      }
    });
    renderAll();
    setTimeout(renderAll, 500);
    setTimeout(renderAll, 1500);
    setInterval(renderAll, 5000);
  }


  window.addEventListener('resize', () => {
    clearTimeout(window.__stockAlignResizeTimer);
    window.__stockAlignResizeTimer = setTimeout(alinharEtiquetasComMovimentos, 120);
  });

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
