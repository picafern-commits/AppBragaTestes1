# App Braga - estrutura dos sistemas

## Base da app

- `html/` - paginas publicadas no GitHub Pages.
- `js/app.js` - logica principal e compatibilidade Firebase v8.
- `js/main.js` - processo principal Electron, usado apenas no setup desktop.
- `js/preload.js` - ponte segura entre Electron e a app Web.
- `sw.js` - Service Worker da app Web/PWA.

## Sistemas organizados

- `js/systems/backup/local-backup.js` - backup local automatico no Electron.
- `js/systems/equipment/equipment-models.js` - catalogo modular dos tipos de ficha de equipamento.
- `js/systems/equipment/equipment-detail.js` - pagina/ficha unica de equipamento.
- `js/systems/global-search/global-search.js` - pesquisa global aberta por botao no topo das paginas.
- `js/enterprise/ops.js` - camada operacional: sidebar, pesquisa, notificacoes e integracoes visuais globais.
- `css/enterprise/ops.css` - camada CSS global de estabilidade, layout e fixes.
- `css/iphone-force-final.css` / `js/iphone-force-final.js` - fixes finais de iPhone/sidebar.
- `js/core/helpers.js` - helpers comuns.
- `functions/` - Firebase Cloud Functions para envio remoto de notificacoes.

## Regras de manutencao

- Nao mover `firebase-init.js` sem validar compatibilidade Firebase v8/v10.
- Nao remover workflows GitHub.
- Novos sistemas devem entrar em `js/systems/<nome>/`.
- Novas camadas CSS globais devem entrar em `css/enterprise/` ou `css/systems/<nome>/`.
- `node_modules/`, `dist/`, `.env` e service accounts ficam fora do Git.
