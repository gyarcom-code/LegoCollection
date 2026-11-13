/**
 * @OnlyCurrentDoc
 * Lego Collection API — отдаёт сайту данные таблицы вживую (JSON / JSONP).
 * Таблица остаётся приватной; наружу уходят только колонки из PUBLIC_COLUMNS / PARTS_COLUMNS.
 * Развёртывание: «Начать развертывание» → «Веб-приложение», запуск от «Меня», доступ «Все».
 *
 *   ?               — каталог наборов (лист «Lego sets») + minifigs (лист «Lego Minifigures»)
 *   ?parts=<SetID>  — детали набора (лист «Parts»)
 *   &callback=fn    — JSONP
 */
const SHEET_GID = 786177254;
const PARTS_GID = 1295143301;
const MINIFIG_GID = 656934717;

const PUBLIC_COLUMNS = [
  'Set ID', 'Set Name', 'Condition', 'Category/Seria', 'Main Photo', 'Photos ;',
  'Creation Date', 'Link to BrickLink', 'Price on BrickLink', 'Link to BrickOwl',
  'Price on BrickOwl', 'Date of update', 'Pcs', 'Minifigures in set',
  'Instruction', 'Box', 'Comment',
];

const MINIFIG_COLUMNS = [
  'Minifigure ID', 'Minifigure Name', 'Condition', 'Category/Seria', 'Main Photo', 'Photos ;',
  'Creation Date', 'Link to BrickLink', 'Price on BrickLink', 'Link to BrickOwl',
  'Price on BrickOwl', 'Date of update', 'Comment',
];

const PARTS_COLUMNS = ['Set ID', 'Part ID', 'Name', 'Image Link', 'Quantity', 'Availability', 'Comment'];

function doGet(e) {
  const p = (e && e.parameter) || {};
  const data = p.parts ? readParts_(String(p.parts).trim()) : readCollection_();
  const payload = JSON.stringify(data);
  const cb = p.callback;
  if (cb && /^[A-Za-z_$][\w$.]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + payload + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function norm_(s) { return String(s).toLowerCase().replace(/\s+/g, ' ').trim(); }

function sheetByGid_(gid) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets().find(function (s) { return s.getSheetId() === gid; });
}

function pick_(values, columns, keep) {
  const header = (values[0] || []).map(norm_);
  const idx = columns.map(function (c) { return header.indexOf(norm_(c)); });
  return values.slice(1)
    .filter(keep || function () { return true; })
    .map(function (r) { return idx.map(function (i) { return i < 0 ? '' : r[i]; }); })
    .filter(function (r) { return r[0] || r[1]; });
}

function readCollection_() {
  const sheet = sheetByGid_(SHEET_GID) || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const values = sheet.getDataRange().getDisplayValues();
  return {
    header: PUBLIC_COLUMNS, rows: pick_(values, PUBLIC_COLUMNS),
    minifigs: readMinifigs_(),
    generatedAt: new Date().toISOString(),
  };
}

function readMinifigs_() {
  const sheet = sheetByGid_(MINIFIG_GID);
  if (!sheet) return { header: MINIFIG_COLUMNS, rows: [] };
  return { header: MINIFIG_COLUMNS, rows: pick_(sheet.getDataRange().getDisplayValues(), MINIFIG_COLUMNS) };
}

function readParts_(setId) {
  const sheet = sheetByGid_(PARTS_GID);
  if (!sheet) return { header: PARTS_COLUMNS, rows: [], set: setId };
  const values = sheet.getDataRange().getDisplayValues();
  const iSet = (values[0] || []).map(norm_).indexOf('set id');
  const rows = pick_(values, PARTS_COLUMNS, function (r) { return String(r[iSet]).trim() === setId; });
  return { header: PARTS_COLUMNS, rows: rows, set: setId, generatedAt: new Date().toISOString() };
}

/** Для проверки из редактора: Выполнить → testRead */
function testRead() {
  const data = readCollection_();
  Logger.log(data.rows.length + ' rows; first: ' + JSON.stringify(data.rows[0]));
  Logger.log(data.minifigs.rows.length + ' minifigs; first: ' + JSON.stringify(data.minifigs.rows[0]));
  const parts = readParts_(String(data.rows[0][0]));
  Logger.log(parts.rows.length + ' parts for ' + data.rows[0][0]);
}
