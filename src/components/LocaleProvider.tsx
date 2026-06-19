"use client"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type Locale = "ru" | "en"

type Dict = {
  nav: { catalog: string; categories: string; deals: string; search: string; login: string; register: string; profile: string; logout: string }
  hero: { badge: string; title: string; titleAccent: string; subtitle: string; searchBtn: string }
  catalog: { title: string; found: string; notFound: string; showAll: string; sortNewest: string; sortPriceAsc: string; sortPriceDesc: string; sortPopular: string; filterAll: string; filterPrice: string; filterFrom: string; filterTo: string; filterApply: string; filterReset: string }
  product: { new: string; bought: string; inStock: string; outOfStock: string; description: string; related: string }
  sections: { categories: string; newArrivals: string; popular: string; viewAll: string; allCategories: string }
  features: { title: string; sub: string }
  cta: { title: string; sub: string; catalog: string; register: string }
  auth: { loginTitle: string; registerTitle: string; email: string; password: string; name: string; loginBtn: string; registerBtn: string; wrongCreds: string }
  common: { loading: string; error: string; save: string; cancel: string }
}

const T: Record<Locale, Dict> = {
  ru: {
    nav: { catalog: "Каталог", categories: "Категории", deals: "Акции", search: "Поиск по каталогу...", login: "Войти", register: "Регистрация", profile: "Профиль", logout: "Выйти" },
    hero: { badge: "товаров в наличии", title: "Цифровые товары", titleAccent: "по лучшим ценам", subtitle: "Игры, программы, ключи активации и подписки. Мгновенная доставка.", searchBtn: "Найти" },
    catalog: { title: "Все товары", found: "Найдено", notFound: "Ничего не найдено", showAll: "Показать все товары", sortNewest: "Новые сначала", sortPriceAsc: "Дешевле", sortPriceDesc: "Дороже", sortPopular: "Популярные", filterAll: "Все товары", filterPrice: "Цена, ₽", filterFrom: "От", filterTo: "До", filterApply: "Применить", filterReset: "Сбросить" },
    product: { new: "Новинка", bought: "куплено", inStock: "В наличии", outOfStock: "Нет в наличии", description: "Описание", related: "Похожие товары" },
    sections: { categories: "Категории", newArrivals: "🆕 Новые поступления", popular: "🔥 Популярные товары", viewAll: "Смотреть все", allCategories: "Все категории" },
    features: { title: "Почему GamePlaza?", sub: "Безопасно, быстро, удобно" },
    cta: { title: "Готовы начать покупки?", sub: "Мгновенная доставка через Digiseller.", catalog: "Открыть каталог", register: "Зарегистрироваться" },
    auth: { loginTitle: "Вход в аккаунт", registerTitle: "Создать аккаунт", email: "Email", password: "Пароль", name: "Имя", loginBtn: "Войти", registerBtn: "Зарегистрироваться", wrongCreds: "Неверный email или пароль" },
    common: { loading: "Загрузка...", error: "Ошибка", save: "Сохранить", cancel: "Отмена" },
  },
  en: {
    nav: { catalog: "Catalog", categories: "Categories", deals: "Deals", search: "Search catalog...", login: "Sign In", register: "Sign Up", profile: "Profile", logout: "Sign Out" },
    hero: { badge: "products available", title: "Digital goods", titleAccent: "at the best prices", subtitle: "Games, software, activation keys and subscriptions. Instant delivery.", searchBtn: "Search" },
    catalog: { title: "All Products", found: "Found", notFound: "Nothing found", showAll: "Show all products", sortNewest: "Newest first", sortPriceAsc: "Cheapest", sortPriceDesc: "Most expensive", sortPopular: "Popular", filterAll: "All products", filterPrice: "Price", filterFrom: "From", filterTo: "To", filterApply: "Apply", filterReset: "Reset" },
    product: { new: "New", bought: "sold", inStock: "In Stock", outOfStock: "Out of Stock", description: "Description", related: "Related Products" },
    sections: { categories: "Categories", newArrivals: "🆕 New Arrivals", popular: "🔥 Popular Products", viewAll: "View all", allCategories: "All categories" },
    features: { title: "Why GamePlaza?", sub: "Safe, fast, convenient" },
    cta: { title: "Ready to start shopping?", sub: "Instant delivery via Digiseller.", catalog: "Open Catalog", register: "Sign Up" },
    auth: { loginTitle: "Sign In", registerTitle: "Create Account", email: "Email", password: "Password", name: "Name", loginBtn: "Sign In", registerBtn: "Create Account", wrongCreds: "Invalid email or password" },
    common: { loading: "Loading...", error: "Error", save: "Save", cancel: "Cancel" },
  },
}

interface LocaleCtx {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Dict
}

const Ctx = createContext<LocaleCtx>({ locale: "ru", setLocale: () => {}, t: T.ru })

export function useLocale() { return useContext(Ctx) }

export default function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru")

  useEffect(() => {
    const saved = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)?.[1] as Locale | undefined
    if (saved === "en" || saved === "ru") setLocaleState(saved)
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    document.cookie = `locale=${l};path=/;max-age=31536000`
  }

  return <Ctx.Provider value={{ locale, setLocale, t: T[locale] }}>{children}</Ctx.Provider>
}
