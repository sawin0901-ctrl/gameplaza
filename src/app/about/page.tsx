import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "../../lib/prisma"

export const metadata: Metadata = {
  title: { absolute: "О нас — GamePlaza" },
  description: "GamePlaza — маркетплейс цифровых товаров. Официальный партнёр Digiseller. Игры, ПО, ключи активации по лучшим ценам с мгновенной доставкой.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "О нас — GamePlaza",
    description: "Официальный партнёр Digiseller. Цифровые товары с мгновенной доставкой.",
    type: "website",
  },
}

export const revalidate = 3600

const ADVANTAGES = [
  {
    icon: "⚡",
    title: "Мгновенная доставка",
    desc: "Ключ активации приходит на почту сразу после оплаты — без ожидания и ручной обработки заказов.",
  },
  {
    icon: "🔒",
    title: "Безопасная оплата",
    desc: "Все платежи проводятся через Digiseller — аккредитованный платёжный сервис с защитой покупателя.",
  },
  {
    icon: "🏆",
    title: "Качество гарантировано",
    desc: "Каждый товар проходит проверку перед публикацией. Нерабочий ключ заменим или вернём деньги.",
  },
  {
    icon: "💬",
    title: "Поддержка 24/7",
    desc: "Отвечаем на вопросы в любое время суток. Среднее время ответа — до нескольких часов.",
  },
  {
    icon: "💰",
    title: "Лучшие цены",
    desc: "Работаем напрямую с издателями и дистрибьюторами, поэтому держим цены ниже розничных.",
  },
  {
    icon: "🌍",
    title: "Широкий ассортимент",
    desc: "Steam, Xbox, PlayStation, Nintendo, подписки, программы, антивирусы — всё в одном месте.",
  },
]

const PAYMENTS = ["Visa", "Mastercard", "МИР", "СБП", "ЮMoney", "QIWI", "Крипта"]

export default async function AboutPage() {
  const [totalProducts, totalSold] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }).catch(() => 0),
    prisma.product.aggregate({ _sum: { soldCount: true } }).catch(() => ({ _sum: { soldCount: 0 } })),
  ])
  const sold = totalSold._sum.soldCount ?? 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center font-bold text-white text-xl">G</div>
          <span className="font-bold text-3xl">
            <span className="text-brand">Game</span>
            <span className="text-white">Plaza</span>
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Маркетплейс цифровых товаров
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
          Мы продаём игры, программы, ключи активации и подписки через официальную платформу Digiseller.
          Быстро, безопасно и по честным ценам.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Link href="/catalog" className="btn-primary px-6 py-3">Перейти в каталог</Link>
          <Link href="/help" className="btn-outline px-6 py-3">Частые вопросы</Link>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16">
        {[
          { value: totalProducts.toLocaleString("ru-RU") + "+", label: "Товаров в каталоге" },
          { value: sold > 0 ? sold.toLocaleString("ru-RU") + "+" : "1 000+", label: "Продано товаров" },
          { value: "24/7", label: "Служба поддержки" },
        ].map(s => (
          <div key={s.label} className="card p-6 text-center">
            <div className="text-3xl font-bold text-brand mb-1">{s.value}</div>
            <div className="text-gray-500 text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Преимущества */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-2">Почему выбирают нас</h2>
        <p className="text-gray-500 text-sm mb-8">Мы стараемся сделать покупку цифровых товаров простой и приятной.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ADVANTAGES.map(a => (
            <div key={a.title} className="card p-5">
              <div className="text-3xl mb-3">{a.icon}</div>
              <h3 className="text-white font-semibold mb-2">{a.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Как это работает */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-8">Как совершить покупку</h2>
        <div className="space-y-4">
          {[
            { step: "1", title: "Выберите товар", desc: "Найдите нужную игру или программу в каталоге. Используйте поиск или фильтры по категориям." },
            { step: "2", title: "Оплатите удобным способом", desc: "Нажмите «Купить» и выберите способ оплаты. Visa, МИР, СБП, ЮMoney и другие платёжные системы." },
            { step: "3", title: "Получите ключ мгновенно", desc: "Сразу после оплаты на ваш email придёт ключ активации или ссылка на скачивание." },
            { step: "4", title: "Активируйте и играйте", desc: "Введите ключ в соответствующем магазине (Steam, Xbox, PlayStation и т.д.) и пользуйтесь." },
          ].map((item, i) => (
            <div key={i} className="card p-5 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center text-brand font-bold text-lg flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Платёжные методы */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-6">Способы оплаты</h2>
        <div className="card p-6">
          <p className="text-gray-400 text-sm mb-5">
            Все платежи обрабатываются через Digiseller — лицензированный платёжный агрегатор, работающий с 2002 года.
          </p>
          <div className="flex flex-wrap gap-3">
            {PAYMENTS.map(p => (
              <span key={p} className="px-4 py-2 bg-[#1a1a26] border border-[#1f2937] rounded-xl text-sm text-gray-300">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Контакты */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Контакты</h2>
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">✉</div>
            <div>
              <p className="text-gray-500 text-xs">Email поддержки</p>
              <p className="text-white font-medium">support@gameplaza.site</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">🌐</div>
            <div>
              <p className="text-gray-500 text-xs">Сайт</p>
              <p className="text-white font-medium">gameplaza.site</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">⏱</div>
            <div>
              <p className="text-gray-500 text-xs">Время ответа</p>
              <p className="text-white font-medium">До 24 часов</p>
            </div>
          </div>
          <div className="pt-2 border-t border-[#1f2937]">
            <p className="text-gray-500 text-sm">
              Есть вопросы? Ознакомьтесь с{" "}
              <Link href="/help" className="text-brand hover:text-brand-400 transition-colors">
                разделом помощи
              </Link>{" "}
              — там собраны ответы на частые вопросы.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
