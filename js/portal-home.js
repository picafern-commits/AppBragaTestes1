(function(){
  const cards = Array.from(document.querySelectorAll('.portal-card'));
  const toast = document.querySelector('.portal-toast');
  let selected = document.querySelector('.portal-card.is-selected') || cards[0];
  function setSelected(card){
    cards.forEach(c => {
      const active = c === card;
      c.classList.toggle('is-selected', active);
      c.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    selected = card;
    if(toast){
      const title = card.querySelector('h2')?.textContent?.trim() || 'Área';
      toast.textContent = `${title} selecionado — escolhe uma opção dentro do card.`;
      toast.classList.add('show');
      clearTimeout(window.__portalToastTimer);
      window.__portalToastTimer = setTimeout(()=>toast.classList.remove('show'), 1800);
    }
  }
  cards.forEach(card => {
    card.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if(link){
        if(!card.classList.contains('is-selected')){
          event.preventDefault();
          setSelected(card);
        }
        return;
      }
      setSelected(card);
    });
    card.addEventListener('keydown', (event) => {
      if(event.key === 'Enter' || event.key === ' '){
        event.preventDefault();
        setSelected(card);
      }
    });
  });
  if(selected) setSelected(selected);
})();
