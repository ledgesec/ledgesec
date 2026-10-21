# API

Контейнер `api` в общей сети compose. Снаружи его не публикуют: край проксирует `/api/` сюда. Браузер в Postgres и ClickHouse не ходит.

`GET /health` проверяет обе базы и пишет `ingest: ok`, только если секрет приёма задан. Само значение не отдаёт. `GET /v1/sites` читает список сайтов. `POST /v1/observations` принимает пачку от модуля, если заголовок `X-Ledgesec-Mac` совпал с `LEDGESEC_INGEST_SECRET`. `GET /v1/observations` отдаёт последние строки без IP.
