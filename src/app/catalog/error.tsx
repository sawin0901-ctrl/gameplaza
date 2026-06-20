"use client"
import Link from "next/link"

export default function CatalogError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-white mb-2">Не удалось загрузить каталог</h2>
      <p className="text-gray-500 text-sm mb-6">Попробуйте обновить страницу</p>
      <div className="flex gap-3 justify-center">
        <button onClick={reset} className="btn-primary px-6 py-2.5 text-sm">Попробовать снова</button>
        <Link href="/" className="btn-ghost px-6 py-2.5 text-sm">На главную</Link>
      </div>
    </div>
  )
}
