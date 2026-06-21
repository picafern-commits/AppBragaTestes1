// ===== DIRETORIO TELEFONICO APP BRAGA V1.33.3 - ARMAZEM > SECCAO + ENCODING FIX =====
(function(){
  const COLLECTION = 'diretorioTelefonico';
  let contactos = [];
  let contactoEditId = null;
  let unsubscribe = null;
  let collapsedArmazens = new Set();
  let collapsedSecoes = new Set();
  let encodingRepairRunning = false;

  function fixTextoDiretorio(v){
    let txt = String(v ?? "");
    if (!txt) return txt;

    txt = txt
      .replace(/Autozit\uFFFDnia/gi, "Autozitânia")
      .replace(/Autozit[aâã]?nia/gi, "Autozitânia")
      .replace(/Autozit\?nia/gi, "Autozitânia");

    return txt.normalize("NFC");
  }

  const $ = (id) => document.getElementById(id);
  const norm = (v) => fixTextoDiretorio(String(v || '').trim());
  const lower = (v) => norm(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const telHref = (v) => norm(v).replace(/[^0-9+]/g,'');
  const cleanKey = (v) => String(v || '').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');

  function armazemDe(c){ return norm(c.armazem || c.armazém || c.warehouse || c.local) || 'Sem Armazém'; }
  function seccaoDe(c){ return norm(c.seccao || c.secção || c.departamento) || 'Sem Secção'; }

  function contactoNormalizado(c){
    const out = {...(c || {})};
    ['nome','armazem','armazém','warehouse','seccao','secção','departamento','local','observacoes','email'].forEach(k => {
      if(out[k] !== undefined && out[k] !== null) out[k] = fixTextoDiretorio(out[k]);
    });
    return out;
  }

  function getEncodingPatch(c){
    const patch = {};
    ['nome','armazem','seccao','local','observacoes'].forEach(k => {
      if(c && typeof c[k] === 'string'){
        const fixed = fixTextoDiretorio(c[k]);
        if(fixed !== c[k]) patch[k] = fixed;
      }
    });
    return patch;
  }

  async function repararEncodingDiretorio(){
    if(encodingRepairRunning || !window.db?.collection) return;
    const comErro = contactos.map(c => ({c, patch:getEncodingPatch(c)})).filter(x => Object.keys(x.patch).length && x.c.firebaseId);
    if(!comErro.length) return;
    encodingRepairRunning = true;
    try{
      let batch = window.db.batch();
      let ops = 0;
      for(const item of comErro.slice(0, 450)){
        batch.update(window.db.collection(COLLECTION).doc(String(item.c.firebaseId)), item.patch);
        ops++;
      }
      if(ops) await batch.commit();
      setEstado(`Corrigido encoding: ${ops}`);
    }catch(err){
      console.warn('Não foi possível corrigir encoding do diretório:', err);
    }finally{
      encodingRepairRunning = false;
    }
  }

  function setEstado(text, ok=true){
    const el = $('diretorioEstado');
    if(!el) return;
    el.textContent = text;
    el.style.background = ok ? '' : 'rgba(220,38,38,.25)';
  }

  function getValores(){
    return {
      nome: norm($('dirNome')?.value),
      armazem: norm($('dirArmazem')?.value) || norm($('dirLocal')?.value) || 'Sem Armazém',
      seccao: norm($('dirSeccao')?.value) || 'Sem Secção',
      extensao: norm($('dirExtensao')?.value),
      telefone: norm($('dirTelefone')?.value),
      telemovel: norm($('dirTelemovel')?.value),
      email: norm($('dirEmail')?.value),
      local: norm($('dirLocal')?.value),
      observacoes: norm($('dirObs')?.value),
      updatedAtMs: Date.now()
    };
  }

  function preencherModal(c={}){
    if($('dirNome')) $('dirNome').value = c.nome || '';
    if($('dirArmazem')) $('dirArmazem').value = armazemDe(c) === 'Sem Armazém' ? '' : armazemDe(c);
    if($('dirSeccao')) $('dirSeccao').value = c.seccao || '';
    if($('dirExtensao')) $('dirExtensao').value = c.extensao || '';
    if($('dirTelefone')) $('dirTelefone').value = c.telefone || '';
    if($('dirTelemovel')) $('dirTelemovel').value = c.telemovel || '';
    if($('dirEmail')) $('dirEmail').value = c.email || '';
    if($('dirLocal')) $('dirLocal').value = c.local || '';
    if($('dirObs')) $('dirObs').value = c.observacoes || '';
  }

  function preencherDatalistsDiretorio(){
    const armazensLista = $('dirArmazensLista');
    const seccoesLista = $('dirSeccoesLista');
    if(armazensLista){
      const vals = [...new Set(contactos.map(armazemDe).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true}));
      armazensLista.innerHTML = vals.map(v=>`<option value="${esc(v)}"></option>`).join('');
    }
    if(seccoesLista){
      const vals = [...new Set(contactos.map(seccaoDe).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true}));
      seccoesLista.innerHTML = vals.map(v=>`<option value="${esc(v)}"></option>`).join('');
    }
  }

  function atualizarFiltros(){
    const selArm = $('diretorioFiltroArmazem');
    const selSec = $('diretorioFiltroSeccao');
    const selLoc = $('diretorioFiltroLocal');
    if(!selSec || !selLoc) return;
    const currentArm = selArm?.value || '';
    const currentSec = selSec.value;
    const currentLoc = selLoc.value;
    const armazens = [...new Set(contactos.map(armazemDe))].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true}));
    const seccoes = [...new Set(contactos.map(seccaoDe))].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true}));
    const locais = [...new Set(contactos.map(c => norm(c.local) || armazemDe(c) || 'Sem Local'))].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true}));
    if(selArm){
      selArm.innerHTML = '<option value="">Todos</option>' + armazens.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
      selArm.value = currentArm;
    }
    selSec.innerHTML = '<option value="">Todas</option>' + seccoes.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    selLoc.innerHTML = '<option value="">Todos</option>' + locais.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    selSec.value = currentSec;
    selLoc.value = currentLoc;
  }

  function filtrados(){
    const q = lower($('diretorioPesquisa')?.value || '');
    const arm = lower($('diretorioFiltroArmazem')?.value || '');
    const sec = lower($('diretorioFiltroSeccao')?.value || '');
    const loc = lower($('diretorioFiltroLocal')?.value || '');
    return contactos.filter(c => {
      const armVal = armazemDe(c);
      const secVal = seccaoDe(c);
      const locVal = norm(c.local) || armVal;
      const blob = lower([c.nome,c.extensao,c.telefone,c.telemovel,c.email,secVal,armVal,locVal,c.observacoes].join(' '));
      if(q && !blob.includes(q)) return false;
      if(arm && lower(armVal) !== arm) return false;
      if(sec && lower(secVal) !== sec) return false;
      if(loc && lower(locVal) !== loc) return false;
      return true;
    });
  }

  function agruparArmazemSecao(lista){
    const armazens = new Map();
    lista.forEach(c => {
      const arm = armazemDe(c);
      const sec = seccaoDe(c);
      if(!armazens.has(arm)) armazens.set(arm, new Map());
      const secMap = armazens.get(arm);
      if(!secMap.has(sec)) secMap.set(sec, []);
      secMap.get(sec).push(c);
    });
    for(const secMap of armazens.values()){
      for(const arr of secMap.values()) arr.sort((a,b)=> String(a.nome||'').localeCompare(String(b.nome||''),'pt',{numeric:true}));
    }
    return [...armazens.entries()].sort((a,b)=>a[0].localeCompare(b[0],'pt',{numeric:true}));
  }

  function secaoKey(arm, sec){ return `${arm}||${sec}`; }

  window.renderDiretorio = function(){
    atualizarFiltros();
    const list = filtrados();
    preencherDatalistsDiretorio();
    const total = $('diretorioTotal');
    const armazens = $('diretorioArmazens');
    const seccoes = $('diretorioSeccoes');
    const telemoveis = $('diretorioTelemoveis');
    if(total) total.textContent = list.length;
    if(armazens) armazens.textContent = new Set(list.map(armazemDe)).size;
    if(seccoes) seccoes.textContent = new Set(list.map(c => `${armazemDe(c)}|${seccaoDe(c)}`)).size;
    if(telemoveis) telemoveis.textContent = list.filter(c => norm(c.telemovel)).length;

    const container = $('diretorioLista');
    if(!container) return;
    if(!list.length){
      container.innerHTML = '<div class="dir-empty">Ainda não existem contactos para mostrar.</div>';
      return;
    }

    container.innerHTML = agruparArmazemSecao(list).map(([arm, secMap]) => {
      const allContacts = [...secMap.values()].flat();
      const armCollapsed = collapsedArmazens.has(arm);
      const sectionsHtml = [...secMap.entries()].sort((a,b)=>a[0].localeCompare(b[0],'pt',{numeric:true})).map(([sec, arr]) => {
        const key = secaoKey(arm, sec);
        const secCollapsed = collapsedSecoes.has(key);
        return `<article class="diretorio-section ${secCollapsed ? 'collapsed' : ''}" data-arm="${esc(arm)}" data-sec="${esc(sec)}">
          <div class="diretorio-section-head diretorio-subsection-head" onclick="toggleDiretorioSecao('${esc(arm).replace(/'/g,'\\&#39;')}','${esc(sec).replace(/'/g,'\\&#39;')}')">
            <div class="diretorio-section-title"><span class="dir-section-dot">▸</span><span>${esc(sec)}</span><span class="diretorio-count">${arr.length}</span></div>
            <div class="diretorio-chevron">⌄</div>
          </div>
          <div class="diretorio-table-wrap">
            <table class="diretorio-table">
              <thead><tr><th>Ações</th><th>Nome</th><th>Extensão</th><th>Telefone</th><th>Telemóvel</th><th>Email</th><th>Local</th><th>Obs.</th></tr></thead>
              <tbody>${arr.map(c => rowHtml(c)).join('')}</tbody>
            </table>
          </div>
        </article>`;
      }).join('');
      return `<article class="diretorio-warehouse ${armCollapsed ? 'collapsed' : ''}" data-arm="${esc(arm)}">
        <div class="diretorio-warehouse-head" onclick="toggleDiretorioArmazem('${esc(arm).replace(/'/g,'\\&#39;')}')">
          <div class="diretorio-warehouse-title"><span class="warehouse-icon" aria-hidden="true">🏢</span><span>${esc(arm)}</span><span class="diretorio-count">${allContacts.length}</span></div>
          <div class="diretorio-warehouse-meta"><span>${secMap.size} secções</span><span class="diretorio-chevron">⌄</span></div>
        </div>
        <div class="diretorio-warehouse-body">${sectionsHtml}</div>
      </article>`;
    }).join('');
  };

  function rowHtml(c){
    c = contactoNormalizado(c);
    const phone = telHref(c.telefone);
    const mobile = telHref(c.telemovel);
    const email = norm(c.email);
    return `<tr>
      <td><div class="diretorio-row-actions">
        <button class="dir-icon-btn" title="Editar" onclick="editarContactoDiretorio('${esc(c.firebaseId)}')">✎</button>
        <button class="dir-icon-btn copy" title="Copiar contacto" onclick="copiarContactoDiretorio('${esc(c.firebaseId)}')">⧉</button>
        <button class="dir-icon-btn delete" title="Apagar" onclick="apagarContactoDiretorio('${esc(c.firebaseId)}')">×</button>
      </div></td>
      <td>${esc(c.nome || '-')}</td>
      <td>${esc(c.extensao || '-')}</td>
      <td>${phone ? `<a href="tel:${esc(phone)}">${esc(c.telefone)}</a>` : '<span class="dir-muted">-</span>'}</td>
      <td>${mobile ? `<a href="tel:${esc(mobile)}">${esc(c.telemovel)}</a>` : '<span class="dir-muted">-</span>'}</td>
      <td>${email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '<span class="dir-muted">-</span>'}</td>
      <td>${esc(c.local || armazemDe(c) || '-')}</td>
      <td>${esc(c.observacoes || '-')}</td>
    </tr>`;
  }

  window.toggleDiretorioArmazem = function(arm){
    const val = cleanKey(arm);
    if(collapsedArmazens.has(val)) collapsedArmazens.delete(val); else collapsedArmazens.add(val);
    window.renderDiretorio();
  };

  window.toggleDiretorioSecao = function(arm, sec){
    const key = secaoKey(cleanKey(arm), cleanKey(sec));
    if(collapsedSecoes.has(key)) collapsedSecoes.delete(key); else collapsedSecoes.add(key);
    window.renderDiretorio();
  };

  window.expandirDiretorio = function(){ collapsedArmazens.clear(); collapsedSecoes.clear(); window.renderDiretorio(); };
  window.colapsarDiretorio = function(){
    contactos.forEach(c=>{
      const arm = armazemDe(c), sec = seccaoDe(c);
      collapsedArmazens.add(arm);
      collapsedSecoes.add(secaoKey(arm, sec));
    });
    window.renderDiretorio();
  };
  window.limparFiltrosDiretorio = function(){
    if($('diretorioPesquisa')) $('diretorioPesquisa').value='';
    if($('diretorioFiltroArmazem')) $('diretorioFiltroArmazem').value='';
    if($('diretorioFiltroSeccao')) $('diretorioFiltroSeccao').value='';
    if($('diretorioFiltroLocal')) $('diretorioFiltroLocal').value='';
    window.renderDiretorio();
  };

  window.abrirModalDiretorio = function(id){
    contactoEditId = id || null;
    const c = contactos.find(x => String(x.firebaseId) === String(id));
    preencherModal(c || {});
    preencherDatalistsDiretorio();
    if($('modalDiretorioTitulo')) $('modalDiretorioTitulo').textContent = c ? 'Editar Contacto' : 'Novo Contacto';
    const deleteBtn = $('dirDeleteModalBtn');
    if(deleteBtn) deleteBtn.style.display = c ? 'inline-flex' : 'none';
    const modal = $('modalDiretorio');
    if(modal) modal.style.display = 'flex';
    setTimeout(()=> $('dirNome')?.focus(), 80);
  };
  window.fecharModalDiretorio = function(){ const modal = $('modalDiretorio'); if(modal) modal.style.display='none'; const deleteBtn=$('dirDeleteModalBtn'); if(deleteBtn) deleteBtn.style.display='none'; contactoEditId=null; };
  window.editarContactoDiretorio = function(id){ window.abrirModalDiretorio(id); };
  window.apagarContactoAtualDiretorio = async function(){
    if(!contactoEditId) return;
    const id = contactoEditId;
    await window.apagarContactoDiretorio(id);
    window.fecharModalDiretorio();
  };

  window.guardarContactoDiretorio = async function(){
    try{
      const dados = getValores();
      if(!dados.nome){ alert('Preenche pelo menos o nome do contacto.'); return; }
      if(!window.db?.collection) throw new Error('Firebase indisponível.');
      if(contactoEditId){
        await window.db.collection(COLLECTION).doc(String(contactoEditId)).update(dados);
      } else {
        dados.createdAtMs = Date.now();
        await window.db.collection(COLLECTION).add(dados);
      }
      window.fecharModalDiretorio();
      setEstado('Guardado');
    }catch(err){
      console.error('Erro ao guardar contacto:', err);
      alert('Erro ao guardar contacto: ' + (err?.message || err));
      setEstado('Erro ao guardar', false);
    }
  };

  window.apagarContactoDiretorio = async function(id){
    try{
      const c = contactos.find(x => String(x.firebaseId) === String(id));
      if(!confirm(`Apagar contacto ${c?.nome || ''}?`)) return;
      await window.db.collection(COLLECTION).doc(String(id)).delete();
      setEstado('Contacto apagado');
    }catch(err){
      console.error('Erro ao apagar contacto:', err);
      alert('Erro ao apagar contacto: ' + (err?.message || err));
    }
  };

  window.copiarContactoDiretorio = async function(id){
    const c = contactos.find(x => String(x.firebaseId) === String(id));
    if(!c) return;
    const txt = `${c.nome || ''}\nArmazém: ${armazemDe(c)}\nSecção: ${seccaoDe(c)}\nExt: ${c.extensao || '-'}\nTelefone: ${c.telefone || '-'}\nTelemóvel: ${c.telemovel || '-'}\nEmail: ${c.email || '-'}\nLocal: ${c.local || '-'}`;
    try{
      await navigator.clipboard.writeText(txt);
      setEstado('Contacto copiado');
    }catch(e){
      prompt('Copia o contacto:', txt);
    }
  };

  function normalizarCabecalho(v){ return lower(v).replace(/[^a-z0-9]/g,''); }
  function valorPorCabecalho(row, aliases){
    for(const [k, v] of Object.entries(row || {})){
      const nk = normalizarCabecalho(k);
      if(aliases.includes(nk)) return norm(v);
    }
    return '';
  }

  function contactoDeLinha(row){
    const armazem = valorPorCabecalho(row, ['armazem','armazém','warehouse','localarmazem','localarmazém','site','filial']) || valorPorCabecalho(row, ['local','empresa','loja','localizacao','localização','morada']) || 'Sem Armazém';
    const local = valorPorCabecalho(row, ['local','empresa','loja','localizacao','localização','morada','zona','piso']) || '';
    const c = {
      nome: valorPorCabecalho(row, ['nome','contacto','colaborador','pessoa','funcionario','funcionaria','utilizador','user']),
      armazem,
      seccao: valorPorCabecalho(row, ['seccao','secao','secção','departamento','area','equipa','grupo','categoria']) || 'Sem Secção',
      extensao: valorPorCabecalho(row, ['extensao','extensão','ext','ramal','interno','numeroextensao','nramal']),
      telefone: valorPorCabecalho(row, ['telefone','telf','tel','telefonefixo','fixo','numero','contactotelefonico']),
      telemovel: valorPorCabecalho(row, ['telemovel','telemóvel','movel','móvel','tlm','mobile','gsm','contactomovel','contactomóvel']),
      email: valorPorCabecalho(row, ['email','mail','correio','correioeletronico','e-mail']),
      local,
      observacoes: valorPorCabecalho(row, ['observacoes','observações','obs','notas','nota','descricao','descrição']),
      updatedAtMs: Date.now(),
      origemImportacao: 'excel'
    };
    return c.nome ? c : null;
  }

  function parseCSV(text){
    const lines = String(text || '').replace(/^\ufeff/, '').split(/\r?\n/).filter(l => l.trim());
    if(!lines.length) return [];
    const delimiter = (lines[0].match(/;/g)||[]).length >= (lines[0].match(/,/g)||[]).length ? ';' : ',';
    const parseLine = (line) => {
      const out = []; let cur = ''; let quoted = false;
      for(let i=0;i<line.length;i++){
        const ch = line[i];
        if(ch === '"'){
          if(quoted && line[i+1] === '"'){ cur += '"'; i++; }
          else quoted = !quoted;
        } else if(ch === delimiter && !quoted){ out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out.map(v => v.trim());
    };
    const headers = parseLine(lines[0]);
    return lines.slice(1).map(line => {
      const vals = parseLine(line); const obj = {};
      headers.forEach((h,i)=> obj[h] = vals[i] || '');
      return obj;
    });
  }

  async function importarLinhasDiretorio(rows){
    const novos = rows.map(contactoDeLinha).filter(Boolean);
    if(!novos.length){ alert('Não encontrei contactos válidos no ficheiro. Confirma se existe uma coluna Nome.'); return; }
    if(!window.db?.collection) throw new Error('Firebase indisponível.');
    const msg = `Foram encontrados ${novos.length} contactos.\n\nA importação vai adicionar contactos novos e atualizar contactos existentes com o mesmo Nome + Armazém + Secção.\n\nQueres continuar?`;
    if(!confirm(msg)) return;
    setEstado('A importar...');

    const existentes = new Map(contactos.map(c => [lower(`${c.nome}|${armazemDe(c)}|${seccaoDe(c)}`), c.firebaseId]));
    let batch = window.db.batch();
    let ops = 0, adicionados = 0, atualizados = 0;
    async function commitIfNeeded(force=false){
      if(ops >= 400 || (force && ops > 0)){
        await batch.commit();
        batch = window.db.batch();
        ops = 0;
      }
    }

    for(const c of novos){
      const key = lower(`${c.nome}|${armazemDe(c)}|${seccaoDe(c)}`);
      const existingId = existentes.get(key);
      if(existingId){
        batch.update(window.db.collection(COLLECTION).doc(String(existingId)), c);
        atualizados++;
      } else {
        c.createdAtMs = Date.now();
        const ref = window.db.collection(COLLECTION).doc();
        batch.set(ref, c);
        existentes.set(key, ref.id);
        adicionados++;
      }
      ops++;
      await commitIfNeeded(false);
    }
    await commitIfNeeded(true);
    setEstado(`Importado: ${adicionados} novos / ${atualizados} atualizados`);
    alert(`Importação concluída.\n\nNovos: ${adicionados}\nAtualizados: ${atualizados}`);
  }

  window.abrirImportDiretorio = function(){
    const input = $('diretorioExcelInput');
    if(input){ input.value = ''; input.click(); }
  };

  window.importarDiretorioExcel = async function(event){
    const file = event?.target?.files?.[0];
    if(!file) return;
    try{
      setEstado('A ler ficheiro...');
      const name = lower(file.name);
      let rows = [];
      if(name.endsWith('.csv')){
        const buffer = await file.arrayBuffer();
        let text = new TextDecoder('utf-8').decode(buffer);
        // Se vier com caracteres inválidos, tenta Windows-1252, muito comum em CSV exportado pelo Excel.
        if(text.includes('\uFFFD')){
          try{ text = new TextDecoder('windows-1252').decode(buffer); }catch(e){}
        }
        rows = parseCSV(text);
      } else {
        if(!window.XLSX) throw new Error('Biblioteca de Excel não carregou. Confirma a ligação à internet e tenta novamente.');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if(!sheetName) throw new Error('O ficheiro Excel não tem folhas.');
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      }
      await importarLinhasDiretorio(rows);
    }catch(err){
      console.error('Erro ao importar diretório:', err);
      alert('Erro ao importar Excel: ' + (err?.message || err));
      setEstado('Erro ao importar', false);
    } finally {
      if(event?.target) event.target.value = '';
    }
  };

  window.descarregarModeloDiretorio = function(){
    const rows = [
      ['Nome','Armazém','Secção','Extensão','Telefone','Telemóvel','Email','Local','Observações'],
      ['Exemplo Contacto','Braga','Logística','51000','253000000','912345678','exemplo@empresa.pt','Piso 1','Nota interna']
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'modelo-diretorio-por-armazem.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  window.exportarDiretorioCSV = function(){
    const rows = [['Nome','Armazém','Secção','Extensão','Telefone','Telemóvel','Email','Local','Observações'], ...filtrados().map(c => [c.nome,armazemDe(c),seccaoDe(c),c.extensao,c.telefone,c.telemovel,c.email,c.local,c.observacoes])];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'diretorio-telefonico-por-armazem.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  window.atualizarDiretorio = function(){ iniciarDiretorio(true); };

  function iniciarDiretorio(force=false){
    if(unsubscribe && force){ try{ unsubscribe(); }catch(e){} unsubscribe=null; }
    if(unsubscribe) return;
    if(!window.db?.collection){ setEstado('Firebase indisponível', false); return; }
    setEstado('A carregar...');
    unsubscribe = window.db.collection(COLLECTION).onSnapshot((snap)=>{
      contactos = [];
      snap.forEach(doc => contactos.push(contactoNormalizado({firebaseId: doc.id, ...doc.data()})));
      contactos.sort((a,b)=> armazemDe(a).localeCompare(armazemDe(b),'pt',{numeric:true}) || seccaoDe(a).localeCompare(seccaoDe(b),'pt',{numeric:true}) || String(a.nome||'').localeCompare(String(b.nome||''),'pt',{numeric:true}));
      localStorage.setItem('appBraga_diretorio_cache', JSON.stringify(contactos));
      setEstado(`${contactos.length} contactos`);
      window.renderDiretorio();
      setTimeout(repararEncodingDiretorio, 350);
    }, (err)=>{
      console.error('Erro realtime diretorio:', err);
      try{ contactos = JSON.parse(localStorage.getItem('appBraga_diretorio_cache') || '[]'); }catch(e){ contactos=[]; }
      setEstado('Offline / cache', false);
      window.renderDiretorio();
    });
  }

  document.addEventListener('DOMContentLoaded', ()=> iniciarDiretorio());
})();
