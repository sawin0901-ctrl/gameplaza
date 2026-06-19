# GamePlaza

> Автоматизированный маркетплейс цифровых товаров — [gameplaza.site](https://gameplaza.site)

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| База данных | PostgreSQL + Prisma ORM |
| Очереди | BullMQ + Redis |
| Парсинг | Cheerio |
| Источник товаров | Digiseller API |

## Ключевые функции

- **Автоимпорт** — до 200 новых товаров в сутки через очередь BullMQ (1 товар каждые 5 мин)
- **Контроль качества** — карточка публикуется только если есть фото, цена, описание и наличие
- **Автоскрытие/восстановление** — товары без наличия скрываются автоматически и возвращаются когда появляются
- **Очистка ссылок** — все ссылки на plati.market и digiseller.ru автоматически заменяются на gameplaza.site
- **Связанные товары** — ссылки внутри описаний резолвятся в карточки на сайте, недостающие ставятся в очередь
- **Виджет Digiseller** — lazy load, skeleton, retry x3, fallback при недоступности
- **SEO** — автогенерация slug, meta-тегов, Open Graph, sitemap.xml, robots.txt, перелинковка
- **Мониторинг** — панель `/admin/monitoring` с живыми счётчиками

## Быстрый старт

```bash
# 1. Клонировать
git clone https://github.com/sawin0901-ctrl/gameplaza.git
cd gameplaza

# 2. Установить зависимости
npm install

# 3. Настроить переменные окружения
cp .env.example .env.local
# Заполнить .env.local

# 4. Применить схему БД
npm run db:push

# 5. Запустить сайт
npm run dev

# 6. Запустить воркер импорта (отдельный терминал)
npm run worker
```

## Структура проекта

```
src/
  app/
    page.tsx                    # Главная
    catalog/page.tsx            # Каталог с поиском и фильтрами
    product/[slug]/page.tsx     # Карточка товара
    admin/monitoring/page.tsx   # Панель мониторинга
    api/
      import/run/route.ts       # POST — запустить импорт
      products/sync/route.ts    # POST — проверить наличие товаров
      monitoring/route.ts       # GET — статистика JSON
    sitemap.ts                  # Автосинтез sitemap.xml
    robots.ts                   # robots.txt
  components/
    Header.tsx
    Footer.tsx
    ProductCard.tsx
    DigisellerWidget.tsx        # Lazy load + retry + fallback
    SkeletonCard.tsx
  lib/
    prisma.ts                   # Prisma клиент
    digiseller.ts               # Digiseller API
    queue.ts                    # BullMQ очереди
    quality-check.ts            # Проверка качества карточки
    link-processor.ts           # Замена ссылок
    seo.ts                      # Метаданные, slug
  workers/
    import-worker.ts            # Воркер импорта
prisma/
  schema.prisma
```

## API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/import/run` | Запустить ежедневный импорт (заголовок `x-admin-secret`) |
| POST | `/api/products/sync` | Проверить наличие и скрыть/восстановить товары |
| GET | `/api/monitoring` | JSON статистика системы |

## Переменные окружения

```env
DATABASE_URL=           # PostgreSQL
REDIS_URL=              # Redis
NEXTAUTH_SECRET=        # Секрет для сессий
NEXTAUTH_URL=           # https://gameplaza.site
DIGISELLER_SELLER_ID=   # ID продавца Digiseller
DIGISELLER_API_KEY=     # API ключ Digiseller
NEXT_PUBLIC_SITE_URL=   # https://gameplaza.site
ADMIN_SECRET=           # Секрет для API-эндпоинтов
```

## Cron-расписание (рекомендуемое)

```cron
0 9 * * *   POST /api/import/run        # Импорт новых товаров каждое утро
*/30 * * * * POST /api/products/sync    # Проверка наличия каждые 30 минут
```
