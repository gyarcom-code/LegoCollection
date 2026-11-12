# Lego Collection

Каталог коллекции LEGO на GitHub Pages: https://gyarcom-code.github.io/LegoCollection/

Сайт статический (HTML + CSS + JS, без сборки). Данные берутся **вживую** из Google Таблицы
при каждом открытии страницы (и в фоне раз в 2 минуты), поэтому новая строка в таблице
сразу появляется в каталоге — ничего пересобирать не нужно.

## Таблица

- Ссылка: https://docs.google.com/spreadsheets/d/1kcXDNkNGZQBX0QCm13GXOpKN0dYYLC2aKXu1_mah4Ho
- Доступ должен быть «Все, у кого есть ссылка → Читатель».
- Колонки ищутся по заголовкам (порядок можно менять): `Set ID`, `Set Name`, `Condition`,
  `Category/Seria` (подкатегории через ` > `), `Main Photo`, `Photos ;` (ссылки через `;`),
  `Creation Date`, `Link to BrickLink`, `Price on BrickLink`, `Link to BrickOwl`,
  `Price on BrickOwl`, `Date of update`, `Pcs`, `Minifigures in set`, `Instruction`, `Box`, `Comment`.
- Колонки с ценой покупки, курсом и датой покупки на сайте не показываются.

Настройки (ID таблицы, gid листа, валюта) — в начале `app.js`, объект `CONFIG`.

## Локальный запуск

```
python3 -m http.server 8000
```
