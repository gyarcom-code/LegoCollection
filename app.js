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
  };

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
        route({ keepScroll: silent, refresh: true });
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
    if (h.startsWith('set/')) return { view: 'set', uid: h.slice(4) };
    if (h.startsWith('c/')) return { view: 'list', cat: h.slice(2) };
    return { view: 'list', cat: '' };
  }
  const catHref = (path) => '#/c/' + encodeURIComponent(path);
  const setHref = (uid) => '#/set/' + encodeURIComponent(uid);

  let lastListHash = '#/';
  let prevView = null;
  const scrollMemo = {}; // позиция прокрутки для каждого списка (hash → scrollY)
  let listScrollY = 0;   // последняя позиция прокрутки на странице списка

  window.addEventListener('scroll', () => {
    if (prevView === 'list') listScrollY = window.scrollY;
    toTopEl.classList.toggle('show', window.scrollY > 500);
  }, { passive: true });

  function route({ keepScroll = false, refresh = false } = {}) {
    if (!state.tree) return;
    const r = parseHash();
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
    if (e.target.closest('.tree__link')) closeSidebar();
  });

  /* ---------- Years block ---------- */
  function renderYears(counts, total) {
    const keys = [...counts.keys()].sort((a, b) => (a === 'none') - (b === 'none') || b.localeCompare(a));
    yearsEl.innerHTML = `
      <div class="years__head">
        <h2>${esc(t('years'))}</h2>
        ${state.year ? `<button type="button" class="years__reset" data-year="">${esc(t('allYears'))}</button>` : ''}
      </div>
      <div class="years__list">
        <button type="button" class="year${!state.year ? ' active' : ''}" data-year="">${esc(t('allYears'))} <span>${total}</span></button>
        ${keys.map((y) => `<button type="button" class="year${state.year === y ? ' active' : ''}${counts.get(y) ? '' : ' year--empty'}" data-year="${esc(y)}">${esc(y === 'none' ? t('yearNone') : y)} <span>${counts.get(y)}</span></button>`).join('')}
      </div>`;
  }

  yearsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-year]');
    if (!b) return;
    state.year = b.dataset.year;
    closeSidebar();
    if (parseHash().view === 'set') { location.hash = lastListHash; return; }
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
    const reset = $('#resetFilters');
    if (reset) reset.onclick = () => { state.cond = ''; state.year = ''; renderList(cat, true); };
    if (!keepScroll) window.scrollTo({ top: 0, behavior: 'instant' });
  }

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
            ${fact(t('pieces'), it.pcs)}
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
      if (r.view === 'set') { location.hash = lastListHash; return; }
      renderList(r.cat || '', true);
    }, 120);
  });

  /* ---------- Mobile sidebar ---------- */
  const toggle = $('#treeToggle');
  function openSidebar() { sidebar.classList.add('open'); backdrop.hidden = false; toggle.setAttribute('aria-expanded', 'true'); }
  function closeSidebar() { sidebar.classList.remove('open'); backdrop.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
  toggle.onclick = openSidebar;
  $('#treeClose').onclick = closeSidebar;
  backdrop.onclick = closeSidebar;

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
