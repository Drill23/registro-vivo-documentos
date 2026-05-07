const STATE_SHEET = 'State';
const DOCUMENTS_SHEET = 'Documents';
const TASKS_SHEET = 'Tasks';
const ACTIVITY_SHEET = 'Activity';
const DEFAULT_SECRET = 'admin';

const DEFAULT_STATE = {
  version: 1,
  updatedAt: new Date().toISOString(),
  documents: [],
  activity: []
};

function doGet() {
  return jsonResponse({
    ok: true,
    name: 'Registro Vivo Sheets API',
    actions: ['setup', 'getState', 'saveState']
  });
}

function doPost(event) {
  try {
    const body = JSON.parse((event && event.postData && event.postData.contents) || '{}');
    assertSecret(body.secret);

    if (body.action === 'setup') {
      setupWorkbook();
      return jsonResponse({ ok: true, state: readState() });
    }

    if (body.action === 'getState') {
      setupWorkbook();
      return jsonResponse({ ok: true, state: readState() });
    }

    if (body.action === 'saveState') {
      setupWorkbook();
      const state = normalizeState(body.state || DEFAULT_STATE);
      writeState(state);
      mirrorReadableSheets(state);
      return jsonResponse({ ok: true, state });
    }

    return jsonResponse({ ok: false, error: 'unknown_action' }, 400);
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) }, 500);
  }
}

function setupWorkbook() {
  const spreadsheet = SpreadsheetApp.getActive();
  ensureSheet(spreadsheet, STATE_SHEET);
  ensureSheet(spreadsheet, DOCUMENTS_SHEET);
  ensureSheet(spreadsheet, TASKS_SHEET);
  ensureSheet(spreadsheet, ACTIVITY_SHEET);

  const stateSheet = spreadsheet.getSheetByName(STATE_SHEET);
  stateSheet.getRange('A1:B1').setValues([['key', 'value']]).setFontWeight('bold');
  stateSheet.getRange('A2').setValue('state_json');
  if (!stateSheet.getRange('B2').getValue()) {
    stateSheet.getRange('B2').setValue(JSON.stringify(DEFAULT_STATE));
  }

  spreadsheet.getSheetByName(DOCUMENTS_SHEET)
    .getRange('A1:H1')
    .setValues([['id', 'title', 'owner', 'context', 'color', 'createdAt', 'updatedAt', 'deletedAt']])
    .setFontWeight('bold');

  spreadsheet.getSheetByName(TASKS_SHEET)
    .getRange('A1:I1')
    .setValues([['documentId', 'taskId', 'order', 'text', 'done', 'note', 'createdAt', 'updatedAt', 'deletedAt']])
    .setFontWeight('bold');

  spreadsheet.getSheetByName(ACTIVITY_SHEET)
    .getRange('A1:D1')
    .setValues([['id', 'action', 'details', 'createdAt']])
    .setFontWeight('bold');
}

function readState() {
  const spreadsheet = SpreadsheetApp.getActive();
  const sheet = spreadsheet.getSheetByName(STATE_SHEET);
  if (!sheet) return DEFAULT_STATE;
  const raw = sheet.getRange('B2').getValue();
  if (!raw) return DEFAULT_STATE;
  return normalizeState(JSON.parse(raw));
}

function writeState(state) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(STATE_SHEET);
  sheet.getRange('B2').setValue(JSON.stringify(state));
  sheet.getRange('B3').setValue(new Date().toISOString());
}

function mirrorReadableSheets(state) {
  const spreadsheet = SpreadsheetApp.getActive();
  const documents = state.documents || [];
  const tasks = documents.flatMap((document) =>
    (document.tasks || []).map((task) => [
      document.id,
      task.id,
      task.order,
      task.text,
      task.done,
      task.note || '',
      task.createdAt || '',
      task.updatedAt || '',
      task.deletedAt || ''
    ])
  );
  const activity = (state.activity || []).map((item) => [
    item.id,
    item.action,
    JSON.stringify(item.details || {}),
    item.createdAt || ''
  ]);

  replaceRows(spreadsheet.getSheetByName(DOCUMENTS_SHEET), documents.map((document) => [
    document.id,
    document.title,
    document.owner || '',
    document.context || '',
    document.color || '',
    document.createdAt || '',
    document.updatedAt || '',
    document.deletedAt || ''
  ]), 8);

  replaceRows(spreadsheet.getSheetByName(TASKS_SHEET), tasks, 9);
  replaceRows(spreadsheet.getSheetByName(ACTIVITY_SHEET), activity, 4);
}

function replaceRows(sheet, rows, width) {
  const maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, 1, maxRows, width).clearContent();
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, width).setValues(rows);
  }
  sheet.autoResizeColumns(1, width);
}

function ensureSheet(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function normalizeState(state) {
  return {
    version: Number(state.version || 1),
    updatedAt: state.updatedAt || new Date().toISOString(),
    documents: Array.isArray(state.documents) ? state.documents : [],
    activity: Array.isArray(state.activity) ? state.activity : []
  };
}

function assertSecret(secret) {
  const expected = PropertiesService.getScriptProperties().getProperty('REGISTRO_VIVO_SECRET') || DEFAULT_SECRET;
  if (secret !== expected) {
    throw new Error('invalid_secret');
  }
}

function jsonResponse(payload, statusCode) {
  const output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
  if (statusCode) {
    output.setHeader && output.setHeader('X-Status-Code', String(statusCode));
  }
  return output;
}
