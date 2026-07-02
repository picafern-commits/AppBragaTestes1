window.portasData = [];
window.portaSelecionada = null;

function renderPortas(lista = []){

    const container = document.getElementById('listaPortas');
    if(!container) return;

    container.innerHTML = '';

    if(!Array.isArray(lista)){
        console.warn('Lista portas inválida', lista);
        lista = [];
    }

    window.portasData = lista.map((item)=>{

        if(item.data && typeof item.data === 'function'){
            return {
                firebaseId: item.id,
                ...item.data()
            };
        }

        return {
            firebaseId:
                item.firebaseId ||
                item.idDoc ||
                item.id ||
                '',
            ...item
        };

    });

    window.portasData.sort((a,b)=>
        String(a.porta || '').localeCompare(
            String(b.porta || ''),
            undefined,
            { numeric:true }
        )
    );

    const estadoPortaLocal = (porta) => {
        const temIP = String(porta.ip || '').trim() !== '';
        const temUser = String(porta.user || '').trim() !== '';
        if(!temIP && !temUser) return 'livre';
        if(temIP && temUser) return 'ocupado';
        if(temIP && !temUser) return 'semUser';
        return 'livre';
    };

    const badgePortaLocal = (estado) => {
        if(estado === 'ocupado') return '<span class="badge ocupado">Ocupado</span>';
        if(estado === 'livre') return '<span class="badge livre">Livre</span>';
        if(estado === 'semUser') return '<span class="badge aviso">Sem user</span>';
        return '<span class="badge">-</span>';
    };

    const total = window.portasData.length;
    const ocupadas = window.portasData.filter(p => estadoPortaLocal(p) === 'ocupado').length;
    const livres = window.portasData.filter(p => estadoPortaLocal(p) === 'livre').length;

    const totalEl = document.getElementById('countPortas');
    const usadasEl = document.getElementById('countPortasUsadas');
    const livresEl = document.getElementById('countPortasLivres');

    if(totalEl) totalEl.textContent = total;
    if(usadasEl) usadasEl.textContent = ocupadas;
    if(livresEl) livresEl.textContent = livres;

    window.portasData.forEach((porta)=>{

        const card = document.createElement('div');
        const estado = estadoPortaLocal(porta);

        card.className = 'pc-card entity-card porta-card';

        card.innerHTML = `
            <div class="pc-name">Porta ${porta.porta || '-'}</div>
            <div class="meta-line">Local: <span class="meta-value">${porta.local || '-'}</span></div>
            <div class="meta-line">User: <span class="meta-value">${porta.user || '-'}</span></div>
            <div class="meta-line">Equipamento: <span class="meta-value">${porta.equipamento || '-'}</span></div>
            <div class="meta-line">IP: <span class="meta-value">${porta.ip || '-'}</span></div>
            <div class="meta-line">Estado: <span class="meta-value">${badgePortaLocal(estado)}</span></div>

            <div class="item-actions">

                <button
                    class="action-btn"
                    onclick="editarPorta('${porta.firebaseId}')"
                >
                    Editar
                </button>

                <button
                    class="action-btn"
                    onclick="verMaisPorta('${porta.firebaseId}')"
                >
                    Ver Mais
                </button>

                <button
                    class="action-btn delete-btn"
                    onclick="apagarPorta('${porta.firebaseId}')"
                >
                    Apagar
                </button>

            </div>
        `;

        container.appendChild(card);

    });

    console.log('PORTAS REALTIME FIX OK');

}

function iniciarPortas(){

    if(!window.db){
        console.error('Firebase DB indisponível');
        return;
    }

    localStorage.removeItem('portas');
    localStorage.removeItem('portasRede');

    window.db.collection('portas')
    .onSnapshot((snapshot)=>{

        const lista = [];

        snapshot.forEach((doc)=>{
            lista.push({
                firebaseId: doc.id,
                ...({ firebaseId: doc.id, ...doc.data() })
            });
        });

        renderPortas(lista);

    }, (err)=>{
        console.error(err);
    });

}

window.editarPorta = function(id){

    const porta = window.portasData.find(
        p => String(p.firebaseId) === String(id)
    );

    if(!porta){
        alert('Porta não encontrada');
        return;
    }

    window.portaSelecionada = porta;

    const a = document.getElementById('editPorta');
    const b = document.getElementById('editLocal');
    const c = document.getElementById('editUser');
    const d = document.getElementById('editEquipamento');
    const e = document.getElementById('editIP');

    if(a) a.value = porta.porta || '';
    if(b) b.value = porta.local || '';
    if(c) c.value = porta.user || '';
    if(d) d.value = porta.equipamento || '';
    if(e) e.value = porta.ip || '';

    const modal = document.getElementById('modalEditarPorta');

    if(modal){
        modal.style.display = 'flex';
    }

};

window.guardarEdicaoPorta = async function(){

    try{
        // NOVA PORTA
        if(!window.portaSelecionada){

            await window.adicionarNovaPorta();
            return;

        }

        const id = window.portaSelecionada.firebaseId;

        if(!id){
            alert('ID Firebase inválido');
            return;
        }

        const dados = {
            porta: document.getElementById('editPorta')?.value || '',
            local: document.getElementById('editLocal')?.value || '',
            user: document.getElementById('editUser')?.value || '',
            equipamento: document.getElementById('editEquipamento')?.value || '',
            ip: document.getElementById('editIP')?.value || ''
        };

        await window.db
        .collection('portas')
        .doc(String(id))
        .update(dados);

        const modal = document.getElementById('modalEditarPorta');

        if(modal){
            modal.style.display = 'none';
        }

        console.log('PORTAS SAVE FIX OK');

        alert('Porta atualizada com sucesso');

    }catch(err){

        console.error(err);
        alert('Erro ao guardar edição');

    }

};

window.verMaisPorta = function(id){

    const porta = window.portasData.find(
        p => String(p.firebaseId) === String(id)
    );

    if(!porta){
        alert('Porta não encontrada');
        return;
    }

    alert(
        'Porta: ' + (porta.porta || '-') + '\n' +
        'IP: ' + (porta.ip || '-') + '\n' +
        'Local: ' + (porta.local || '-')
    );

};

window.apagarPorta = async function(id){

    try{

        if(!confirm('Deseja apagar esta porta?')){
            return;
        }

        await window.db
        .collection('portas')
        .doc(String(id))
        .delete();

        alert('Porta apagada');

    }catch(err){

        console.error(err);
        alert('Erro ao apagar');

    }

};

window.adicionarNovaPorta = async function(){

    try{

        const dados = {

            porta:
                document.getElementById('editPorta')?.value || '',

            local:
                document.getElementById('editLocal')?.value || '',

            user:
                document.getElementById('editUser')?.value || '',

            equipamento:
                document.getElementById('editEquipamento')?.value || '',

            ip:
                document.getElementById('editIP')?.value || ''

        };

        await window.db.collection('portas').add(dados);

        const modal = document.getElementById('modalEditarPorta');

        if(modal){
            modal.style.display = 'none';
        }

        window.portaSelecionada = null;

        alert('Porta adicionada com sucesso');

    }catch(err){

        console.error(err);
        alert('Erro ao adicionar porta');

    }

};

document.addEventListener('DOMContentLoaded', iniciarPortas);


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

