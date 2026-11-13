/* Lego Collection — каталог, данные читаются вживую из Google Таблицы */
(() => {
  'use strict';

  const CONFIG = {
    // URL веб-приложения Google Apps Script (apps-script/Code.gs): таблица остаётся приватной
    apiUrl: 'https://script.google.com/macros/s/AKfycbwzN0VywjKz71GJrPJcM0DTfP5zHg3VwRyQTiVi54S13Ig6mpeEPqpjKn7N56pd05BZ/exec',
    // Запасной вариант, если apiUrl пуст: таблица должна быть открыта «всем, у кого есть ссылка»
    sheetId: '1kcXDNkNGZQBX0QCm13GXOpKN0dYYLC2aKXu1_mah4Ho',
    gid: '786177254',
    currency: '₴',            // валюта колонок «Price on BrickLink / BrickOwl»
    autoRefreshMs: 2 * 60e3,  // фоновое обновление
    focusRefreshMs: 30e3,     // при возврате на вкладку, если прошло больше
    defaultLang: 'ua',
  };

  /* ---------- i18n ---------- */
  const I18N = {
    ua: {
      htmlLang: 'uk', locale: 'uk-UA', title: 'Lego Collection — каталог',
      allSets: 'Усі набори', noCategory: 'Без категорії',
      loading: 'Завантажую колекцію з таблиці…', loadError: 'Не вдалося завантажити колекцію.', retry: 'Повторити',
      updating: 'Оновлюю…', updateError: 'Помилка оновлення', synced: 'Синхронізовано о {t}', refresh: 'Оновити',
      categories: 'Категорії', close: 'Закрити', searchPh: 'Пошук за назвою або номером набору', home: 'На головну',
      footer: 'Дані беруться напряму з Google Таблиці під час кожного відкриття сторінки. LEGO® — торговельна марка LEGO Group; сайт не пов’язаний з LEGO Group.',
      sortLabel: 'Сортування', sort_default: 'Як у таблиці', sort_name: 'За назвою', sort_number: 'За номером',
      sort_yearDesc: 'Рік: спочатку новіші', sort_yearAsc: 'Рік: спочатку старіші', sort_priceDesc: 'Спочатку дорогі',
      sort_priceAsc: 'Спочатку дешеві', sort_pcsDesc: 'Більше деталей',
      conditionLabel: 'Стан:', all: 'Усі', sets: ['набір', 'набори', 'наборів'], byQuery: ' за запитом «{q}»', searchAll: 'шукати в усіх',
      nothingFound: 'Нічого не знайдено. Спробуйте інший запит або категорію.', noneInFilter: 'Немає наборів за обраними фільтрами.', resetFilters: 'Скинути фільтри',
      cond_new_sealed: 'Новий, запечатаний', cond_new: 'Новий', cond_used_complete: 'Вживаний, повний', cond_used_incomplete: 'Вживаний, неповний', cond_none: 'Не вказано',
      back: '← До каталогу', setNo: 'Набір №', year: 'Рік', pieces: 'Деталей', minifigs: 'Чоловічків',
      conditionTitle: 'Стан', notSpecified: 'не вказано', completeness: 'Комплектація', instruction: 'Інструкція', box: 'Коробка',
      yes: 'є', no: 'немає', unknown: 'невідомо', prices: 'Ціна на майданчиках', noLink: 'немає посилання', noPrice: 'ціну не вказано',
      pricesUpdated: 'Ціни оновлено:', comment: 'Коментар:',
      prevPhoto: 'Попереднє фото', nextPhoto: 'Наступне фото', fullscreen: 'Відкрити на весь екран', photoN: 'Фото {n}',
      scrollLeft: 'Прокрутити ліворуч', scrollRight: 'Прокрутити праворуч', viewPhoto: 'Перегляд фото', expand: 'Розгорнути',
      years: 'Рік випуску', allYears: 'Усі роки', yearNone: 'Без року', toTop: 'Нагору', filterCondAria: 'Фільтр за станом', lang: 'Мова',
      partsLink: 'Список деталей', partsTitle: 'Деталі набору', backToSet: '← До набору', partsLoading: 'Завантажую список деталей…',
      partsEmpty: 'Список деталей для цього набору ще не заповнено.', partsError: 'Не вдалося завантажити деталі.',
      lots: 'Позицій', piecesTotal: 'Деталей', have: 'Є', missing: 'Немає', partsSearch: 'Пошук деталі за назвою або номером',
      partsNothing: 'Нічого не знайдено.', partId: 'Номер', qtyShort: 'шт.', availUnknown: 'Не вказано',
      filters: 'Фільтри', condition: 'Стан', showN: 'Показати {n}', resetAll: 'Скинути все',
    },
    en: {
      htmlLang: 'en', locale: 'en-GB', title: 'Lego Collection — catalog',
      allSets: 'All sets', noCategory: 'No category',
      loading: 'Loading the collection from the sheet…', loadError: 'Couldn’t load the collection.', retry: 'Retry',
      updating: 'Updating…', updateError: 'Update failed', synced: 'Synced at {t}', refresh: 'Refresh',
      categories: 'Categories', close: 'Close', searchPh: 'Search by set name or number', home: 'Home',
      footer: 'Data is loaded directly from a Google Sheet every time the page opens. LEGO® is a trademark of the LEGO Group; this site is not affiliated with the LEGO Group.',
      sortLabel: 'Sort by', sort_default: 'As in the sheet', sort_name: 'Name', sort_number: 'Set number',
      sort_yearDesc: 'Year: newest first', sort_yearAsc: 'Year: oldest first', sort_priceDesc: 'Price: high to low',
      sort_priceAsc: 'Price: low to high', sort_pcsDesc: 'Most pieces',
      conditionLabel: 'Condition:', all: 'All', sets: ['set', 'sets'], byQuery: ' for “{q}”', searchAll: 'search everywhere',
      nothingFound: 'Nothing found. Try another search or category.', noneInFilter: 'No sets match the selected filters.', resetFilters: 'Reset filters',
      cond_new_sealed: 'New, sealed', cond_new: 'New', cond_used_complete: 'Used, complete', cond_used_incomplete: 'Used, incomplete', cond_none: 'Not specified',
      back: '← Back to catalog', setNo: 'Set #', year: 'Year', pieces: 'Pieces', minifigs: 'Minifigures',
      conditionTitle: 'Condition', notSpecified: 'not specified', completeness: 'Contents', instruction: 'Instructions', box: 'Box',
      yes: 'yes', no: 'no', unknown: 'unknown', prices: 'Marketplace prices', noLink: 'no link', noPrice: 'no price',
      pricesUpdated: 'Prices updated:', comment: 'Comment:',
      prevPhoto: 'Previous photo', nextPhoto: 'Next photo', fullscreen: 'Open fullscreen', photoN: 'Photo {n}',
      scrollLeft: 'Scroll left', scrollRight: 'Scroll right', viewPhoto: 'Photo viewer', expand: 'Expand',
      years: 'Release year', allYears: 'All years', yearNone: 'No year', toTop: 'Back to top', filterCondAria: 'Filter by condition', lang: 'Language',
      partsLink: 'Parts list', partsTitle: 'Set parts', backToSet: '← Back to set', partsLoading: 'Loading the parts list…',
      partsEmpty: 'The parts list for this set hasn’t been filled in yet.', partsError: 'Couldn’t load the parts.',
      lots: 'Lots', piecesTotal: 'Pieces', have: 'Have', missing: 'Missing', partsSearch: 'Search parts by name or number',
      partsNothing: 'Nothing found.', partId: 'Part', qtyShort: 'pcs', availUnknown: 'Not specified',
      filters: 'Filters', condition: 'Condition', showN: 'Show {n}', resetAll: 'Reset all',
    },
    ru: {
      htmlLang: 'ru', locale: 'ru-RU', title: 'Lego Collection — каталог',
      allSets: 'Все наборы', noCategory: 'Без категории',
      loading: 'Загружаю коллекцию из таблицы…', loadError: 'Не удалось загрузить коллекцию.', retry: 'Повторить',
      updating: 'Обновляю…', updateError: 'Ошибка обновления', synced: 'Синхронизировано в {t}', refresh: 'Обновить',
      categories: 'Категории', close: 'Закрыть', searchPh: 'Поиск по названию или номеру набора', home: 'На главную',
      footer: 'Данные берутся напрямую из Google Таблицы при каждом открытии страницы. LEGO® — товарный знак LEGO Group; сайт не связан с LEGO Group.',
      sortLabel: 'Сортировка', sort_default: 'Как в таблице', sort_name: 'По названию', sort_number: 'По номеру',
      sort_yearDesc: 'Год: сначала новее', sort_yearAsc: 'Год: сначала старее', sort_priceDesc: 'Сначала дорогие',
      sort_priceAsc: 'Сначала дешёвые', sort_pcsDesc: 'Больше деталей',
      conditionLabel: 'Состояние:', all: 'Все', sets: ['набор', 'набора', 'наборов'], byQuery: ' по запросу «{q}»', searchAll: 'искать во всех',
      nothingFound: 'Ничего не найдено. Попробуйте другой запрос или категорию.', noneInFilter: 'Нет наборов по выбранным фильтрам.', resetFilters: 'Сбросить фильтры',
      cond_new_sealed: 'Новый, запечатан', cond_new: 'Новый', cond_used_complete: 'Б/у, полный', cond_used_incomplete: 'Б/у, неполный', cond_none: 'Не указано',
      back: '← К каталогу', setNo: 'Набор №', year: 'Год', pieces: 'Деталей', minifigs: 'Человечков',
      conditionTitle: 'Состояние', notSpecified: 'не указано', completeness: 'Комплектация', instruction: 'Инструкция', box: 'Коробка',
      yes: 'есть', no: 'нет', unknown: 'неизвестно', prices: 'Цена на площадках', noLink: 'нет ссылки', noPrice: 'цена не указана',
      pricesUpdated: 'Цены обновлены:', comment: 'Комментарий:',
      prevPhoto: 'Предыдущее фото', nextPhoto: 'Следующее фото', fullscreen: 'Открыть на весь экран', photoN: 'Фото {n}',
      scrollLeft: 'Прокрутить влево', scrollRight: 'Прокрутить вправо', viewPhoto: 'Просмотр фото', expand: 'Развернуть',
      years: 'Год выпуска', allYears: 'Все годы', yearNone: 'Без года', toTop: 'Наверх', filterCondAria: 'Фильтр по состоянию', lang: 'Язык',
      partsLink: 'Список деталей', partsTitle: 'Детали набора', backToSet: '← К набору', partsLoading: 'Загружаю список деталей…',
      partsEmpty: 'Список деталей для этого набора ещё не заполнен.', partsError: 'Не удалось загрузить детали.',
      lots: 'Позиций', piecesTotal: 'Деталей', have: 'Есть', missing: 'Нет', partsSearch: 'Поиск детали по названию или номеру',
      partsNothing: 'Ничего не найдено.', partId: 'Номер', qtyShort: 'шт.', availUnknown: 'Не указано',
      filters: 'Фильтры', condition: 'Состояние', showN: 'Показать {n}', resetAll: 'Сбросить всё',
    },
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };
  let lang = I18N[store.get('lc-lang')] ? store.get('lc-lang') : CONFIG.defaultLang;
  const t = (key, vars) => {
    let s = (I18N[lang] && I18N[lang][key]) ?? I18N.ru[key] ?? key;
    if (vars && typeof s === 'string') for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  };
  function plural(n) {
    const f = t('sets');
    if (f.length === 2) return n === 1 ? f[0] : f[1];
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return f[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return f[1];
    return f[2];
  }

  // Колонки ищутся по заголовку, поэтому порядок в таблице можно менять
  const COLUMNS = {
    id: ['set id', 'id', 'номер'],
    name: ['set name', 'name', 'название'],
    condition: ['condition', 'состояние'],
    category: ['category/seria', 'category', 'категория'],
    mainPhoto: ['main photo', 'главное фото'],
    photos: ['photos', 'фото'],
    year: ['creation date', 'year', 'год'],
    blLink: ['link to bricklink'],
    blPrice: ['price on bricklink'],
    boLink: ['link to brickowl'],
    boPrice: ['price on brickowl'],
    updated: ['date of update', 'дата обновления'],
    pcs: ['pcs', 'pieces', 'детали'],
    minifigs: ['minifigures in set', 'minifigures', 'человечки'],
    instruction: ['instruction', 'инструкция'],
    box: ['box', 'коробка'],
    comment: ['comment', 'комментарий'],
  };

  const CONDITIONS = {
    'new (sealed)': { key: 'cond_new_sealed', cls: 'new' },
    'new': { key: 'cond_new', cls: 'new' },
    'used (complete)': { key: 'cond_used_complete', cls: 'used' },
    'used (incomplete)': { key: 'cond_used_incomplete', cls: 'incomplete' },
  };
  const NO_CAT = '\u0000nocat';

  const $ = (s, el = document) => el.querySelector(s);
  const content = $('#content');
  const treeEl = $('#tree');
  const yearsEl = $('#years');
  const syncEl = $('#sync');
  const searchEl = $('#search');
  const sidebar = $('#sidebar');
  const backdrop = $('#backdrop');
  const langEl = $('#lang');
  const toTopEl = $('#toTop');

  const state = {
    items: [],
    byUid: new Map(),
    tree: null,
    loadedAt: 0,
    loading: false,
    syncMsg: '',
    query: '',
    sort: 'priceDesc',
    cond: '', // фильтр по состоянию ('' — все)
    year: '', // фильтр по году ('' — все, 'none' — без года)
    openNodes: new Set(),
    signature: '',
    // свёрнутые блоки боковой панели (запоминаются в браузере)
    collapsed: (() => { try { return JSON.parse(localStorage.getItem('lc-collapsed')) || {}; } catch (e) { return {}; } })(),
  };
  const CHEV = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4z"/></svg>';
  function setCollapsed(block, value) {
    state.collapsed[block] = value;
    store.set('lc-collapsed', JSON.stringify(state.collapsed));
  }

  /* ---------- Utils ---------- */
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s ?? '').toLowerCase().replace(/ё/g, 'е').trim();
  const num = (v) => {
    const s = String(v ?? '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
    if (!s) return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };
  const money = (n) => n == null ? '' : n.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ' + CONFIG.currency;
  const isUrl = (s) => /^https?:\/\//i.test(String(s || '').trim());
  const catLabel = (name) => (name === NO_CAT ? t('noCategory') : name);
  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90"><rect width="120" height="90" fill="#f2f2f2"/><g fill="#d9d9d9"><rect x="35" y="38" width="50" height="28" rx="4"/><rect x="42" y="30" width="12" height="10" rx="2"/><rect x="66" y="30" width="12" height="10" rx="2"/></g></svg>');

  function parseCSV(text) {
    const rows = []; let row = []; let f = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== '\r') f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  /* ---------- Data loading (live) ---------- */
  function sheetUrl(extra) {
    return `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?gid=${CONFIG.gid}&headers=1&${extra}`;
  }

  async function fetchCsv() {
    const res = await fetch(sheetUrl(`tqx=out:csv&_=${Date.now()}`), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (/^\s*</.test(text)) throw new Error('Sheet is not public');
    return parseCSV(text);
  }

  const hasApi = () => /^https:\/\/script\.google(usercontent)?\.com\//.test(CONFIG.apiUrl);
  const apiUrl = (extra = '') => CONFIG.apiUrl + (CONFIG.apiUrl.includes('?') ? '&' : '?') + '_=' + Date.now() + extra;

  async function fetchApi() {
    // credentials: 'omit' — запрос как от анонимного посетителя (без cookies Google)
    const res = await fetch(apiUrl(), { cache: 'no-store', redirect: 'follow', credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return [data.header, ...data.rows];
  }

  // Произвольный запрос к API: сначала fetch без cookies, затем JSONP
  async function apiGet(params) {
    const qs = Object.entries(params).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('');
    try {
      const res = await fetch(apiUrl(qs), { cache: 'no-store', redirect: 'follow', credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      return new Promise((resolve, reject) => {
        const cb = '__legoApi' + Date.now() + Math.floor(Math.random() * 1e4);
        const s = document.createElement('script');
        const timer = setTimeout(() => { cleanup(); reject(new Error('Timeout')); }, 25000);
        function cleanup() { clearTimeout(timer); delete window[cb]; s.remove(); }
        window[cb] = (data) => { cleanup(); resolve(data); };
        s.src = apiUrl(qs + '&callback=' + cb);
        s.onerror = () => { cleanup(); reject(new Error('Network error')); };
        document.head.appendChild(s);
      });
    }
  }

  // Запасной путь без CORS: JSONP
  function fetchApiJsonp() {
    return new Promise((resolve, reject) => {
      const cb = '__legoApi' + Date.now();
      const s = document.createElement('script');
      const timer = setTimeout(() => { cleanup(); reject(new Error('Timeout')); }, 25000);
      function cleanup() { clearTimeout(timer); delete window[cb]; s.remove(); }
      window[cb] = (data) => { cleanup(); data && data.rows ? resolve([data.header, ...data.rows]) : reject(new Error('Empty API response')); };
      s.src = apiUrl('&callback=' + cb);
      s.onerror = () => { cleanup(); reject(new Error('Network error')); };
      document.head.appendChild(s);
    });
  }

  // Запасной путь без CORS: JSONP-ответ Google Visualization API
  function fetchJsonp() {
    return new Promise((resolve, reject) => {
      const cb = '__legoCb' + Date.now();
      const s = document.createElement('script');
      const timer = setTimeout(() => { cleanup(); reject(new Error('Timeout')); }, 20000);
      function cleanup() { clearTimeout(timer); delete window[cb]; s.remove(); }
      window[cb] = (resp) => {
        cleanup();
        if (!resp || resp.status === 'error') return reject(new Error('Google Sheets error'));
        const tb = resp.table;
        const header = tb.cols.map((c) => c.label || '');
        const rows = tb.rows.map((r) => r.c.map((cell) => (cell ? (cell.f ?? cell.v ?? '') : '')).map(String));
        resolve([header, ...rows]);
      };
      s.src = sheetUrl(`tqx=out:json;responseHandler:${cb}&_=${Date.now()}`);
      s.onerror = () => { cleanup(); reject(new Error('Network error')); };
      document.head.appendChild(s);
    });
  }

  function toItems(rows) {
    const header = (rows[0] || []).map(norm);
    const idx = {};
    for (const [key, names] of Object.entries(COLUMNS)) {
      let i = -1;
      for (const n of names) { i = header.findIndex((h) => h === n); if (i >= 0) break; }
      if (i < 0) for (const n of names) { i = header.findIndex((h) => h.startsWith(n)); if (i >= 0) break; }
      idx[key] = i;
    }
    const seen = {};
    const items = [];
    rows.slice(1).forEach((r, rowIndex) => {
      const get = (k) => (idx[k] >= 0 ? String(r[idx[k]] ?? '').trim() : '');
      const id = get('id');
      const name = get('name');
      if (!id && !name) return;
      const base = (id || 'set').replace(/[^\w-]/g, '') || 'set';
      seen[base] = (seen[base] || 0) + 1;
      const uid = seen[base] > 1 ? `${base}-${seen[base]}` : base;

      const main = get('mainPhoto');
      const extra = get('photos').split(/[;\n]+/).map((s) => s.trim()).filter(isUrl);
      const photos = [...new Set([main, ...extra].filter(isUrl))];
      const catPath = get('category').split('>').map((s) => s.trim()).filter(Boolean);
      const year = get('year');
      const ym = year.match(/\b(19|20)\d{2}\b/);

      items.push({
        uid, id, name, rowIndex,
        condition: get('condition'),
        catPath: catPath.length ? catPath : [NO_CAT],
        photos,
        year,
        yearKey: ym ? ym[0] : 'none',
        blLink: isUrl(get('blLink')) ? get('blLink') : '',
        blPrice: num(get('blPrice')),
        boLink: isUrl(get('boLink')) ? get('boLink') : '',
        boPrice: num(get('boPrice')),
        updated: get('updated'),
        pcs: get('pcs'),
        minifigs: get('minifigs'),
        instruction: get('instruction'),
        box: get('box'),
        comment: get('comment'),
        search: norm(`${id} ${name} ${catPath.join(' ')}`),
      });
    });
    return items;
  }

  function buildTree(items) {
    const root = { name: '', path: '', children: new Map(), count: 0 };
    for (const it of items) {
      root.count++;
      let node = root;
      it.catPath.forEach((part, i) => {
        if (!node.children.has(part)) {
          node.children.set(part, { name: part, path: it.catPath.slice(0, i + 1).join(' > '), children: new Map(), count: 0 });
        }
        node = node.children.get(part);
        node.count++;
      });
    }
    return root;
  }

  async function load({ silent = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    renderSync('updating');
    try {
      let rows;
      if (hasApi()) {
        try { rows = await fetchApi(); } catch (e) { console.warn(e); rows = await fetchApiJsonp(); }
      } else {
        try { rows = await fetchCsv(); } catch (e) { rows = await fetchJsonp(); }
      }
      const items = toItems(rows);
      const signature = JSON.stringify(rows);
      state.loadedAt = Date.now();
      if (signature !== state.signature) {
        state.signature = signature;
        state.items = items;
        state.byUid = new Map(items.map((it) => [it.uid, it]));
        state.tree = buildTree(items);
        renderTree();
        route({ keepScroll: silent, refresh: true, data: true });
      }
      renderSync();
    } catch (err) {
      console.error(err);
      if (!state.items.length) {
        content.innerHTML = `<div class="state state--error"><p><b>${esc(t('loadError'))}</b><br>${esc(err.message)}</p><button type="button" id="retry">${esc(t('retry'))}</button></div>`;
        $('#retry').onclick = () => load();
      }
      renderSync('updateError');
    } finally {
      state.loading = false;
    }
  }

  function renderSync(msgKey) {
    if (msgKey !== undefined) state.syncMsg = msgKey;
    else state.syncMsg = '';
    const time = state.loadedAt ? new Date(state.loadedAt).toLocaleTimeString(t('locale'), { hour: '2-digit', minute: '2-digit' }) : '—';
    syncEl.innerHTML = `<span>${esc(state.syncMsg ? t(state.syncMsg) : t('synced', { t: time }))}</span><button type="button" id="refresh">${esc(t('refresh'))}</button>`;
    $('#refresh').onclick = () => load({ silent: true });
  }

  /* ---------- Routing (+ запоминание прокрутки списка) ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    if (h.startsWith('set/')) {
      const rest = h.slice(4);
      if (rest.endsWith('/parts')) return { view: 'parts', uid: rest.slice(0, -6) };
      return { view: 'set', uid: rest };
    }
    if (h.startsWith('c/')) return { view: 'list', cat: h.slice(2) };
    return { view: 'list', cat: '' };
  }
  const catHref = (path) => '#/c/' + encodeURIComponent(path);
  const setHref = (uid) => '#/set/' + encodeURIComponent(uid);
  const partsHref = (uid) => '#/set/' + encodeURIComponent(uid) + '/parts';

  let lastListHash = '#/';
  let prevView = null;
  const scrollMemo = {}; // позиция прокрутки для каждого списка (hash → scrollY)
  let listScrollY = 0;   // последняя позиция прокрутки на странице списка

  window.addEventListener('scroll', () => {
    if (prevView === 'list') listScrollY = window.scrollY;
    toTopEl.classList.toggle('show', window.scrollY > 500);
  }, { passive: true });

  function route({ keepScroll = false, refresh = false, data = false } = {}) {
    if (!state.tree) return;
    const r = parseHash();
    if (r.view === 'parts') {
      const it = state.byUid.get(r.uid);
      if (it) {
        if (data && prevView === 'parts') return; // фоновое обновление каталога не сбрасывает страницу деталей
        if (prevView === 'list') scrollMemo[lastListHash] = listScrollY;
        renderParts(it, keepScroll);
        markActive(it.catPath.join(' > '), true);
        prevView = 'parts';
        return;
      }
    }
    if (r.view === 'set') {
      const it = state.byUid.get(r.uid);
      if (it) {
        if (prevView === 'list') scrollMemo[lastListHash] = listScrollY;
        renderProduct(it, keepScroll);
        markActive(it.catPath.join(' > '), true);
        prevView = 'set';
        return;
      }
    }
    const hash = location.hash || '#/';
    const restore = !refresh && prevView === 'set' && scrollMemo[hash] != null;
    lastListHash = hash;
    renderList(r.cat || '', keepScroll || restore);
    markActive(r.cat || '', true);
    if (restore) {
      const y = scrollMemo[hash];
      window.scrollTo({ top: y, behavior: 'instant' });
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' }));
      listScrollY = y;
    }
    prevView = 'list';
  }

  /* ---------- Tree ---------- */
  const CARET = '<svg viewBox="0 0 10 10"><path d="M3 1l5 4-5 4z"/></svg>';
  const sortNodes = (m) => [...m.values()].sort((a, b) => (a.name === NO_CAT) - (b.name === NO_CAT) || a.name.localeCompare(b.name, t('locale')));

  function nodeHtml(node) {
    const kids = sortNodes(node.children);
    const open = state.openNodes.has(node.path) ? ' open' : '';
    return `<li class="${open.trim()}" data-path="${esc(node.path)}">
      <div class="tree__row">
        ${kids.length ? `<button class="tree__caret" type="button" aria-label="${esc(t('expand'))}">${CARET}</button>` : '<span class="tree__caret tree__caret--empty"></span>'}
        <a class="tree__link" href="${catHref(node.path)}" data-path="${esc(node.path)}"><span>${esc(catLabel(node.name))}</span><span class="tree__count">${node.count}</span></a>
      </div>
      ${kids.length ? `<ul>${kids.map(nodeHtml).join('')}</ul>` : ''}
    </li>`;
  }

  function renderTree() {
    const tr = state.tree;
    if (!tr) return;
    treeEl.innerHTML = `<ul>
      <li><div class="tree__row tree__all"><a class="tree__link" href="#/" data-path=""><span>${esc(t('allSets'))}</span><span class="tree__count">${tr.count}</span></a></div></li>
      ${sortNodes(tr.children).map(nodeHtml).join('')}
    </ul>`;
  }

  function markActive(path, expand) {
    treeEl.querySelectorAll('.tree__link.active').forEach((a) => a.classList.remove('active'));
    const link = [...treeEl.querySelectorAll('.tree__link')].find((a) => a.dataset.path === path);
    if (!link) return;
    link.classList.add('active');
    if (expand && path) {
      const parts = path.split(' > ');
      for (let i = 1; i <= parts.length; i++) {
        const p = parts.slice(0, i).join(' > ');
        state.openNodes.add(p);
        const li = [...treeEl.querySelectorAll('li[data-path]')].find((el) => el.dataset.path === p);
        if (li) li.classList.add('open');
      }
    }
  }

  treeEl.addEventListener('click', (e) => {
    const caret = e.target.closest('.tree__caret:not(.tree__caret--empty)');
    if (caret) {
      const li = caret.closest('li');
      li.classList.toggle('open');
      const p = li.dataset.path;
      li.classList.contains('open') ? state.openNodes.add(p) : state.openNodes.delete(p);
      return;
    }
  });

  /* ---------- Years block ---------- */
  function renderYears(counts, total) {
    const keys = [...counts.keys()].sort((a, b) => (a === 'none') - (b === 'none') || b.localeCompare(a));
    const open = !state.collapsed.years;
    yearsEl.classList.toggle('years--open', open);
    yearsEl.innerHTML = `
      <div class="panel__head">
        <button type="button" class="block-toggle" id="yearsToggle" aria-expanded="${open}">
          <h2>${esc(t('years'))}${state.year ? `: <span class="years__current">${esc(state.year === 'none' ? t('yearNone') : state.year)}</span>` : ''}</h2>${CHEV}
        </button>
        ${state.year ? `<button type="button" class="years__reset" data-year="" aria-label="${esc(t('allYears'))}" title="${esc(t('allYears'))}">✕</button>` : ''}
      </div>
      <div class="years__body">
        <div class="years__list">
          <button type="button" class="year${!state.year ? ' active' : ''}" data-year="">${esc(t('allYears'))} <span>${total}</span></button>
          ${keys.map((y) => `<button type="button" class="year${state.year === y ? ' active' : ''}${counts.get(y) ? '' : ' year--empty'}" data-year="${esc(y)}">${esc(y === 'none' ? t('yearNone') : y)} <span>${counts.get(y)}</span></button>`).join('')}
        </div>
      </div>`;
  }

  yearsEl.addEventListener('click', (e) => {
    const tg = e.target.closest('#yearsToggle');
    if (tg) {
      const open = tg.getAttribute('aria-expanded') !== 'true';
      setCollapsed('years', !open);
      tg.setAttribute('aria-expanded', String(open));
      yearsEl.classList.toggle('years--open', open);
      return;
    }
    const b = e.target.closest('[data-year]');
    if (!b) return;
    state.year = b.dataset.year;
    if (parseHash().view !== 'list') { location.hash = lastListHash; return; }
    renderList(parseHash().cat || '', true);
  });

  /* ---------- Catalog list ---------- */
  const SORTS = {
    default: (a, b) => a.rowIndex - b.rowIndex,
    name: (a, b) => a.name.localeCompare(b.name, t('locale')),
    number: (a, b) => (num(a.id) ?? 0) - (num(b.id) ?? 0),
    yearDesc: (a, b) => (num(b.year) ?? 0) - (num(a.year) ?? 0),
    yearAsc: (a, b) => (num(a.year) ?? 9999) - (num(b.year) ?? 9999),
    priceDesc: (a, b) => (priceOf(b) ?? -1) - (priceOf(a) ?? -1),
    priceAsc: (a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity),
    pcsDesc: (a, b) => (num(b.pcs) ?? -1) - (num(a.pcs) ?? -1),
  };
  const priceOf = (it) => it.blPrice ?? it.boPrice;

  function inCat(it, cat) {
    if (!cat) return true;
    const p = it.catPath.join(' > ');
    return p === cat || p.startsWith(cat + ' > ');
  }

  function matches(it, q) {
    if (!q) return true;
    return q.split(/\s+/).every((w) => it.search.includes(w));
  }

  const condKey = (it) => norm(it.condition) || 'none';
  const condMeta = (k) => {
    if (CONDITIONS[k]) return { label: t(CONDITIONS[k].key), cls: CONDITIONS[k].cls };
    if (k === 'none') return { label: t('cond_none'), cls: 'other' };
    return { label: (state.items.find((it) => condKey(it) === k) || {}).condition || k, cls: 'other' };
  };

  function conditionBadge(c) {
    if (!c) return '';
    const m = condMeta(norm(c));
    return `<span class="badge badge--${m.cls}" title="${esc(c)}">${esc(m.label)}</span>`;
  }

  function cardHtml(it) {
    const img = it.photos[0] || PLACEHOLDER;
    const price = priceOf(it);
    return `<a class="card" href="${setHref(it.uid)}">
      <div class="card__img"><img src="${esc(img)}" alt="${esc(it.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER}'"></div>
      <div class="card__body">
        <div class="card__num">${esc(it.id)}</div>
        <div class="card__name">${esc(it.name)}</div>
        <div>${conditionBadge(it.condition)}</div>
        <div class="card__foot"><span class="card__year">${esc(it.year)}</span><span class="card__price">${esc(money(price))}</span></div>
      </div>
    </a>`;
  }

  function crumbsHtml(path, linkLast) {
    if (!path) return '';
    const parts = path.split(' > ');
    const links = [`<a href="#/">${esc(t('allSets'))}</a>`];
    parts.forEach((p, i) => {
      const full = parts.slice(0, i + 1).join(' > ');
      links.push(i < parts.length - 1 || linkLast ? `<a href="${catHref(full)}">${esc(catLabel(p))}</a>` : esc(catLabel(p)));
    });
    return `<div class="crumbs">${links.join(' › ')}</div>`;
  }

  function countBy(list, keyFn) {
    const m = new Map();
    list.forEach((it) => { const k = keyFn(it); m.set(k, (m.get(k) || 0) + 1); });
    return m;
  }

  function renderList(cat, keepScroll) {
    const q = norm(state.query);
    const base = state.items.filter((it) => inCat(it, cat) && matches(it, q));
    const byYear = (it) => !state.year || it.yearKey === state.year;
    const byCond = (it) => !state.cond || condKey(it) === state.cond;

    // Счётчики состояний — с учётом года; счётчики лет — с учётом состояния
    const conds = countBy(base.filter(byYear), condKey);
    if (state.cond && !conds.has(state.cond)) conds.set(state.cond, 0);
    const condOrder = Object.keys(CONDITIONS);
    const condList = [...conds.entries()].sort((a, b) => {
      const ia = condOrder.indexOf(a[0]), ib = condOrder.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a[0].localeCompare(b[0]);
    });
    const yearBase = base.filter(byCond);
    const years = countBy(yearBase, (it) => it.yearKey);
    if (state.year && !years.has(state.year)) years.set(state.year, 0);
    renderYears(years, yearBase.length);

    const list = base.filter((it) => byYear(it) && byCond(it)).sort(SORTS[state.sort] || SORTS.priceDesc);
    const title = cat ? catLabel(cat.split(' > ').pop()) : t('allSets');
    const extras = [];
    if (state.cond) extras.push(esc(condMeta(state.cond).label.toLowerCase()));
    if (state.year) extras.push(esc(state.year === 'none' ? t('yearNone').toLowerCase() : state.year));
    const meta = `${list.length} ${plural(list.length)}${extras.length ? ' · ' + extras.join(' · ') : ''}`;
    const searchNote = q ? `${esc(t('byQuery', { q: state.query }))}${cat ? ` · <a href="#/">${esc(t('searchAll'))}</a>` : ''}` : '';
    const filtered = state.cond || state.year;
    content.innerHTML = `
      <div class="toolbar">
        <div>
          ${crumbsHtml(cat, false)}
          <h1>${esc(title)}</h1>
          <div class="toolbar__meta">${meta}${searchNote}</div>
        </div>
        <label class="sort">${esc(t('sortLabel'))}
          <select id="sort">${Object.keys(SORTS).map((k) => `<option value="${k}"${k === state.sort ? ' selected' : ''}>${esc(t('sort_' + k))}</option>`).join('')}</select>
        </label>
      </div>
      <div class="filters" role="group" aria-label="${esc(t('filterCondAria'))}">
        <span class="filters__label">${esc(t('conditionLabel'))}</span>
        <button type="button" class="chip${!state.cond ? ' active' : ''}" data-cond="">${esc(t('all'))} <span>${base.filter(byYear).length}</span></button>
        ${condList.map(([k, n]) => `<button type="button" class="chip chip--${condMeta(k).cls}${state.cond === k ? ' active' : ''}" data-cond="${esc(k)}">${esc(condMeta(k).label)} <span>${n}</span></button>`).join('')}
      </div>
      ${list.length ? `<div class="grid">${list.map(cardHtml).join('')}</div>` : (filtered && base.length ? `<div class="empty">${esc(t('noneInFilter'))} <button type="button" class="link-btn" id="resetFilters">${esc(t('resetFilters'))}</button></div>` : `<div class="empty">${esc(t('nothingFound'))}</div>`)}`;
    $('#sort').onchange = (e) => { state.sort = e.target.value; renderList(cat, true); };
    content.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
      state.cond = b.dataset.cond;
      renderList(cat, true);
      const bar = content.querySelector('.filters'), chip = content.querySelector('.chip.active');
      if (bar && chip) bar.scrollLeft = chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2;
    }));
    renderDrawerExtras(cat, base.filter(byYear).length, condList, list.length);
    const reset = $('#resetFilters');
    if (reset) reset.onclick = () => { state.cond = ''; state.year = ''; renderList(cat, true); };
    if (!keepScroll) window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ---------- Drawer (мобильное окно фильтров) ---------- */
  const condPanelEl = $('#condPanel');
  const badgeEl = $('#filterBadge');
  const applyEl = $('#drawerApply');
  function renderDrawerExtras(cat, total, condList, shown) {
    condPanelEl.innerHTML = `
      <div class="panel__head"><h2>${esc(t('condition'))}</h2></div>
      <div class="cond-panel__body">
        <button type="button" class="chip${!state.cond ? ' active' : ''}" data-dcond="">${esc(t('all'))} <span>${total}</span></button>
        ${condList.map(([k, n]) => `<button type="button" class="chip chip--${condMeta(k).cls}${state.cond === k ? ' active' : ''}" data-dcond="${esc(k)}">${esc(condMeta(k).label)} <span>${n}</span></button>`).join('')}
      </div>`;
    condPanelEl.querySelectorAll('[data-dcond]').forEach((b) => b.addEventListener('click', () => {
      state.cond = b.dataset.dcond;
      renderList(cat, true);
    }));
    const active = (cat ? 1 : 0) + (state.year ? 1 : 0) + (state.cond ? 1 : 0);
    badgeEl.hidden = !active;
    badgeEl.textContent = active;
    applyEl.textContent = `${t('showN', { n: shown })} ${plural(shown)}`;
  }
  applyEl.addEventListener('click', closeSidebar);

  /* ---------- Product page ---------- */
  function yesNo(v) {
    const n = norm(v);
    if (['yes', 'да', 'есть', 'так', 'є', '+', 'true', '1'].includes(n)) return { cls: 'yes', icon: '✓', text: t('yes') };
    if (['no', 'нет', 'ні', 'немає', '-', 'false', '0'].includes(n)) return { cls: 'no', icon: '✕', text: t('no') };
    return { cls: 'unknown', icon: '?', text: t('unknown') };
  }

  function marketHtml(kind, name, link, price) {
    const logo = `<span class="market__logo market__logo--${kind}">${kind.toUpperCase()}</span>`;
    const priceHtml = price != null ? `<span class="market__price">${esc(money(price))}</span>` : `<span class="market__price"><small>${esc(t('noPrice'))}</small></span>`;
    if (link) return `<a class="market" href="${esc(link)}" target="_blank" rel="noopener"><span class="market__name">${logo}${name} ↗</span>${priceHtml}</a>`;
    if (price != null) return `<div class="market"><span class="market__name">${logo}${name}</span>${priceHtml}</div>`;
    return `<div class="market market--none"><span class="market__name">${logo}${name}</span><span>${esc(t('noLink'))}</span></div>`;
  }

  function renderProduct(it, keepScroll) {
    const photos = it.photos.length ? it.photos : [PLACEHOLDER];
    const instr = yesNo(it.instruction);
    const box = yesNo(it.box);
    const fact = (label, value) => `<div class="fact"><div class="fact__label">${esc(label)}</div><div class="fact__value">${esc(value || '—')}</div></div>`;
    const catPath = it.catPath.join(' > ');

    content.innerHTML = `
      <a class="back" href="${esc(lastListHash)}">${esc(t('back'))}</a>
      <article class="product">
        <div class="gallery">
          <div class="gallery__main">
            <img id="mainImg" src="${esc(photos[0])}" alt="${esc(it.name)}" referrerpolicy="no-referrer" title="${esc(t('fullscreen'))}">
            <span class="gallery__zoom" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z"/></svg></span>
            ${photos.length > 1 ? `<button class="gallery__nav gallery__nav--prev" type="button" aria-label="${esc(t('prevPhoto'))}">‹</button><button class="gallery__nav gallery__nav--next" type="button" aria-label="${esc(t('nextPhoto'))}">›</button>` : ''}
          </div>
          ${photos.length > 1 ? `
          <div class="carousel">
            <button class="carousel__btn" type="button" data-dir="-1" aria-label="${esc(t('scrollLeft'))}">‹</button>
            <div class="carousel__track" id="track">
              ${photos.map((p, i) => `<button class="thumb${i === 0 ? ' active' : ''}" type="button" data-i="${i}" aria-label="${esc(t('photoN', { n: i + 1 }))}"><img src="${esc(p)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER}'"></button>`).join('')}
            </div>
            <button class="carousel__btn" type="button" data-dir="1" aria-label="${esc(t('scrollRight'))}">›</button>
          </div>` : ''}
        </div>

        <div class="info">
          <div>
            <div class="info__num">${esc(t('setNo'))} ${esc(it.id)}</div>
            <h1>${esc(it.name)}</h1>
            <div class="info__cat">${crumbsHtml(catPath, true).replace('class="crumbs"', 'class="crumbs" style="margin:0"')}</div>
          </div>

          <div class="facts">
            ${fact(t('year'), it.year)}
            <a class="fact fact--link" href="${partsHref(it.uid)}"><div class="fact__label">${esc(t('pieces'))}</div><div class="fact__value">${esc(it.pcs || '—')}</div><div class="fact__more">${esc(t('partsLink'))} →</div></a>
            ${fact(t('minifigs'), it.minifigs)}
          </div>

          <div>
            <h2 class="section-title">${esc(t('conditionTitle'))}</h2>
            ${conditionBadge(it.condition) || `<span class="updated">${esc(t('notSpecified'))}</span>`}
          </div>

          <div>
            <h2 class="section-title">${esc(t('completeness'))}</h2>
            <div class="checks">
              <span class="check check--${instr.cls}"><span class="check__icon">${instr.icon}</span>${esc(t('instruction'))}: ${esc(instr.text)}</span>
              <span class="check check--${box.cls}"><span class="check__icon">${box.icon}</span>${esc(t('box'))}: ${esc(box.text)}</span>
            </div>
          </div>

          <div>
            <h2 class="section-title">${esc(t('prices'))}</h2>
            <div class="markets">
              ${marketHtml('bl', 'BrickLink', it.blLink, it.blPrice)}
              ${marketHtml('bo', 'BrickOwl', it.boLink, it.boPrice)}
            </div>
            ${it.updated ? `<p class="updated">${esc(t('pricesUpdated'))} <b>${esc(it.updated)}</b></p>` : ''}
          </div>

          ${it.comment ? `<div class="comment"><b>${esc(t('comment'))}</b> ${esc(it.comment)}</div>` : ''}
        </div>
      </article>`;

    if (!keepScroll) window.scrollTo({ top: 0, behavior: 'instant' });
    const mainImg = $('#mainImg');
    mainImg.addEventListener('error', () => { if (mainImg.src !== PLACEHOLDER) mainImg.src = PLACEHOLDER; });

    let cur = 0;
    const track = $('#track');
    const thumbs = track ? [...track.querySelectorAll('.thumb')] : [];
    const show = (i) => {
      cur = (i + photos.length) % photos.length;
      mainImg.src = photos[cur];
      thumbs.forEach((tb, k) => tb.classList.toggle('active', k === cur));
      const tb = thumbs[cur];
      if (tb) track.scrollTo({ left: tb.offsetLeft - track.clientWidth / 2 + tb.clientWidth / 2 });
      if (lightbox.isOpen()) lightbox.update(photos, cur, it.name);
    };

    // Клик по главному фото — просмотр на весь экран
    mainImg.addEventListener('click', () => lightbox.open(photos, cur, it.name, show));

    if (photos.length > 1) {
      track.addEventListener('click', (e) => { const tb = e.target.closest('.thumb'); if (tb) show(+tb.dataset.i); });
      content.querySelectorAll('.carousel__btn').forEach((b) => b.addEventListener('click', () => track.scrollBy({ left: +b.dataset.dir * track.clientWidth * 0.8 })));
      $('.gallery__nav--prev').onclick = () => show(cur - 1);
      $('.gallery__nav--next').onclick = () => show(cur + 1);
    }
    keyHandler = (e) => {
      if (document.activeElement === searchEl || photos.length < 2) return;
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    };
  }

  /* ---------- Parts page (детали набора) ---------- */
  const partsCache = new Map(); // setId → { rows, loadedAt }
  const partsState = { filter: '', query: '' };

  function availKey(v) {
    const y = yesNo(v).cls;
    return y === 'yes' ? 'have' : y === 'no' ? 'missing' : 'unknown';
  }

  function toParts(data) {
    const h = (data.header || []).map(norm);
    const col = (n) => h.indexOf(n);
    const iId = col('part id'), iName = col('name'), iImg = col('image link'), iQty = col('quantity'), iAv = col('availability'), iCom = col('comment');
    return (data.rows || []).map((r, i) => ({
      i,
      id: String(r[iId] ?? '').trim(),
      name: String(r[iName] ?? '').trim(),
      img: isUrl(r[iImg]) ? String(r[iImg]).trim() : '',
      qty: num(r[iQty]) ?? 1,
      avail: availKey(r[iAv]),
      comment: String(r[iCom] ?? '').trim(),
    })).filter((p) => p.id || p.name);
  }

  function partHtml(p) {
    const icon = p.avail === 'have' ? '✓' : p.avail === 'missing' ? '✕' : '?';
    const label = p.avail === 'have' ? t('have') : p.avail === 'missing' ? t('missing') : t('availUnknown');
    return `<div class="part part--${p.avail}">
      <span class="part__mark" title="${esc(label)}" aria-label="${esc(label)}">${icon}</span>
      <div class="part__img"><img src="${esc(p.img || PLACEHOLDER)}" alt="${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER}'"></div>
      <div class="part__body">
        <div class="part__name">${esc(p.name)}</div>
        <div class="part__meta"><span>${esc(p.id)}</span><b>× ${p.qty}</b></div>
        ${p.comment ? `<div class="part__comment">${esc(p.comment)}</div>` : ''}
      </div>
    </div>`;
  }

  function renderPartsBody(it, parts) {
    const body = $('#partsBody');
    if (!body) return;
    if (!parts.length) { body.innerHTML = `<div class="empty">${esc(t('partsEmpty'))}</div>`; return; }
    const sum = (arr) => arr.reduce((s, p) => s + p.qty, 0);
    const have = parts.filter((p) => p.avail === 'have');
    const miss = parts.filter((p) => p.avail === 'missing');
    const unk = parts.filter((p) => p.avail === 'unknown');
    const q = norm(partsState.query);
    const list = parts.filter((p) => (!partsState.filter || p.avail === partsState.filter)
      && (!q || q.split(/\s+/).every((w) => norm(`${p.id} ${p.name}`).includes(w))));
    const chip = (key, label, arr, cls) => `<button type="button" class="chip${cls ? ' chip--' + cls : ''}${partsState.filter === key ? ' active' : ''}" data-pf="${key}">${esc(label)} <span>${arr.length}</span></button>`;
    body.innerHTML = `
      <div class="parts-stats">
        <div class="fact"><div class="fact__label">${esc(t('lots'))}</div><div class="fact__value">${parts.length}</div></div>
        <div class="fact"><div class="fact__label">${esc(t('piecesTotal'))}</div><div class="fact__value">${sum(parts)}</div></div>
        <div class="fact fact--have"><div class="fact__label">✓ ${esc(t('have'))}</div><div class="fact__value">${sum(have)}</div></div>
        <div class="fact fact--missing"><div class="fact__label">✕ ${esc(t('missing'))}</div><div class="fact__value">${sum(miss)}</div></div>
      </div>
      <div class="parts-tools">
        <div class="filters">
          ${chip('', t('all'), parts, '')}
          ${chip('have', '✓ ' + t('have'), have, 'have')}
          ${chip('missing', '✕ ' + t('missing'), miss, 'missing')}
          ${unk.length ? chip('unknown', '? ' + t('availUnknown'), unk, 'unknown') : ''}
        </div>
        <input type="search" id="partsSearch" class="parts-search" placeholder="${esc(t('partsSearch'))}" value="${esc(partsState.query)}" autocomplete="off">
      </div>
      ${list.length ? `<div class="parts-grid">${list.map(partHtml).join('')}</div>` : `<div class="empty">${esc(t('partsNothing'))}</div>`}`;
    body.querySelectorAll('[data-pf]').forEach((b) => b.addEventListener('click', () => { partsState.filter = b.dataset.pf; renderPartsBody(it, parts); }));
    const ps = $('#partsSearch');
    let timer;
    ps.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        partsState.query = ps.value;
        const pos = ps.selectionStart;
        renderPartsBody(it, parts);
        const n = $('#partsSearch'); n.focus(); n.setSelectionRange(pos, pos);
      }, 150);
    });
  }

  async function renderParts(it, keepScroll) {
    partsState.filter = ''; partsState.query = '';
    content.innerHTML = `
      <a class="back" href="${setHref(it.uid)}">${esc(t('backToSet'))}</a>
      <div class="parts-head">
        <img src="${esc(it.photos[0] || PLACEHOLDER)}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
        <div>
          <div class="info__num">${esc(t('setNo'))} ${esc(it.id)}</div>
          <h1>${esc(t('partsTitle'))}</h1>
          <div class="parts-head__name">${esc(it.name)}</div>
        </div>
      </div>
      <div id="partsBody"><div class="state"><div class="loader" aria-hidden="true"><span></span><span></span><span></span></div><p>${esc(t('partsLoading'))}</p></div></div>`;
    if (!keepScroll) window.scrollTo({ top: 0, behavior: 'instant' });
    const cached = partsCache.get(it.id);
    if (cached) renderPartsBody(it, cached.rows);
    try {
      const data = await apiGet({ parts: it.id });
      const rows = toParts(data);
      partsCache.set(it.id, { rows, loadedAt: Date.now() });
      if (parseHash().view === 'parts' && parseHash().uid === it.uid) renderPartsBody(it, rows);
    } catch (err) {
      console.error(err);
      if (!cached) { const b = $('#partsBody'); if (b) b.innerHTML = `<div class="state state--error"><p><b>${esc(t('partsError'))}</b><br>${esc(err.message)}</p></div>`; }
    }
  }

  /* ---------- Lightbox (полноэкранный просмотр) ---------- */
  const lightbox = (() => {
    const el = document.createElement('div');
    el.className = 'lightbox';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `
      <div class="lightbox__top">
        <span class="lightbox__title"></span>
        <span class="lightbox__count"></span>
        <button type="button" class="lightbox__close">×</button>
      </div>
      <div class="lightbox__stage">
        <button type="button" class="lightbox__nav lightbox__nav--prev">‹</button>
        <img class="lightbox__img" alt="" referrerpolicy="no-referrer">
        <button type="button" class="lightbox__nav lightbox__nav--next">›</button>
      </div>
      <div class="lightbox__thumbs"></div>`;
    document.body.appendChild(el);
    const img = el.querySelector('.lightbox__img');
    const thumbsEl = el.querySelector('.lightbox__thumbs');
    let photos = [], idx = 0, onChange = null, open = false, touchX = null;

    function labels() {
      el.setAttribute('aria-label', t('viewPhoto'));
      el.querySelector('.lightbox__close').setAttribute('aria-label', t('close'));
      el.querySelector('.lightbox__nav--prev').setAttribute('aria-label', t('prevPhoto'));
      el.querySelector('.lightbox__nav--next').setAttribute('aria-label', t('nextPhoto'));
    }
    function render(rebuildThumbs) {
      img.src = photos[idx];
      el.querySelector('.lightbox__count').textContent = photos.length > 1 ? `${idx + 1} / ${photos.length}` : '';
      el.classList.toggle('lightbox--single', photos.length < 2);
      if (rebuildThumbs) {
        thumbsEl.innerHTML = photos.length > 1 ? photos.map((p, i) => `<button type="button" data-i="${i}" aria-label="${esc(t('photoN', { n: i + 1 }))}"><img src="${esc(p)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('') : '';
      }
      thumbsEl.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i === idx));
      const a = thumbsEl.querySelector('.active');
      if (a) thumbsEl.scrollTo({ left: a.offsetLeft - thumbsEl.clientWidth / 2 + a.clientWidth / 2 });
    }
    function go(d) { if (photos.length < 2) return; onChange ? onChange(idx + d) : (idx = (idx + d + photos.length) % photos.length, render()); }
    function close() {
      if (!open) return;
      open = false; el.hidden = true; document.body.classList.remove('no-scroll');
    }

    el.querySelector('.lightbox__close').onclick = close;
    el.querySelector('.lightbox__nav--prev').onclick = () => go(-1);
    el.querySelector('.lightbox__nav--next').onclick = () => go(1);
    el.querySelector('.lightbox__stage').addEventListener('click', (e) => { if (e.target.classList.contains('lightbox__stage')) close(); });
    thumbsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go(+b.dataset.i - idx); });
    img.addEventListener('error', () => { if (img.src !== PLACEHOLDER) img.src = PLACEHOLDER; });
    el.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (touchX == null) return;
      const dx = e.changedTouches[0].clientX - touchX; touchX = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    });

    return {
      labels,
      isOpen: () => open,
      open(list, i, title, change) {
        photos = list; idx = i; onChange = change || null; open = true;
        labels();
        el.querySelector('.lightbox__title').textContent = title || '';
        el.hidden = false; document.body.classList.add('no-scroll');
        render(true);
        el.querySelector('.lightbox__close').focus();
      },
      update(list, i) { photos = list; idx = i; render(); },
      close,
      key(e) {
        if (!open) return false;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') go(-1);
        else if (e.key === 'ArrowRight') go(1);
        else return false;
        e.preventDefault();
        return true;
      },
    };
  })();

  let keyHandler = null;
  document.addEventListener('keydown', (e) => {
    if (lightbox.key(e)) return;
    if (e.key === 'Escape') closeSidebar();
    if (keyHandler && parseHash().view === 'set') keyHandler(e);
  });

  /* ---------- Search ---------- */
  let searchTimer;
  searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = searchEl.value.trim();
      const r = parseHash();
      if (r.view === 'set' || r.view === 'parts') { location.hash = lastListHash; return; }
      renderList(r.cat || '', true);
    }, 120);
  });

  /* ---------- Mobile sidebar ---------- */
  const toggle = $('#treeToggle');
  function openSidebar() {
    sidebar.classList.add('open'); backdrop.hidden = false; toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open'); sidebar.scrollTop = 0;
  }
  function closeSidebar() {
    if (!sidebar.classList.contains('open')) return;
    sidebar.classList.remove('open'); backdrop.hidden = true; toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  }
  toggle.onclick = openSidebar;
  $('#treeClose').onclick = closeSidebar;
  backdrop.onclick = closeSidebar;

  /* ---------- Collapsible categories ---------- */
  const catsToggle = $('#catsToggle');
  function applyCatsCollapsed() {
    const open = !state.collapsed.cats;
    catsToggle.setAttribute('aria-expanded', String(open));
    sidebar.classList.toggle('cats-collapsed', !open);
  }
  catsToggle.addEventListener('click', () => { setCollapsed('cats', !state.collapsed.cats); applyCatsCollapsed(); });
  applyCatsCollapsed();

  /* ---------- Back to top ---------- */
  toTopEl.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Language ---------- */
  function applyStaticTexts() {
    document.documentElement.lang = t('htmlLang');
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    langEl.value = lang;
    lightbox.labels();
  }
  langEl.addEventListener('change', () => {
    lang = I18N[langEl.value] ? langEl.value : CONFIG.defaultLang;
    store.set('lc-lang', lang);
    applyStaticTexts();
    renderTree();
    route({ keepScroll: true, refresh: true });
    renderSync(state.syncMsg || undefined);
  });

  /* ---------- Start ---------- */
  applyStaticTexts();
  window.addEventListener('hashchange', () => { keyHandler = null; lightbox.close(); route(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - state.loadedAt > CONFIG.focusRefreshMs) load({ silent: true });
  });
  setInterval(() => { if (document.visibilityState === 'visible') load({ silent: true }); }, CONFIG.autoRefreshMs);
  load();
})();
