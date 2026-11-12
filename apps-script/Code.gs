/**
 * @OnlyCurrentDoc
 * Lego Collection API — отдаёт сайту данные таблицы вживую (JSON / JSONP).
 * Таблица остаётся приватной; наружу уходят только колонки из PUBLIC_COLUMNS.
 * Развёртывание: «Начать развертывание» → «Веб-приложение»,
 * запуск от «Меня», доступ «Все».
 */
const SHEET_GID = 786177254;

const PUBLIC_COLUMNS = [
  'Set ID', 'Set Name', 'Condition', 'Category/Seria', 'Main Photo', 'Photos ;',
  'Creation Date', 'Link to BrickLink', 'Price on BrickLink', 'Link to BrickOwl',
  'Price on BrickOwl', 'Date of update', 'Pcs', 'Minifigures in set',
  'Instruction', 'Box', 'Comment',
];

function doGet(e) {
  const payload = JSON.stringify(readCollection_());
  const cb = e && e.parameter && e.parameter.callback;
  if (cb && /^[A-Za-z_$][\w$.]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + payload + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function readCollection_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets().find(function (s) { return s.getSheetId() === SHEET_GID; }) || ss.getSheets()[0];
  const values = sheet.getDataRange().getDisplayValues();
  const norm = function (s) { return String(s).toLowerCase().replace(/\s+/g, ' ').trim(); };
  const header = (values[0] || []).map(norm);
  const idx = PUBLIC_COLUMNS.map(function (c) { return header.indexOf(norm(c)); });
  const rows = values.slice(1)
    .map(function (r) { return idx.map(function (i) { return i < 0 ? '' : r[i]; }); })
    .filter(function (r) { return r[0] || r[1]; });
  return { header: PUBLIC_COLUMNS, rows: rows, generatedAt: new Date().toISOString() };
}

/** Для проверки из редактора: Выполнить → testRead */
function testRead() {
  const data = readCollection_();
  Logger.log(data.rows.length + ' rows; first: ' + JSON.stringify(data.rows[0]));
}
