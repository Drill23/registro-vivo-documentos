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

## Como funciona o armazenamento compartilhado

A versao compartilhada roda dentro do Google Apps Script e usa uma planilha Google como banco de dados. Isso permite que duas pessoas abram o mesmo link e vejam as mesmas atualizacoes, sem depender de um computador local ligado.

A planilha guarda o estado completo na aba `State` e tambem espelha dados legiveis nas abas `Documents`, `Tasks` e `Activity`. A lixeira continua protegida por senha e itens movidos para la sao limpos automaticamente depois de 30 dias.

Para atualizar a versao publicada no Apps Script:

```bash
npm run build:apps-script
cd apps-script
npx @google/clasp push --force
npx @google/clasp deploy -d "Registro Vivo"
```

Se a interface for aberta fora do Apps Script e sem servidor Node, ela entra em modo local e salva no navegador. Esse modo serve para demonstracao, mas nao sincroniza entre voce e a Maria.

## Como funciona o modo local

Quando o servidor Node esta rodando, os dados ficam no arquivo `data/registro-vivo.json`. Ele ainda pode ser usado para desenvolvimento local:

```bash
APP_PASSWORD=admin npm run preview
```

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
