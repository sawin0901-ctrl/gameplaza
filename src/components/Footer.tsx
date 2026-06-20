import Link from "next/link"

const CATALOG_LINKS = [
  { name: "Все товары",      href: "/catalog" },
  { name: "Игры Steam",      href: "/catalog?category=steam" },
  { name: "Xbox",            href: "/catalog?category=xbox" },
  { name: "PlayStation",     href: "/catalog?category=playstation" },
  { name: "Подписки",        href: "/catalog?category=subscriptions" },
  { name: "🔥 Акции",        href: "/catalog?sort=discount" },
]

const INFO_LINKS = [
  { name: "О нас",                      href: "/about" },
  { name: "Помощь и FAQ",               href: "/help" },
  { name: "Условия покупки",            href: "/help#returns" },
  { name: "Активация ключей",           href: "/help#activation" },
  { name: "Контакты",                   href: "/about#contacts" },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#0d0d14] border-t border-[#1f2937] mt-20">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          {/* Бренд */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold text-white text-sm">G</div>
              <span className="font-bold text-lg">
                <span className="text-brand">Game</span>
                <span className="text-white">Plaza</span>
              </span>
            </Link>
            <p className="text-gray-600 text-sm leading-relaxed">
              Маркетплейс цифровых товаров. Официальный партнёр Digiseller.
              Игры, программы, подписки и ключи активации.
            </p>
          </div>

          {/* Каталог */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Каталог</h4>
            <ul className="space-y-2.5">
              {CATALOG_LINKS.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-gray-600 hover:text-white text-sm transition-colors">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Информация */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Информация</h4>
            <ul className="space-y-2.5">
              {INFO_LINKS.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-gray-600 hover:text-white text-sm transition-colors">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Поддержка */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Поддержка</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:support@gameplaza.site" className="text-gray-600 hover:text-white text-sm transition-colors">
                  support@gameplaza.site
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-600 text-sm">Ответ до 24 часов</span>
              </div>
            </div>
            <div className="mt-5">
              <p className="text-gray-700 text-xs mb-2">Принимаем оплату</p>
              <div className="flex gap-2 flex-wrap">
                {["Visa", "MC", "МИР", "СБП"].map(p => (
                  <span key={p} className="px-2.5 py-1 bg-[#1a1a26] border border-[#1f2937] rounded-lg text-xs text-gray-500">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#1f2937] mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-gray-700 text-sm">© {year} GamePlaza. Все права защищены.</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-gray-700 hover:text-gray-500 text-xs transition-colors">О нас</Link>
            <Link href="/help" className="text-gray-700 hover:text-gray-500 text-xs transition-colors">Помощь</Link>
            <span className="text-gray-800 text-xs">gameplaza.site</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
