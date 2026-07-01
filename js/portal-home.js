(function(){
  const cards = Array.from(document.querySelectorAll('.portal-card'));
  const toast = document.querySelector('.portal-toast');
  let selected = null;

  function showToast(message){
    if(!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__portalToastTimer);
    window.__portalToastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function setSelected(card){
    if(!card) return;
    cards.forEach(c => {
      const active = c === card;
      c.classList.toggle('is-selected', active);
      c.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    selected = card;
    const title = card.querySelector('h2')?.textContent?.trim() || 'Área';
    showToast(`${title} selecionado — agora escolhe uma página dentro do card.`);
  }

  function isCardSelected(card){
    return selected === card && card.classList.contains('is-selected');
  }

  cards.forEach(card => {
    card.addEventListener('click', (event) => {
      const direct = card.getAttribute('data-direct');
      if(direct){
        event.preventDefault();
        event.stopPropagation();
        window.location.href = direct;
        return;
      }

      const link = event.target.closest('a');

      // Primeiro clique num card, numa seta ou numa opção interna: apenas seleciona.
      // Só depois de o card estar selecionado é que a opção pode navegar.
      if(!isCardSelected(card)){
        event.preventDefault();
        event.stopPropagation();
        setSelected(card);
        return;
      }

      // Card já selecionado: links internos navegam; clique no fundo mantém selecionado.
      if(link) return;
      setSelected(card);
    }, true);

    card.addEventListener('keydown', (event) => {
      if(event.key === 'Enter' || event.key === ' '){
        event.preventDefault();
        const direct = card.getAttribute('data-direct');
        if(direct){ window.location.href = direct; return; }
        setSelected(card);
      }
    });
  });

  // Estado inicial: nenhum card fica pronto a abrir páginas.
  cards.forEach(c => {
    c.classList.remove('is-selected');
    c.setAttribute('aria-selected','false');
  });
})();
