import { prisma } from "../lib/prisma"
import ProductCard from "../components/ProductCard"
import Link from "next/link"
import type { Metadata } from "next"

export const revalidate = 60

export const metadata: Metadata = {
  title: "GamePlaza — магазин цифровых товаров",
  description: "Купить цифровые товары: игры Steam, Xbox, PlayStation, программы, ключи активации. Мгновенная доставка, безопасная оплата через Digiseller.",
  openGraph: {
    title: "GamePlaza — магазин цифровых товаров",
    description: "Игры, программы, подписки и ключи активации по лучшим ценам. Мгновенная доставка.",
    type: "website",
    siteName: "GamePlaza",
  },
  twitter: {
    card: "summary_large_image",
    title: "GamePlaza — магазин цифровых товаров",
    description: "Игры, программы, подписки и ключи активации. Мгновенная доставка.",
  },
}

const CATEGORIES = [
  { name: "Игры Steam", slug: "steam", emoji: "🎮", gradient: "from-blue-600/30 to-blue-900/40", border: "hover:border-blue-500/40" },
  { name: "Xbox", slug: "xbox", emoji: "🎯", gradient: "from-green-600/30 to-green-900/40", border: "hover:border-green-500/40" },
  { name: "PlayStation", slug: "playstation", emoji: "🕹️", gradient: "from-indigo-600/30 to-indigo-900/40", border: "hover:border-indigo-500/40" },
  { name: "Nintendo", slug: "nintendo", emoji: "🎪", gradient: "from-red-600/30 to-red-900/40", border: "hover:border-red-500/40" },
  { name: "Game Pass", slug: "game-pass", emoji: "⭐", gradient: "from-brand/30 to-purple-900/40", border: "hover:border-brand/40" },
  { name: "Ключи активации", slug: "keys", emoji: "🔑", gradient: "from-amber-600/30 to-amber-900/40", border: "hover:border-amber-500/40" },
  { name: "Программы", slug: "software", emoji: "💻", gradient: "from-cyan-600/30 to-cyan-900/40", border: "hover:border-cyan-500/40" },
  { name: "Антивирусы", slug: "antivirus", emoji: "🛡️", gradient: "from-teal-600/30 to-teal-900/40", border: "hover:border-teal-500/40" },
  { name: "Windows", slug: "windows", emoji: "🪟", gradient: "from-sky-600/30 to-sky-900/40", border: "hover:border-sky-500/40" },
  { name: "Office", slug: "office", emoji: "📊", gradient: "from-orange-600/30 to-orange-900/40", border: "hover:border-orange-500/40" },
  { name: "VPN & Безопасность", slug: "vpn", emoji: "🔒", gradient: "from-violet-600/30 to-violet-900/40", border: "hover:border-violet-500/40" },
  { name: "Подарочные карты", slug: "gift-cards", emoji: "🎁", gradient: "from-pink-600/30 to-pink-900/40", border: "hover:border-pink-500/40" },
]

const FEATURES = [
  { icon: "⚡", title: "Мгновенная доставка", desc: "Ключ активации придёт на почту сразу после оплаты" },
  { icon: "🔒", title: "Безопасная оплата", desc: "Оплата через Digiseller — проверенный платёжный сервис" },
  { icon: "🏆", title: "Гарантия качества", desc: "Все товары проверяются перед публикацией в каталоге" },
  { icon: "💬", title: "Поддержка 24/7", desc: "Ответим на любой вопрос в течение нескольких часов" },
]

