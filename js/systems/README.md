# Sistemas modulares da App Braga

Esta pasta guarda funcionalidades novas ou extraidas do `js/app.js`.

## Regra pratica

- Cada sistema fica em `js/systems/<nome>/`.
- O ficheiro `*-models.js` deve conter configuracao e mapeamentos de dados.
- O ficheiro principal deve conter comportamento da pagina ou funcionalidade.
- CSS especifico deve ficar em `css/systems/<nome>.css`.
- O `js/app.js` deve continuar apenas com compatibilidade antiga enquanto os sistemas forem migrados.

## Sistema atual

- `equipment/` - ficha unica de equipamento, com catalogo de tipos e pagina de detalhe.
- `global-search/` - pesquisa global aberta por botao, sem barra fixa nem sobreposicao de conteudo.
