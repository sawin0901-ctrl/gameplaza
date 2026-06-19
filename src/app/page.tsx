import { prisma } from "../lib/prisma"
import ProductCard from "../components/ProductCard"
import Link from "next/link"

export const revalidate = 300

const CATEGORIES = [
  { name: "Игры Steam", slug: "steam", emoji: "🎮", color: "from-blue-600/10 to-blue-900/20" },
  { name: "Xbox", slug: "xbox", emoji: "🎯", color: "from-green-600/10 to-green-900/20" },
  { name: "PlayStation", slug: "playstation", emoji: "🕹️", color: "from-indigo-600/10 to-indigo-900/20" },
  { name: "Nintendo", slug: "nintendo", emoji: "🎪", color: "from-red-600/10 to-red-900/20" },
  { name: "Game Pass", slug: "game-pass", emoji: "⭐", color: "from-brand/10 to-purple-900/20" },
  { name: "Ключи", slug: "keys", emoji: "🔑", color: "from-yellow-600/10 to-yellow-900/20" },
  { name: "Программы", slug: "software", emoji: "💻", color: "from-cyan-600/10 to-cyan-900/20" },
  { name: "Подарочные карты", slug: "gift-cards", emoji: "🎁", color: "from-pink-600/10 to-pink-900/20" },
]

const FEATURES = [
  { icon: "⚡", title: "Мгновенная доставка", desc: "Ключ активации — сразу после оплаты на вашу почту" },
  { icon: "🔒", title: "Безопасная оплата", desc: "Все транзакции защищены современным шифрованием" },
  { icon: "🏆", title: "Гарантия качества", desc: "Каждый товар проверяется перед публикацией" },
  { icon: "💬", title: "Поддержка 24/7", desc: "Решим любой вопрос в течение нескольких часов" },
]

const FAQ_ITEMS = [
  { q: "Как быстро я получу товар после оплаты?", a: "Мгновенно. Ключ активации придёт на вашу электронную почту сразу после подтверждения платежа." },
  { q: "Что делать если ключ не подходит?", a: "Свяжитесь с поддержкой в течение 24 часов — обменяем товар или вернём деньги без лишних вопросов." },
  { q: "Какие способы оплаты доступны?", a: "Принимаем Visa, Mastercard, МИР и СБП (Система быстрых платежей). Оплата через защищённый шлюз." },
  { q: "Можно ли вернуть товар?", a: "Да, в течение 24 часов с момента покупки, если ключ не был активирован. Возврат на карту в течение 3 дней." },
  { q: "Для каких регионов подходят ключи?", a: "В описании каждого товара указан регион активации. Большинство ключей подходят для России и СНГ." },
]

export default async function HomePage() {
  const [newProducts, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { importedAt: "desc" },
      take: 12,
      include: { category: true },
    }).catch(() => []),
    prisma.product.count({ where: { isActive: true } }).catch(() => 0),
  ])

  return (
    <div>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden min-h-[480px] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-[#0a0a0f] to-purple-900/10 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-brand-400 text-sm font-medium">
                {totalProducts > 0 ? `${totalProducts.toLocaleString("ru-RU")} товаров в наличии` : "Маркетплейс цифровых товаров"}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] mb-5">
              Лучший маркетплейс{" "}
              <span className="text-brand">цифровых товаров</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed max-w-lg">
              Игры, программы, ключи активации и подписки. Мгновенная доставка, гарантия качества, лучшие цены.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/catalog" className="btn-primary text-base px-8 py-3.5">
                Перейти в каталог
              </Link>
              <Link href="/catalog?sort=discount" className="btn-ghost border border-[#1f2937] text-base px-8 py-3.5 rounded-xl">
                🔥 Акции
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="border-y border-[#1f2937] bg-[#0d0d14]">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { v: totalProducts > 0 ? `${totalProducts.toLocaleString("ru-RU")}+` : "1 000+", l: "Товаров" },
            { v: "500+", l: "Продавцов" },
            { v: "50 000+", l: "Заказов" },
            { v: "25 000+", l: "Покупателей" },
          ].map(s => (
            <div key={s.l} className="text-center">
              <p className="text-3xl font-bold text-brand">{s.v}</p>
              <p className="text-gray-600 text-sm mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Categories ─── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="section-title">Популярные категории</h2>
            <p className="section-sub">Найдите нужный товар за несколько секунд</p>
          </div>
          <Link href="/catalog" className="text-brand hover:text-brand-400 text-sm font-medium hidden sm:block transition-colors">
            Все категории →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {CATEGORIES.map(cat => (
            <Link key={cat.slug} href={`/catalog?category=${cat.slug}`}
              className={`card hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5 p-4 md:p-5 bg-gradient-to-br ${cat.color} flex items-center gap-3 group`}>
              <span className="text-2xl md:text-3xl">{cat.emoji}</span>
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── New Products ─── */}
      {newProducts.length > 0 ? (
        <section className="max-w-7xl mx-auto px-4 pb-14">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="section-title">Новые поступления</h2>
              <p className="section-sub">Свежие товары — добавлены сегодня</p>
            </div>
            <Link href="/catalog" className="text-brand hover:text-brand-400 text-sm font-medium hidden sm:block transition-colors">
              Смотреть все →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {newProducts.slice(0, 8).map((p, i) => (
              <ProductCard key={p.id} slug={p.slug} name={p.name} price={p.price}
                imageUrl={p.imageUrl} category={p.category?.name} isNew={i < 3} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/catalog" className="btn-primary px-10 py-3.5 text-base">
              Смотреть все {totalProducts.toLocaleString("ru-RU")} товаров
            </Link>
          </div>
        </section>
      ) : (
        <section className="max-w-7xl mx-auto px-4 pb-14">
          <div className="card p-16 text-center border-dashed">
            <div className="text-5xl mb-4">🎮</div>
            <h3 className="text-white font-bold text-xl mb-2">Товары скоро появятся</h3>
            <p className="text-gray-500 text-sm">Импорт товаров из Digiseller запускается автоматически каждое утро</p>
          </div>
        </section>
      )}

      {/* ─── Features ─── */}
      <section className="bg-[#0d0d14] border-y border-[#1f2937]">
        <div className="max-w-7xl mx-auto px-4 py-14">
          <div className="text-center mb-10">
            <h2 className="section-title">Почему GamePlaza?</h2>
            <p className="section-sub">Мы сделали покупку цифровых товаров простой и безопасной</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-6 text-center hover:border-brand/30 group">
                <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 group-hover:bg-brand/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold mb-2 text-sm">{f.title}</h3>
                <p className="text-gray-600 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="max-w-3xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="section-title">Частые вопросы</h2>
          <p className="section-sub">Ответы на самые популярные вопросы покупателей</p>
        </div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="card p-5 hover:border-brand/20 transition-colors">
              <p className="text-white font-medium text-sm mb-2 flex items-start gap-2">
                <span className="text-brand font-bold mt-0.5">Q</span>
                {item.q}
              </p>
              <p className="text-gray-500 text-sm leading-relaxed pl-5">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="max-w-7xl mx-auto px-4 pb-14">
        <div className="card p-10 md:p-14 text-center bg-gradient-to-br from-brand/15 to-purple-900/10 border-brand/20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Готов начать покупки?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Тысячи цифровых товаров ждут тебя. Мгновенная доставка, лучшие цены, полная безопасность.
          </p>
          <Link href="/catalog" className="btn-primary text-base px-12 py-4">
            Открыть каталог
          </Link>
        </div>
      </section>
    </div>
  )
}
