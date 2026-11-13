/*
 * Сбор списков деталей наборов с BrickOwl → файл lego-parts.csv для вкладки «Parts».
 * Запуск: открыть любую страницу www.brickowl.com, вставить в консоль список наборов
 * в переменную SETS (строки "SetID|ссылка на BrickOwl"), затем этот файл. По окончании
 * скачается lego-parts.csv (Set ID, Part ID, Name, Image Link, Quantity, Availability, Comment).
 * Импорт: вкладка Parts → Файл → Импорт → Загрузка → «Заменить текущий лист».
 *
 * Важно: вид инвентаря на BrickOwl должен быть «Grid» (не Table) — скрипт сам его включает.
 * Запасные детали (Qty 0 + 1) пропускаются; Availability = «Да».
 */
(async () => {
  const sets = (window.SETS || []).map((s) => { const [id, url] = s.split('|'); return { id, url }; });
  if (!sets.length) { console.error('Заполните window.SETS'); return; }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const path = (u) => new URL(u, location.origin).pathname.replace(/\/+$/, '');
  await fetch(path(sets[0].url) + '/inventory?catalog_inventory_display=grid');
  const rows = [];
  for (const [n, s] of sets.entries()) {
    for (let a = 0; a < 6; a++) {
      const r = await fetch(path(s.url) + '/inventory');
      if (r.status === 429 || r.status === 503) { await sleep(30000 * (a + 1)); continue; }
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      doc.querySelectorAll('li.category-item').forEach((l) => {
        const nm = (l.querySelector('.category-item-name')?.textContent || '').trim().replace(/\s+/g, ' ');
        const m = nm.match(/\(([^()]*\d[^()]*)\)\s*$/);
        const qty = +((l.querySelector('.cat-item-bot')?.textContent || '').match(/Qty:\s*(\d+)/) || [])[1] || 0;
        if (!qty) return;
        rows.push([s.id, m ? m[1] : (l.dataset.boid || ''), m ? nm.slice(0, m.index).trim() : nm,
          l.querySelector('img')?.getAttribute('src') || '', qty, 'Да', '']);
      });
      break;
    }
    console.log(`${n + 1}/${sets.length} ${s.id}`);
    await sleep(1500);
  }
  const q = (v) => { const t = String(v ?? ''); return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const csv = '﻿' + [['Set ID', 'Part ID', 'Name', 'Image Link', 'Quantity', 'Availability', 'Comment'], ...rows].map((r) => r.map(q).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'lego-parts.csv';
  document.body.appendChild(a); a.click();
  console.log('ГОТОВО: строк', rows.length);
})();
