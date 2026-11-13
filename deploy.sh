#!/bin/sh
# Публикация: проставляет версию сборки (против кэша) и пушит в main и gh-pages.
set -e
V=$(TZ=Europe/Kiev date +%Y%m%d%H%M%S)
sed -i.bak -E "s/(name=\"build\" content=\")[^\"]*/\1$V/; s/(styles\.css\?v=)[A-Za-z0-9]+/\1$V/; s/(app\.js\?v=)[A-Za-z0-9]+/\1$V/" index.html && rm -f index.html.bak
printf '{"v":"%s"}\n' "$V" > version.json
git add -A
git commit -m "${1:-Обновление сайта} (build $V)" || true
git push origin main
git push origin main:gh-pages
