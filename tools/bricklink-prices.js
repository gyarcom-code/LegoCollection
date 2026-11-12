/*
 * Сбор цен BrickLink для таблицы коллекции.
 * Запуск: войти в BrickLink в браузере, открыть любую страницу www.bricklink.com,
 * вставить этот файл в консоль (DevTools → Console), дождаться «ГОТОВО».
 * Для гостей BrickLink даёт ~40 страниц price guide, поэтому нужен вход.
 *
 * Цена: средняя цена продаж за последние 6 месяцев в нужном состоянии
 * (New — для «New (sealed)», Used — для остальных); если продаж нет —
 * средняя цена текущих предложений. Валюта — как в настройках BrickLink (сейчас UAH).
 *
 * Результат копируется в буфер как JSON {"setId": [newPrice, usedPrice, "G=..." (если не набор)]}
 * и подставляется в DATA временной функции Apps Script (см. README).
 */
(async () => {
  const API = 'https://script.google.com/macros/s/AKfycbwzN0VywjKz71GJrPJcM0DTfP5zHg3VwRyQTiVi54S13Ig6mpeEPqpjKn7N56pd05BZ/exec';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const money = (s) => { if (!s) return null; const v = parseFloat(s.replace(/[^\d.]/g, '')); return isFinite(v) ? Math.round(v * 100) / 100 : null; };

  // Номера наборов берём из API каталога (JSONP, чтобы обойти CORS)
  const data = await new Promise((resolve, reject) => {
    const cb = '__legoIds' + Date.now();
    window[cb] = (d) => { delete window[cb]; resolve(d); };
    const s = document.createElement('script');
    s.src = API + '?callback=' + cb; s.onerror = reject; document.head.appendChild(s);
  });
  const iId = data.header.indexOf('Set ID');
  const ids = [...new Set(data.rows.map((r) => String(r[iId]).trim()).filter(Boolean))];

  function parsePG(doc) {
    const labels = [...doc.querySelectorAll('td')].filter((td) => /^(Times Sold|Total Lots):$/.test(td.textContent.trim()) && !td.querySelector('td'));
    if (!labels.length) return [null, null, null, null];
    const row = labels[0].closest('table').parentElement.closest('table').closest('tr');
    const cols = [...row.children].filter((c) => c.tagName === 'TD');
    if (cols.length !== 4) return [null, null, null, null];
    return cols.map((c) => {
      let avg = null;
      c.querySelectorAll('tr').forEach((tr) => {
        const td = tr.querySelectorAll(':scope > td');
        if (td.length >= 2 && td[0].textContent.trim() === 'Avg Price:') avg = td[1].textContent;
      });
      return money(avg);
    });
  }

  async function get(q) {
    for (let a = 0; a < 6; a++) {
      const html = await (await fetch(`/catalogPG.asp?${q}&ColorID=0`)).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (/Oops/.test(doc.title)) { console.warn('BrickLink ограничил запросы, жду…'); await sleep(30000 * (a + 1)); continue; }
      return doc;
    }
    throw new Error('throttled');
  }

  const out = {}; const notFound = [];
  for (const [n, id] of ids.entries()) {
    let res = null;
    for (const [type, code] of [['S', id + '-1'], ['G', id], ['S', id + '-2']]) {
      const doc = await get(`${type}=${code}`);
      await sleep(2500);
      if (/^BrickLink Price Guide/.test(doc.title)) {
        const [sn, su, cn, cu] = parsePG(doc);
        res = [sn ?? cn, su ?? cu];
        if (!(type === 'S' && code === id + '-1')) res.push(`${type}=${code}`);
        break;
      }
    }
    if (res) out[id] = res; else notFound.push(id);
    console.log(`${n + 1}/${ids.length} ${id}`, res);
  }
  const json = JSON.stringify(out);
  try { await navigator.clipboard.writeText(json); } catch (e) { console.log(json); }
  console.log('ГОТОВО. Не найдены:', notFound.join(', ') || '—');
})();