export default async function HomePage() {
  const [newProducts, popularProducts, totalProducts, totalCategories, salesAgg] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { importedAt: "desc" },
      take: 8,
      include: { category: true },
    }).catch(() => []),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { soldCount: "desc" },
      take: 8,
      include: { category: true },
    }).catch(() => []),
    prisma.product.count({ where: { isActive: true } }).catch(() => 0),
    prisma.category.count().catch(() => 0),
    prisma.product.aggregate({
      where: { isActive: true },
      _sum: { soldCount: true },
    }).catch(() => ({ _sum: { soldCount: null } })),
  ])

  const totalSold = salesAgg._sum.soldCount ?? 0

  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="hero-overlay absolute inset-0 bg-gradient-to-br from-brand/25 via-[#0a0a0f] to-purple-950/20" />
        <div className="hero-blob absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-brand-400 text-sm font-medium">
                {totalProducts > 0 ? `${totalProducts.toLocaleString("ru-RU")} товаров в наличии` : "Маркетплейс цифровых товаров"}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1] mb-5">
              Цифровые товары{" "}
              <span className="text-brand">по лучшим ценам</span>
            </h1>
            <p className="text-[var(--text-2)] text-lg mb-8 leading-relaxed max-w-xl mx-auto">
              Игры, программы, ключи активации и подписки. Мгновенная доставка, официальный Digiseller.
            </p>
            {/* Search */}
            <form action="/catalog" method="get" className="flex gap-2 max-w-xl mx-auto mb-8">
              <div className="relative flex-1">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input name="q" type="search" placeholder="Поиск по каталогу..."
                  className="gp-input pl-12 py-4 text-base" />
              </div>
              <button type="submit" className="btn-primary px-6 py-4 text-base">Найти</button>
            </form>
            {/* Quick links */}
            <div className="flex flex-wrap justify-center gap-2">
              {["Игры Steam", "Game Pass", "Windows", "Подписки"].map(t => (
                <Link key={t} href={`/catalog?q=${encodeURIComponent(t)}`}
                  className="text-sm text-[var(--text-3)] hover:text-brand transition-colors bg-white/5 hover:bg-white/10 border border-transparent hover:border-brand/20 px-3 py-1.5 rounded-full">
                  {t}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-[#1f2937] bg-[#0d0d14]">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              v: totalProducts > 0 ? `${totalProducts.toLocaleString("ru-RU")}+` : "—",
              l: "Товаров в каталоге",
            },
            {
              v: totalCategories > 0 ? String(totalCategories) : "—",
              l: "Категорий",
            },
            {
              v: totalSold > 0 ? `${totalSold.toLocaleString("ru-RU")}+` : "—",
              l: "Продаж через Digiseller",
            },
            {
              v: "Digiseller",
              l: "Официальная платёжная система",
            },
          ].map(s => (
            <div key={s.l} className="text-center py-2">
              <p className="text-2xl md:text-3xl font-extrabold text-brand">{s.v}</p>
              <p className="text-[var(--text-2)] text-xs mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="section-title">Категории</h2>
            <p className="section-sub">Выбирайте из широкого каталога цифровых товаров</p>
          </div>
          <Link href="/catalog" className="text-brand hover:text-brand-400 text-sm font-medium hidden sm:flex items-center gap-1 transition-colors">
            Все категории
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {CATEGORIES.map(cat => (
            <Link key={cat.slug} href={`/catalog?category=${cat.slug}`}
              className={`card ${cat.border} bg-gradient-to-br ${cat.gradient} p-4 flex flex-col items-center gap-2 group text-center transition-all duration-200`}>
              <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{cat.emoji}</span>
              <span className="text-xs font-semibold text-[var(--text)] group-hover:text-brand transition-colors leading-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── NEW ARRIVALS ── */}
      {newProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8 border-t border-[var(--border)]">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="section-title">🆕 Новые поступления</h2>
              <p className="section-sub">Свежие товары — добавлены сегодня</p>
            </div>
            <Link href="/catalog" className="text-brand hover:text-brand-400 text-sm font-medium hidden sm:flex items-center gap-1 transition-colors">
              Смотреть все
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {newProducts.map((p, i) => (
              <ProductCard key={p.id}
                slug={p.slug} name={p.name} price={p.price}
                oldPrice={p.oldPrice ?? undefined} discountPercent={p.discountPercent ?? undefined}
                imageUrl={p.imageUrl} category={p.category?.name}
                rating={p.rating ?? undefined} reviewCount={p.reviewCount ?? undefined}
                soldCount={p.soldCount} isNew={i < 4}
                digisellerProductId={p.digisellerProductId}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── POPULAR ── */}
      {popularProducts.length > 0 && popularProducts.some(p => p.soldCount > 0) && (
        <section className="max-w-7xl mx-auto px-4 py-8 border-t border-[var(--border)]">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="section-title">🔥 Популярные товары</h2>
              <p className="section-sub">Самые покупаемые в этом месяце</p>
            </div>
            <Link href="/catalog?sort=popular" className="text-brand hover:text-brand-400 text-sm font-medium hidden sm:flex items-center gap-1 transition-colors">
              Смотреть все
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {popularProducts.map(p => (
              <ProductCard key={p.id}
                slug={p.slug} name={p.name} price={p.price}
                oldPrice={p.oldPrice ?? undefined} discountPercent={p.discountPercent ?? undefined}
                imageUrl={p.imageUrl} category={p.category?.name}
                rating={p.rating ?? undefined} reviewCount={p.reviewCount ?? undefined}
                soldCount={p.soldCount}
                digisellerProductId={p.digisellerProductId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {newProducts.length === 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 border-t border-[var(--border)]">
          <div className="card p-16 text-center border-dashed">
            <div className="text-5xl mb-4">🎮</div>
            <h3 className="text-white font-bold text-xl mb-2">Товары скоро появятся</h3>
            <p className="text-gray-500 text-sm mb-6">Импорт запускается автоматически. Вернитесь через несколько минут.</p>
            <Link href="/catalog" className="btn-primary px-8 py-3">Открыть каталог</Link>
          </div>
        </section>
      )}

      {/* ── FEATURES ── */}
      <section className="bg-[#0d0d14] border-y border-[#1f2937] mt-8">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="section-title">Почему GamePlaza?</h2>
            <p className="section-sub">Безопасно, быстро, удобно</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-5 text-center hover:border-brand/30 group transition-colors">
                <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 group-hover:bg-brand/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-[var(--text-3)] text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="card p-10 text-center bg-gradient-to-br from-brand/15 to-purple-950/20 border-brand/20">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Готовы начать покупки?</h2>
          <p className="text-[var(--text-2)] mb-6 max-w-md mx-auto text-sm">
            Тысячи цифровых товаров по лучшим ценам. Мгновенная доставка через Digiseller.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/catalog" className="btn-primary px-10 py-3.5 text-base">Открыть каталог</Link>
            <Link href="/auth/register" className="btn-outline px-10 py-3.5 text-base">Зарегистрироваться</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
