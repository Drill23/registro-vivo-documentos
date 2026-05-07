# Registro Vivo

App web/PWA para controlar documentos, alteracoes realizadas, pendencias, lembretes de reuniao e lixeira protegida.

## O que ele faz

- Login por senha. Por padrao, a senha local e `admin`.
- Cadastro de documentos pelo botao `Novo`.
- Lista de alteracoes por documento, com checklist verde quando concluido.
- Reordenacao das alteracoes por arrastar e soltar ou pelos botoes de seta.
- Lampada acesa quando todas as alteracoes do documento foram marcadas.
- Campo de responsavel, contexto rapido e lembretes para a proxima reuniao.
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

Quando o servidor Node esta rodando, os dados ficam no arquivo `data/registro-vivo.json`. Esse e o modo certo para duas pessoas compartilharem os mesmos registros, desde que o servidor esteja hospedado em um ambiente acessivel pelas duas.

Se a interface for aberta sem servidor, ela entra em modo local e salva no navegador. Esse modo serve para demonstracao, mas nao sincroniza entre voce e a Maria.

## Publicacao

GitHub Pages hospeda apenas arquivos estaticos. Ele consegue publicar a tela do app, mas nao consegue manter um banco compartilhado sozinho. Para sincronizacao real, hospede este projeto em um servico que rode Node, como Render, Railway, Fly.io ou uma VPS pequena, usando:

```bash
npm install
npm run build
APP_PASSWORD=admin npm run preview
```

Em hospedagem real, defina tambem `APP_SECRET` com uma frase longa e privada.
