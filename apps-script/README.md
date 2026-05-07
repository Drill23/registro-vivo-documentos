# Registro Vivo - Google Sheets API

Este script transforma uma planilha Google em banco de dados do Registro Vivo.

## Como instalar

1. Crie uma planilha no Google Sheets chamada `Registro Vivo - Banco de Dados`.
2. Na planilha, abra `Extensoes > Apps Script`.
3. Cole o conteudo de `Code.gs`.
4. Em `Project Settings > Script Properties`, adicione:
   - `REGISTRO_VIVO_SECRET`: use uma senha longa. Para teste pode ser `admin`.
5. Execute manualmente a funcao `setupWorkbook` uma vez e autorize.
6. Clique em `Deploy > New deployment`.
7. Tipo: `Web app`.
8. Execute as: `Me`.
9. Who has access: `Anyone with the link`.
10. Copie a URL do Web App.

## Como ligar no servidor

No ambiente onde o app Node estiver rodando, defina:

```bash
SHEETS_WEB_APP_URL=https://script.google.com/macros/s/.../exec
SHEETS_SECRET=admin
APP_PASSWORD=admin
```

O app continua respeitando a lixeira e a regra de limpeza. A planilha recebe o estado completo em `State` e espelhos legiveis nas abas `Documents`, `Tasks` e `Activity`.
