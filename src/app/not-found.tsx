import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { absolute: "Страница не найдена | GamePlaza" },
  description: "Запрошенная страница не найдена. Возможно, товар был удалён или вы перешли по устаревшей ссылке.",
  robots: { index: false, follow: false },
}

const POPULAR = [
  { label: "Steam", href: "/catalog/steam" },
  { label: "Xbox", href: "/catalog/xbox" },
  { label: "PlayStation", href: "/catalog/playstation" },
  { label: "Game Pass", href: "/catalog/game-pass" },
  { label: "Программы", href: "/catalog/software" },
  { label: "Акции", href: "/catalog/discount" },
]

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="text-8xl font-black text-brand/20 select-none mb-2">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Страница не найдена</h1>
        <p className="text-gray-500 text-sm mb-8">
          Возможно, товар был удалён или вы перешли по устаревшей ссылке
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link href="/catalog" className="btn-primary px-8 py-3 text-sm font-medium">
            Перейти в каталог
          </Link>
          <Link href="/" className="btn-ghost px-8 py-3 text-sm font-medium">
            На главную
          </Link>
        </div>

        <div>
          <p className="text-gray-600 text-xs uppercase tracking-widest mb-4">Популярные категории</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR.map(c => (
              <Link key={c.href} href={c.href}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}