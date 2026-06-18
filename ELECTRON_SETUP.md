# App Braga Electron Setup

## Criar instalador Windows

O Electron funciona como wrapper da app principal publicada no GitHub Pages:

```text
https://picafern-commits.github.io/App-Tablet/html/index.html
```

Os ficheiros locais ficam no setup apenas como fallback de emergencia se o GitHub Pages estiver indisponivel.

1. Instalar dependencias:

```powershell
npm install
```

2. Testar a app desktop:

```powershell
npm run electron:dev
```

3. Criar setup `.exe`:

```powershell
npm run setup
```

O instalador fica em `dist`.

## Backup local automatico

O backup local automatico funciona no Electron porque precisa de permissao para escrever em disco.

- Horario: dias uteis as 18:30.
- A app tem de estar aberta ou minimizada para segundo plano/tray.
- Os ficheiros sao guardados na pasta `local-backups` dentro de `userData` do Electron.
- O estado, temporizador e botao de backup manual aparecem em `Configuracoes > Backup local automatico`.
