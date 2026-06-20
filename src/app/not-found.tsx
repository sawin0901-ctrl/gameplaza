import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Страница не найдена — GamePlaza",
}

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-8xl font-bold text-brand mb-4 opacity-80">404</div>
      <h1 className="text-2xl font-bold text-white mb-2">Страница не найдена</h1>
      <p className="text-gray-500 text-sm mb-8">
        Возможно, ссылка устарела или товар был удалён из каталога
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/catalog" className="btn-primary px-8 py-3 text-sm">В каталог</Link>
        <Link href="/" className="btn-ghost px-8 py-3 text-sm">На главную</Link>
      </div>
    </div>
  )
}
