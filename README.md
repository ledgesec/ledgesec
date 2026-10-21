# Ledgesec

Монорепозиторий. Край, кабинет и API живут здесь. Пакет на сервер заказчика тоже здесь, отдельным каталогом.

| Каталог | Что это |
| --- | --- |
| `edge/` | OpenResty нашего края. Первая поставка: два сервера, порт 443 только здесь. |
| `api/` | Учёт сайтов, сертификаты, снимок, чтение журнала. На путь посетителя не встаёт. |
| `cabinet/` | Кабинет. Роль берётся из сессии. |
| `packages/customer-gate/` | Lua на OpenResty заказчика. Без пропуска отправляет браузер на край. Для тех, кто не меняет A. В кабинет v1 не входит. |

Angie и Caddy появятся своими пакетами, когда до них дойдёт заказчик. Пока их нет.

## Платформа

Европейская машина поднимает один `docker-compose.yml`: Postgres, ClickHouse, API, кабинет и край. Схема баз зашита в их образы, отдельный bind-mount для SQL не нужен. Coolify в России только выкладывает этот файл по SSH. Нью-йоркская машина в файл не входит и в панель не добавляется.

В Coolify:

1. Ресурс из Git, build pack Docker Compose, файл `docker-compose.yml` в корне.
2. Advanced → Docker compose → Compose deployment: Raw (deploy file as-is). Иначе панель допишет свой прокси.
3. На европейском сервере прокси: Custom (None). Домен у ресурса не задавать: иначе Traefik заберёт 80 и 443. Эти порты публикует только сервис `edge`.
4. В переменных задать `POSTGRES_PASSWORD` и `CLICKHOUSE_PASSWORD`. `EDGE_HTTP_PORT` и `EDGE_HTTPS_PORT` на сервере не задавать: край займёт 80 и 443.

Postgres и ClickHouse в хостовые порты не выведены. Локально скопируй `.env.example` в `.env`.

Нью-йоркская машина поднимает только `docker-compose.us.yml`. В Coolify её нет. На этой машине:

```bash
docker compose -p ledgesec-us -f docker-compose.us.yml up --build -d
```

```bash
docker compose up --build
```

Проверка пакета заказчика:

```bash
cargo test
```

Демо пакета заказчика, с корня:

```bash
cargo run -p ledgesec-gate
```
