# Registro Vivo

App web/PWA para controlar documentos, alteracoes realizadas, pendencias, pauta de reuniao e lixeira protegida.

## O que ele faz

- Login por senha. Por padrao, a senha local e `admin`.
- Cadastro de documentos pelo botao `Novo`.
- Lista de alteracoes por documento, com checklist verde quando concluido.
- Reordenacao das alteracoes por arrastar e soltar ou pelos botoes de seta.
- Lampada acesa quando todas as alteracoes do documento foram marcadas.
- Campo de responsavel e contexto rapido.
- Historico das ultimas acoes.
- Desfazer/refazer.
- Salvamento automatico.
- Lixeira com restauracao e esvaziamento protegido pela senha.
- Limpeza automatica da lixeira apos 30 dias.
- Layout responsivo para computador e celular.

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Como funciona o armazenamento

Quando o servidor Node esta rodando, os dados ficam no arquivo `data/registro-vivo.json`.

Para duas pessoas usarem o mesmo banco sem depender do computador de uma delas, configure o modo Google Sheets:

1. Abra `apps-script/README.md`.
2. Crie a planilha e publique o Apps Script como Web App.
3. Configure o servidor com:

```bash
SHEETS_WEB_APP_URL=https://script.google.com/macros/s/.../exec
SHEETS_SECRET=admin
APP_PASSWORD=admin
```

Nesse modo, o Google Sheets vira a fonte principal de dados. A lixeira e a limpeza continuam sendo controladas pelo app.

Se a interface for aberta sem servidor, ela entra em modo local e salva no navegador. Esse modo serve para demonstracao, mas nao sincroniza entre voce e a Maria.

## Publicacao

GitHub Pages hospeda apenas arquivos estaticos. Ele consegue publicar a tela do app, mas nao consegue manter um banco compartilhado sozinho.

Para testar com outra pessoa sem configurar hospedagem permanente, deixe o servidor local rodando e abra um tunel publico:

```bash
npm run preview
npm run share
```

O comando `npm run share` mostra um link `trycloudflare.com`. Enquanto o Mac estiver ligado e esses comandos estiverem rodando, outra pessoa consegue usar o mesmo app pelo link.

Para uma publicacao permanente, use um servico que rode Node, como Render, Railway, Fly.io ou uma VPS pequena, usando:

```bash
npm install
npm run build
APP_PASSWORD=admin npm run preview
```

Em hospedagem real, defina tambem `APP_SECRET` com uma frase longa e privada.

Este repositorio inclui `render.yaml` para facilitar deploy no Render.
