"use client"
import { useLocale } from "./LocaleProvider"

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  return (
    <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
      <button onClick={() => setLocale("ru")}
        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${locale === "ru" ? "bg-brand text-white" : "text-gray-500 hover:text-white"}`}>
        RU
      </button>
      <button onClick={() => setLocale("en")}
        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${locale === "en" ? "bg-brand text-white" : "text-gray-500 hover:text-white"}`}>
        EN
      </button>
    </div>
  )
}
