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
  };

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
    'new (sealed)': { label: 'Новый, запечатан', cls: 'new' },
    'new': { label: 'Новый', cls: 'new' },
    'used (complete)': { label: 'Б/у, полный', cls: 'used' },
    'used (incomplete)': { label: 'Б/у, неполный', cls: 'incomplete' },
  };

  const $ = (s, el = document) => el.querySelector(s);
  const content = $('#content');
  const treeEl = $('#tree');
  const syncEl = $('#sync');
  const searchEl = $('#search');
  const sidebar = $('#sidebar');
  const backdrop = $('#backdrop');

  const state = {
    items: [],
    byUid: new Map(),
    tree: null,
    loadedAt: 0,
    loading: false,
    query: '',
    sort: 'default',
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
    if (/^\s*</.test(text)) throw new Error('Таблица недоступна (нужен доступ «всем, у кого есть ссылка»)');
    return parseCSV(text);
  }

  const hasApi = () => /^https:\/\/script\.google(usercontent)?\.com\//.test(CONFIG.apiUrl);
  const apiUrl = (extra = '') => CONFIG.apiUrl + (CONFIG.apiUrl.includes('?') ? '&' : '?') + '_=' + Date.now() + extra;

  async function fetchApi() {
    const res = await fetch(apiUrl(), { cache: 'no-store', redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return [data.header, ...data.rows];
  }

  // Запасной путь без CORS: JSONP
  function fetchApiJsonp() {
    return new Promise((resolve, reject) => {
      const cb = '__legoApi' + Date.now();
      const s = document.createElement('script');
      const timer = setTimeout(() => { cleanup(); reject(new Error('Таймаут загрузки данных')); }, 25000);
      function cleanup() { clearTimeout(timer); delete window[cb]; s.remove(); }
      window[cb] = (data) => { cleanup(); data && data.rows ? resolve([data.header, ...data.rows]) : reject(new Error('Пустой ответ API')); };
      s.src = apiUrl('&callback=' + cb);
      s.onerror = () => { cleanup(); reject(new Error('Не удалось загрузить данные')); };
      document.head.appendChild(s);
    });
  }

  // Запасной путь без CORS: JSONP-ответ Google Visualization API
  function fetchJsonp() {
    return new Promise((resolve, reject) => {
      const cb = '__legoCb' + Date.now();
      const s = document.createElement('script');
      const timer = setTimeout(() => { cleanup(); reject(new Error('Таймаут загрузки таблицы')); }, 20000);
      function cleanup() { clearTimeout(timer); delete window[cb]; s.remove(); }
      window[cb] = (resp) => {
        cleanup();
        if (!resp || resp.status === 'error') return reject(new Error('Ошибка Google Sheets'));
        const t = resp.table;
        const header = t.cols.map((c) => c.label || '');
        const rows = t.rows.map((r) => r.c.map((cell) => (cell ? (cell.f ?? cell.v ?? '') : '')).map(String));
        resolve([header, ...rows]);
      };
      s.src = sheetUrl(`tqx=out:json;responseHandler:${cb}&_=${Date.now()}`);
      s.onerror = () => { cleanup(); reject(new Error('Не удалось загрузить таблицу')); };
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

      items.push({
        uid, id, name, rowIndex,
        condition: get('condition'),
        catPath: catPath.length ? catPath : ['Без категории'],
        photos,
        year: get('year'),
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
        search: norm(`${id} ${name}`),
      });
    });
    return items;
  }

  function buildTree(items) {
    const root = { name: 'Все наборы', path: '', children: new Map(), count: 0 };
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
    renderSync('Обновляю…');
    try {
      let rows;
      if (hasApi()) {
        // JSONP надёжнее fetch: Apps Script не всегда отдаёт CORS-заголовки (напр. при входе в несколько Google-аккаунтов)
        try { rows = await fetchApiJsonp(); } catch (e) { console.warn(e); rows = await fetchApi(); }
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
        route({ keepScroll: silent });
      }
      renderSync();
    } catch (err) {
      console.error(err);
      if (!state.items.length) {
        content.innerHTML = `<div class="state state--error"><p><b>Не удалось загрузить коллекцию.</b><br>${esc(err.message)}</p><button type="button" id="retry">Повторить</button></div>`;
        $('#retry').onclick = () => load();
      }
      renderSync('Ошибка обновления');
    } finally {
      state.loading = false;
    }
  }

  function renderSync(msg) {
    const t = state.loadedAt ? new Date(state.loadedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';
    syncEl.innerHTML = `<span>${esc(msg || `Синхронизировано в ${t}`)}</span><button type="button" id="refresh">Обновить</button>`;
    $('#refresh').onclick = () => load({ silent: true });
  }

  /* ---------- Routing ---------- */
  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    if (h.startsWith('set/')) return { view: 'set', uid: h.slice(4) };
    if (h.startsWith('c/')) return { view: 'list', cat: h.slice(2) };
    return { view: 'list', cat: '' };
  }
  const catHref = (path) => '#/c/' + encodeURIComponent(path);
  const setHref = (uid) => '#/set/' + encodeURIComponent(uid);

  let lastListHash = '#/';
  function route({ keepScroll = false } = {}) {
    if (!state.tree) return;
    const r = parseHash();
    if (r.view === 'set') {
      const it = state.byUid.get(r.uid);
      if (it) { renderProduct(it, keepScroll); markActive(it.catPath.join(' > '), true); return; }
    }
    lastListHash = location.hash || '#/';
    renderList(r.cat || '', keepScroll);
    markActive(r.cat || '', true);
  }

  /* ---------- Tree ---------- */
  const CARET = '<svg viewBox="0 0 10 10"><path d="M3 1l5 4-5 4z"/></svg>';
  const sortNodes = (m) => [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  function nodeHtml(node) {
    const kids = sortNodes(node.children);
    const open = state.openNodes.has(node.path) ? ' open' : '';
    return `<li class="${open.trim()}" data-path="${esc(node.path)}">
      <div class="tree__row">
        ${kids.length ? `<button class="tree__caret" type="button" aria-label="Развернуть">${CARET}</button>` : '<span class="tree__caret tree__caret--empty"></span>'}
        <a class="tree__link" href="${catHref(node.path)}" data-path="${esc(node.path)}"><span>${esc(node.name)}</span><span class="tree__count">${node.count}</span></a>
      </div>
      ${kids.length ? `<ul>${kids.map(nodeHtml).join('')}</ul>` : ''}
    </li>`;
  }

  function renderTree() {
    const t = state.tree;
    treeEl.innerHTML = `<ul>
      <li><div class="tree__row tree__all"><a class="tree__link" href="#/" data-path=""><span>${esc(t.name)}</span><span class="tree__count">${t.count}</span></a></div></li>
      ${sortNodes(t.children).map(nodeHtml).join('')}
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

  /* ---------- Catalog list ---------- */
  const SORTS = {
    default: { label: 'Как в таблице', fn: (a, b) => a.rowIndex - b.rowIndex },
    name: { label: 'По названию', fn: (a, b) => a.name.localeCompare(b.name, 'ru') },
    number: { label: 'По номеру', fn: (a, b) => (num(a.id) ?? 0) - (num(b.id) ?? 0) },
    yearDesc: { label: 'Сначала новые', fn: (a, b) => (num(b.year) ?? 0) - (num(a.year) ?? 0) },
    yearAsc: { label: 'Сначала старые', fn: (a, b) => (num(a.year) ?? 9999) - (num(b.year) ?? 9999) },
    priceDesc: { label: 'Дороже', fn: (a, b) => (priceOf(b) ?? -1) - (priceOf(a) ?? -1) },
    pcsDesc: { label: 'Больше деталей', fn: (a, b) => (num(b.pcs) ?? -1) - (num(a.pcs) ?? -1) },
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

  function conditionBadge(c) {
    if (!c) return '';
    const m = CONDITIONS[norm(c)] || { label: c, cls: 'other' };
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
    const links = ['<a href="#/">Все наборы</a>'];
    parts.forEach((p, i) => {
      const full = parts.slice(0, i + 1).join(' > ');
      links.push(i < parts.length - 1 || linkLast ? `<a href="${catHref(full)}">${esc(p)}</a>` : esc(p));
    });
    return `<div class="crumbs">${links.join(' › ')}</div>`;
  }

  function renderList(cat, keepScroll) {
    const q = norm(state.query);
    const list = state.items.filter((it) => inCat(it, cat) && matches(it, q)).sort(SORTS[state.sort].fn);
    const title = cat ? cat.split(' > ').pop() : 'Все наборы';
    const meta = `${list.length} ${plural(list.length, ['набор', 'набора', 'наборов'])}`;
    const searchNote = q ? ` по запросу «${esc(state.query)}»${cat ? ` · <a href="#/">искать во всех</a>` : ''}` : '';
    content.innerHTML = `
      <div class="toolbar">
        <div>
          ${crumbsHtml(cat, false)}
          <h1>${esc(title)}</h1>
          <div class="toolbar__meta">${meta}${searchNote}</div>
        </div>
        <label class="sort">Сортировка
          <select id="sort">${Object.entries(SORTS).map(([k, s]) => `<option value="${k}"${k === state.sort ? ' selected' : ''}>${s.label}</option>`).join('')}</select>
        </label>
      </div>
      ${list.length ? `<div class="grid">${list.map(cardHtml).join('')}</div>` : `<div class="empty">Ничего не найдено. Попробуйте другой запрос или категорию.</div>`}`;
    $('#sort').onchange = (e) => { state.sort = e.target.value; renderList(cat, true); };
    if (!keepScroll) window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function plural(n, f) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return f[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return f[1];
    return f[2];
  }

  /* ---------- Product page ---------- */
  function yesNo(v) {
    const n = norm(v);
    if (['yes', 'да', 'есть', '+', 'true', '1'].includes(n)) return { cls: 'yes', icon: '✓', text: 'есть' };
    if (['no', 'нет', '-', 'false', '0'].includes(n)) return { cls: 'no', icon: '✕', text: 'нет' };
    return { cls: 'unknown', icon: '?', text: 'неизвестно' };
  }

  function marketHtml(kind, name, link, price) {
    const logo = `<span class="market__logo market__logo--${kind}">${kind.toUpperCase()}</span>`;
    const priceHtml = price != null ? `<span class="market__price">${esc(money(price))}</span>` : `<span class="market__price"><small>цена не указана</small></span>`;
    if (link) return `<a class="market" href="${esc(link)}" target="_blank" rel="noopener"><span class="market__name">${logo}${name} ↗</span>${priceHtml}</a>`;
    if (price != null) return `<div class="market"><span class="market__name">${logo}${name}</span>${priceHtml}</div>`;
    return `<div class="market market--none"><span class="market__name">${logo}${name}</span><span>нет ссылки</span></div>`;
  }

  function renderProduct(it, keepScroll) {
    const photos = it.photos.length ? it.photos : [PLACEHOLDER];
    const instr = yesNo(it.instruction);
    const box = yesNo(it.box);
    const fact = (label, value) => `<div class="fact"><div class="fact__label">${label}</div><div class="fact__value">${esc(value || '—')}</div></div>`;
    const catPath = it.catPath.join(' > ');

    content.innerHTML = `
      <a class="back" href="${esc(lastListHash)}">← К каталогу</a>
      <article class="product">
        <div class="gallery">
          <div class="gallery__main">
            <img id="mainImg" src="${esc(photos[0])}" alt="${esc(it.name)}" referrerpolicy="no-referrer">
            ${photos.length > 1 ? '<button class="gallery__nav gallery__nav--prev" type="button" aria-label="Предыдущее фото">‹</button><button class="gallery__nav gallery__nav--next" type="button" aria-label="Следующее фото">›</button>' : ''}
          </div>
          ${photos.length > 1 ? `
          <div class="carousel">
            <button class="carousel__btn" type="button" data-dir="-1" aria-label="Прокрутить влево">‹</button>
            <div class="carousel__track" id="track">
              ${photos.map((p, i) => `<button class="thumb${i === 0 ? ' active' : ''}" type="button" data-i="${i}" aria-label="Фото ${i + 1}"><img src="${esc(p)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER}'"></button>`).join('')}
            </div>
            <button class="carousel__btn" type="button" data-dir="1" aria-label="Прокрутить вправо">›</button>
          </div>` : ''}
        </div>

        <div class="info">
          <div>
            <div class="info__num">Набор № ${esc(it.id)}</div>
            <h1>${esc(it.name)}</h1>
            <div class="info__cat">${crumbsHtml(catPath, true).replace('class="crumbs"', 'class="crumbs" style="margin:0"')}</div>
          </div>

          <div class="facts">
            ${fact('Год', it.year)}
            ${fact('Деталей', it.pcs)}
            ${fact('Человечков', it.minifigs)}
          </div>

          <div>
            <h2 class="section-title">Состояние</h2>
            ${conditionBadge(it.condition) || '<span class="updated">не указано</span>'}
          </div>

          <div>
            <h2 class="section-title">Комплектация</h2>
            <div class="checks">
              <span class="check check--${instr.cls}"><span class="check__icon">${instr.icon}</span>Инструкция: ${instr.text}</span>
              <span class="check check--${box.cls}"><span class="check__icon">${box.icon}</span>Коробка: ${box.text}</span>
            </div>
          </div>

          <div>
            <h2 class="section-title">Цена на площадках</h2>
            <div class="markets">
              ${marketHtml('bl', 'BrickLink', it.blLink, it.blPrice)}
              ${marketHtml('bo', 'BrickOwl', it.boLink, it.boPrice)}
            </div>
            ${it.updated ? `<p class="updated">Цены обновлены: <b>${esc(it.updated)}</b></p>` : ''}
          </div>

          ${it.comment ? `<div class="comment"><b>Комментарий:</b> ${esc(it.comment)}</div>` : ''}
        </div>
      </article>`;

    if (!keepScroll) window.scrollTo({ top: 0, behavior: 'instant' });
    $('#mainImg').addEventListener('error', (e) => { if (e.target.src !== PLACEHOLDER) e.target.src = PLACEHOLDER; });
    if (photos.length < 2) return;

    let cur = 0;
    const mainImg = $('#mainImg');
    const track = $('#track');
    const thumbs = [...track.querySelectorAll('.thumb')];
    const show = (i) => {
      cur = (i + photos.length) % photos.length;
      mainImg.src = photos[cur];
      thumbs.forEach((t, k) => t.classList.toggle('active', k === cur));
      const t = thumbs[cur];
      track.scrollTo({ left: t.offsetLeft - track.clientWidth / 2 + t.clientWidth / 2 });
    };
    track.addEventListener('click', (e) => { const t = e.target.closest('.thumb'); if (t) show(+t.dataset.i); });
    content.querySelectorAll('.carousel__btn').forEach((b) => b.addEventListener('click', () => track.scrollBy({ left: +b.dataset.dir * track.clientWidth * 0.8 })));
    $('.gallery__nav--prev').onclick = () => show(cur - 1);
    $('.gallery__nav--next').onclick = () => show(cur + 1);
    keyHandler = (e) => {
      if (document.activeElement === searchEl) return;
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    };
  }

  let keyHandler = null;
  document.addEventListener('keydown', (e) => {
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

  /* ---------- Start ---------- */
  window.addEventListener('hashchange', () => { keyHandler = null; route(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - state.loadedAt > CONFIG.focusRefreshMs) load({ silent: true });
  });
  setInterval(() => { if (document.visibilityState === 'visible') load({ silent: true }); }, CONFIG.autoRefreshMs);
  load();
})();
