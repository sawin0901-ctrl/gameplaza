import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Страница не найдена | GamePlaza" }

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 text-[120px] font-black text-brand/10 leading-none select-none">404</div>
      <h1 className="text-3xl font-bold text-[var(--text)] mb-3">Страница не найдена</h1>
      <p className="text-[var(--text-3)] mb-8 max-w-md">Такой страницы не существует или она была удалена. Возможно, вы ошиблись в адресе.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/catalog" className="btn-primary px-8 py-3 text-base">Перейти в каталог</Link>
        <Link href="/" className="btn-outline px-8 py-3 text-base">На главную</Link>
      </div>
      <div className="mt-12 text-sm text-[var(--text-3)]">
        <p>Ищете что-то конкретное?</p>
        <Link href="/catalog" className="text-brand hover:underline mt-1 inline-block">Поиск по каталогу</Link>
      </div>
    </div>
  )
}