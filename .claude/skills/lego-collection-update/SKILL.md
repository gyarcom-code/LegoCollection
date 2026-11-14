---
name: lego-collection-update
description: Обновить цены BrickLink/BrickOwl в таблице LegoCollection и заполнить контент новых наборов и минифигурок (фото, данные, список деталей) с учётом состояния и недостающих деталей.
---

# Обновление коллекции LEGO (цены + контент)

Таблица: https://docs.google.com/spreadsheets/d/1kcXDNkNGZQBX0QCm13GXOpKN0dYYLC2aKXu1_mah4Ho
Сайт (читает таблицу вживую, после правок ничего публиковать не нужно): https://gyarcom-code.github.io/LegoCollection/
Репозиторий: gyarcom-code/LegoCollection (помощники: `tools/bricklink-prices.js`, `tools/brickowl-parts.js`, `apps-script/fillBrickLinkPrices.example.gs`).

## Что делает скилл

1. **Цены** — для каждой строки наборов и минифигурок пересчитывает «Price on BrickLink» и «Price on BrickOwl» по состоянию и ставит «Date of update».
2. **Новые позиции** — строки, где есть ID, но пусто имя или фото: заполняет все справочные поля, фото, ссылки, цены; для наборов — ещё список деталей во вкладке «Parts».

Если пользователь просит только одно из двух — делать только это. Перед записью показать краткий план (сколько строк, какие новые) и после записи — итог.

## Листы и колонки

| Лист | gid | Ключ |
|---|---|---|
| Lego sets | 786177254 | Set ID (например `76389`) |
| Lego Minifigures | 656934717 | Minifigure ID = **BOID BrickOwl** (например `690481`) |
| Parts | 1295143301 | Set ID + Part ID |

Колонки ищутся **по заголовку** (без учёта регистра/пробелов), не по позиции.

- Наборы: Set ID, Set Name, Condition, Category/Seria, Main Photo, Photos ;, Creation Date, Link to BrickLink, Price on BrickLink, Link to BrickOwl, Price on BrickOwl, Date of update, Pcs, Minifigures in set, Instruction, Box, Comment.
- Минифигурки: Minifigure ID, Minifigure Name, Condition, Purchase Price, Course $, $, Date of Purchase, Category/Seria, Main Photo, Photos ;, Creation Date, Link to BrickLink, Price on BrickLink, Link to BrickOwl, Price on BrickOwl, Date of update, Comment.
- Parts: Set ID, Part ID, Name, Image Link, Quantity, Availability, Comment.

**Никогда не трогать колонки пользователя:** Condition, Purchase Price, Course $, $, Date of Purchase, Instruction, Box, Comment, Availability (кроме начального «Да» для новых деталей). Лист «0Lego used» не трогать, если не просят.

Форматы, как в уже заполненных строках:
- Category/Seria: `Тема > Подтема` (из хлебных крошек BrickOwl, без «LEGO»/«Sets»/«Minifigures» в начале).
- Photos ;: URL через `;` без пробелов.
- Creation Date: год числом (`2021`).
- Цены: число в гривнах, 2 знака (валюта аккаунтов BrickLink/BrickOwl — UAH; если на странице другая валюта — остановиться и сказать).
- Date of update: сегодняшняя дата (`dd.MM.yyyy` или значение Date — как в соседних строках).
- Link to BrickLink: набор `https://www.bricklink.com/v2/catalog/catalogitem.page?S=<id>-1#T=P` (если такого нет — `G=<id>` или `S=<id>-2`), минифигурка `...catalogitem.page?M=<blId>#T=P`.
- Link to BrickOwl: `https://www.brickowl.com/catalog/<slug>`.

## Какую цену брать (правило состояния)

Для каждой площадки берём **среднюю цену продаж за последние 6 месяцев** в нужном состоянии; если продаж нет — среднюю цену текущих предложений в том же состоянии; если и их нет — оставить ячейку пустой и упомянуть в итоге.

| Condition | Цена |
|---|---|
| пусто | **New** (считаем новым запечатанным) |
| `New (sealed)`, `New` | New |
| `Used (complete)`, `Used` | Used |
| `Used (incomplete)` | Used **минус недостающие детали** (см. ниже) |

Минифигурки: `Used` → Used, всё остальное (в т.ч. пусто) → New.

### Неполный набор (`Used (incomplete)`)

1. Во вкладке «Parts» взять строки этого Set ID, где Availability = «Нет»/«No»/«Ні». Количество недостающих = Quantity строки (если в Comment явно указано число недостающих — взять его).
2. Если список деталей набора пуст — сначала заполнить его (раздел «Список деталей»), цену поставить как у `Used (complete)` и сказать пользователю отметить отсутствующие детали «Нет», после чего запустить скилл ещё раз.
3. Если строк «Нет» нет — цена как у `Used (complete)`.
4. Для каждой недостающей детали найти её **Used**-цену (6 мес., иначе текущие) на каждой площадке:
   - BrickOwl: имя детали в Parts уже содержит цвет («LEGO Dark Bluish Gray Brick 1 x 2») — поиск `/search/catalog?query=<Part ID>`, выбрать результат с тем же цветом/именем, цена через `/ajax/price/<itemId>` (как для наборов).
   - BrickLink: `catalogPG.asp?P=<Part ID>&ColorID=<BL color id>`; ID цвета — по имени цвета из таблицы https://www.bricklink.com/catalogColors.asp. Минифигурка из набора — `M=<id>`.
5. Цена набора = Used-цена набора − Σ(цена детали × количество), не ниже 0, округлить до 2 знаков. В итоговом сообщении показать расчёт по каждому такому набору (комментарий в таблицу не писать).

