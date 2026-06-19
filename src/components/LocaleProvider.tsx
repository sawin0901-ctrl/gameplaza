"use client"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import ru from "../../messages/ru.json"
import en from "../../messages/en.json"

export type Locale = "ru" | "en"
const messages = { ru, en }

interface LocaleCtx {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleCtx>({ locale: "ru", setLocale: () => {}, t: k => k })

export function useLocale() { return useContext(LocaleContext) }

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".")
  let cur: unknown = obj
  for (const k of keys) {
    if (typeof cur !== "object" || cur === null) return path
    cur = (cur as Record<string, unknown>)[k]
  }
  return typeof cur === "string" ? cur : path
}

export default function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru")

  useEffect(() => {
    const saved = (document.cookie.match(/(?:^|;\s*)locale=([^;]*)/) ?? [])[1] as Locale | undefined
    if (saved === "en" || saved === "ru") setLocaleState(saved)
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    document.cookie = `locale=${l};path=/;max-age=31536000`
  }

  function t(key: string): string {
    return getNestedValue(messages[locale] as Record<string, unknown>, key)
  }

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
}
