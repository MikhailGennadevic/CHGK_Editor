# CHGK Editor

Редактор вопросов для викторин «Что? Где? Когда?»: пакеты вопросов с ответами, зачётами, комментариями, источниками, раздатками и тестерами. Вопросы можно перетаскивать, массово назначать тестеров и выгружать пакет в docx для печатного тура.

## Возможности

**Доска пакетов (главная)**
- Колонки-пакеты с горизонтальной прокруткой, перетаскивание пакетов и вопросов между ними (dnd-kit)
- Компактные карточки вопросов: номер, текст, предупреждение о незаполненном комментарии
- Быстрое копирование текста вопроса и полного ответа (ответ, зачёты, незачёт, комментарий, источники) в буфер обмена

**Страница пакета**
- Крупные карточки вопросов с drag&drop-сортировкой
- Массовые действия: выбрать вопросы и добавить тестеров ко всем сразу
- Отметка вопросов, которые уже тестировали (запоминается в браузере)
- Кнопка «Скопировать тестеров» — все тестеры пакета через запятую
- Плавающая навигация внизу: к началу/концу пакета и к вопросам, кратным 6 (концы туров), кнопка «Показать/Скрыть все ответы»
- Скачивание пакета в docx (формат печатного тура)

**Редактор вопроса**
- Создание, редактирование и удаление вопроса в модальном окне
- Поля: текст, ответ, зачёты (список), незачёт, комментарий, источники (список), тестеры, картинка-раздатка
- Ширина окна регулируется перетаскиванием за правый край (запоминается), сохранение не закрывает окно
- Спец-пакет «Неотсортированное» — приёмник для новых вопросов (создаётся автоматически при первом запуске)

## Стек

| Часть | Технологии |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, @dnd-kit |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic, asyncpg, python-docx |
| БД | PostgreSQL 16 |

## Быстрый старт

Нужен только Docker:

```bash
docker compose up -d
```

При старте поднимаются три сервиса:

| Сервис | Адрес | Что делает |
|--------|-------|------------|
| frontend | http://localhost:5173 | Vite dev-сервер с hot reload |
| backend | http://localhost:8000 | FastAPI; применяет миграции Alembic и сид «Неотсортированное» |
| db | localhost:5433 | PostgreSQL (логин/пароль: `postgres`/`postgres`, БД `chgkeditor`) |

Проверка бэкенда: `curl http://localhost:8000/health` → `{"status":"ok"}`.
Swagger: http://localhost:8000/docs

## Структура проекта

```
.
├── docker-compose.yml      # dev-окружение: db + backend + frontend
├── backend/
│   ├── alembic/            # миграции
│   └── app/
│       ├── api/routers/    # /packages, /questions, /testers, /uploads
│       ├── core/config.py  # настройки (DATABASE_URL, каталог uploads)
│       ├── db/             # сессия, подключение
│       ├── models/         # Package, Question, Tester, Source, AlternativeAnswer
│       ├── schemas/        # Pydantic-схемы API
│       ├── scripts/seed.py # сид «Неотсортированное»
│       └── services/       # docx-экспорт, загрузка раздаток
└── frontend/
    └── src/
        ├── components/     # Board, PackagePage, QuestionCard, QuestionEditorModal и др.
        ├── context/        # открытие редактора вопроса
        ├── hooks/          # логика перетаскивания (dnd-kit)
        ├── api.ts          # REST-клиент
        ├── clipboard.ts    # копирование в буфер (с fallback)
        └── router.tsx      # мини-роутер на History API
```

## API

| Метод и путь | Назначение |
|--------------|------------|
| `GET/POST /packages`, `PATCH/DELETE /packages/{id}` | пакеты |
| `GET /packages/{id}/docx` | выгрузка пакета в docx |
| `GET/POST /questions`, `PATCH/DELETE /questions/{id}` | вопросы |
| `PATCH /questions/{id}/move` | перемещение вопроса (порядок/пакет) |
| `POST /questions/bulk/testers` | массовое добавление тестеров к вопросам |
| `GET/POST /testers` | тестеры |
| `POST /uploads` | загрузка картинки-раздатки |

Фронт ходит на `/api/...` — Vite-прокси срезает префикс и перенаправляет на бэкенд (адрес задаётся переменной `API_TARGET`).

## Разработка без Docker

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.scripts.seed
uvicorn app.main:app --reload
```

Frontend (в отдельном терминале):

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173, прокси на http://127.0.0.1:8000
npm run build   # production-сборка в dist/
```

Настройки backend читаются из окружения или `.env` рядом с `backend/`:
`DATABASE_URL` (по умолчанию `postgresql+asyncpg://postgres:postgres@localhost:5432/chgkeditor`), `UPLOADS_DIR`.

## Замечания

- Картинки-раздатки хранятся в `backend/uploads/` — это рантайм-данные, в git не входят (как и содержимое БД).
- В WSL на диске Windows Vite использует polling (`CHOKIDAR_USEPOLLING`) — иначе hot reload не видит правок.
