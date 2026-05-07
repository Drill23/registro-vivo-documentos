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

## Status

O projeto completo ja esta pronto localmente no Mac em `/Users/adrianoalmeida/Documents/Codex/2026-05-06/preciso-de-uma-ajuda-sua-eu`.

O push completo via GitHub CLI ficou aguardando confirmacao de seguranca no GitHub Mobile. Depois de autorizar o GitHub CLI, rode:

```bash
git push -u origin main
```

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Como funciona o armazenamento

Quando o servidor Node esta rodando, os dados ficam no arquivo `data/registro-vivo.json`. Esse e o modo certo para duas pessoas compartilharem os mesmos registros, desde que o servidor esteja hospedado em um ambiente acessivel pelas duas.

Se a interface for aberta sem servidor, ela entra em modo local e salva no navegador. Esse modo serve para demonstracao, mas nao sincroniza entre duas pessoas.
