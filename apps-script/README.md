# Registro Vivo - Google Apps Script

Este script transforma uma planilha Google em banco de dados e tambem hospeda o app Registro Vivo pelo proprio Google Apps Script.

## Como publicar

Este diretorio ja esta preparado para `clasp`. Para gerar a tela final e enviar para o Apps Script:

```bash
npm run build:apps-script
cd apps-script
npx @google/clasp push --force
npx @google/clasp deploy -d "Registro Vivo"
```

O deploy precisa ficar como Web App, executando como a pessoa que publicou e com acesso `Anyone with the link`.

## Estrutura da planilha

- `State`: guarda o JSON completo usado pelo app.
- `Documents`: espelho legivel dos documentos.
- `Tasks`: espelho legivel das alteracoes e pendencias.
- `Activity`: historico das ultimas acoes.

O app continua respeitando a lixeira protegida por senha e a regra de limpeza automatica depois de 30 dias.