## Источники данных и фото

**Фото всегда с BrickOwl**; если там нет картинок — с BrickLink (`https://img.bricklink.com/ItemImage/SN/0/<id>-1.png` для набора, `.../MN/0/<blId>.png` для минифигурки). Ссылки BrickOwl — крупные: `https://img.brickowl.com/files/image_cache/larger/<файл>`.

- **Набор:** Main Photo — первое фото BrickOwl (коробка/собранный набор), остальные — в Photos ;.
- **Минифигурка:** Main Photo — фото, где фигурка **собрана** (студийный рендер спереди). Чтобы выбрать, обязательно посмотреть картинки глазами: вывести их сеткой на любой открытой странице (div с `<img referrerpolicy="no-referrer">`) и сделать скриншот/zoom. Разобранный вид (детали столбиком) — никогда не главное. Порядок Photos ;: остальные фото фигурки → разобранный вид → фото набора(ов), из которых фигурка (файлы с `-set-` в имени), если есть.

Справочные поля:
- Набор: Set Name, Category/Seria, Creation Date (год), Pcs, Minifigures in set — со страницы набора BrickOwl (если чего-то нет — со страницы BrickLink `catalogitem.page?S=<id>-1`: «Parts», «Minifigs», «Year Released»).
- Минифигурка: Minifigure Name, Category/Seria, Creation Date — со страницы BrickOwl; BrickLink-ID (например `hp312`) — из таблицы ID на странице BrickOwl, иначе поиск по имени на BrickLink.

### Список деталей нового набора (вкладка Parts)

Если для Set ID нет строк в «Parts»: инвентарь BrickOwl `/catalog/<slug>/inventory` в виде **Grid** (сначала один раз открыть `?catalog_inventory_display=grid`, иначе вернётся таблица и 0 позиций). Разбор как в `tools/brickowl-parts.js`: `li.category-item`, имя `.category-item-name`, картинка `img`, `Qty: N`; запасные (`Qty: 0 + 1`) пропускать; Part ID — последнее число в скобках имени (regex `\(([^()]*\d[^()]*)\)\s*$`), иначе `data-boid`; Availability = «Да», Comment пусто. Строки дописывать в конец листа.

## Как собирать данные (окружение)

- Работать во **встроенном браузере** пользователя. Контейнер и VM не достают ни Google, ни BrickOwl.
- **BrickLink**: открыть вкладку www.bricklink.com, пользователь должен быть **залогинен** (гостю дают ~40 страниц price guide). Запросы `fetch('/catalogPG.asp?S=<id>-1&ColorID=0')` + `DOMParser`; разбор `parsePG` из `tools/bricklink-prices.js` → `[продажи6м New, продажи6м Used, текущие New, текущие Used]`. Пауза 2.5 с между запросами; если заголовок страницы содержит «Oops» — ждать 30 с × попытка.
- **BrickOwl**: вкладка www.brickowl.com. Поиск `/search/catalog?query=<ID>`; страница товара: h1 — имя, хлебные крошки — категория, первая таблица — Year, картинки — фото. История цен: `fetch('/ajax/price/<itemId>', {method:'POST', headers:{'X-Requested-With':'XMLHttpRequest'}, body:''})` — строки Current / 6 Months / 1 Year / 2 Years × All/New/Used Average. Пауза ~1.5 с; при 429/503 — ждать 30 с × попытка.
- Собранное держать в `window.__…` на вкладке и забирать результатом `javascript_tool` (порциями ≤ ~150 КБ). Буфер обмена во встроенном браузере не работает; BrickOwl блокирует запросы к Google (CSP и 403), поэтому прямой передачи из вкладки BrickOwl в таблицу нет.

## Запись в таблицу (через Apps Script)

Проект скрипта, привязанный к таблице: https://script.google.com/home/projects/1bGSRJkhVe_2QRbrWQUDRWiJED47yywyYTKIlaoZUf1CaOFJdokv9gOLl/edit

1. В редакторе через `javascript_tool` дописать временную функцию в конец кода:
   `monaco.editor.getModels()[0]` → `setValue(код + "\n/* ===== ВРЕМЕННО: … ===== */\nfunction fillX() { const DATA = {...}; … }")`. Данные встраивать JSON-литералом; при большом объёме — несколько запусков порциями. Функция ищет колонки по заголовку (`norm_`, `sheetByGid_`, константы `SHEET_GID`, `MINIFIG_GID`, `PARTS_GID` уже есть в Code.gs) и пишет только нужные ячейки; строки ищет по ID.
2. Клик в редактор → Cmd+S → выбрать функцию в выпадающем списке рядом с «Отладка» → «Выполнить». Проверить «Журнал выполнения» (функция должна логировать, сколько строк записано).
3. **Удалить временную функцию** (обрезать всё начиная с `\n/* ===== ВРЕМЕННО`) и сохранить. В Code.gs должен остаться только API.
4. Повторно развёртывание НЕ делать — оно нужно только при изменении doGet/колонок API. Не добавлять в веб-приложение никаких функций записи (doPost и т.п.): API остаётся только для чтения.
5. Проверка: с вкладки docs.google.com прочитать `…/gviz/tq?tqx=out:csv&gid=<gid>&headers=1` и сверить записанные ячейки; при желании открыть сайт и посмотреть карточку.

## Итог пользователю

Коротко: сколько строк обновлено по каждой площадке, какие позиции новые и что заполнено, у каких нет цены и почему, расчёт для неполных наборов, и что ему нужно сделать самому (например, отметить «Нет» у пропавших деталей).
