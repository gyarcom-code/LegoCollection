# Lego Collection

Каталог коллекции LEGO на GitHub Pages: https://gyarcom-code.github.io/LegoCollection/

Сайт статический (HTML + CSS + JS, без сборки). Данные берутся **вживую** из Google Таблицы
при каждом открытии страницы (и в фоне раз в 2 минуты), поэтому новая строка в таблице
сразу появляется в каталоге — ничего пересобирать не нужно.

## Таблица и API

- Таблица: https://docs.google.com/spreadsheets/d/1kcXDNkNGZQBX0QCm13GXOpKN0dYYLC2aKXu1_mah4Ho (остаётся приватной).
- Сайт читает её через веб-приложение Google Apps Script «Lego Collection API»
  (код — `apps-script/Code.gs`, привязан к таблице, запускается от имени владельца, доступ «Все»).
  Наружу отдаются только колонки из `PUBLIC_COLUMNS`.
- URL веб-приложения — `CONFIG.apiUrl` в `app.js`. При изменении `Code.gs` нужно
  «Управление развертываниями → Изменить → Новая версия», URL останется прежним.
- Колонки ищутся по заголовкам (порядок можно менять): `Set ID`, `Set Name`, `Condition`,
  `Category/Seria` (подкатегории через ` > `), `Main Photo`, `Photos ;` (ссылки через `;`),
  `Creation Date`, `Link to BrickLink`, `Price on BrickLink`, `Link to BrickOwl`,
  `Price on BrickOwl`, `Date of update`, `Pcs`, `Minifigures in set`, `Instruction`, `Box`, `Comment`.
- Колонки с ценой покупки, курсом и датой покупки в API не передаются.

Настройки (ID таблицы, gid листа, валюта) — в начале `app.js`, объект `CONFIG`.

## Обновление цен BrickLink

1. Войти в BrickLink в браузере (для гостей лимит ~40 страниц price guide).
2. На любой странице www.bricklink.com открыть консоль и вставить `tools/bricklink-prices.js`;
   по окончании JSON с ценами скопируется в буфер.
3. В редакторе Apps Script временно добавить функцию из `apps-script/fillBrickLinkPrices.example.gs`,
   заменить в ней `DATA` на новый JSON, выбрать `fillBrickLinkPrices` → «Выполнить», затем удалить функцию.

Цена — средняя цена продаж за 6 месяцев в состоянии набора (New/Used), иначе средняя цена текущих
предложений; валюта — UAH (как в настройках BrickLink). Пишутся колонки `Link to BrickLink`,
`Price on BrickLink` и `Date of update`.

## Публикация

GitHub Pages раздаёт ветку `gh-pages`. После изменений в `main`:
`git push origin main:gh-pages` (или в Settings → Pages переключите источник на `main`).

## Локальный запуск

```
python3 -m http.server 8000
```
