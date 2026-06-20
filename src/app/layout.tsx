import type { Metadata } from "next"
import "./globals.css"
import Header from "../components/Header"
import Footer from "../components/Footer"
import DigisellerScript from "../components/DigisellerScript"
import Providers from "../components/Providers"
import { ThemeProvider } from "../components/ThemeProvider"

export const metadata: Metadata = {
  title: { default: "GamePlaza — магазин цифровых товаров", template: "%s | GamePlaza" },
  description: "Купить цифровые товары: игры, ПО, ключи активации. Быстро, безопасно, выгодно.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"),
  openGraph: { siteName: "GamePlaza", locale: "ru_RU", type: "website" },
  other: {
    "google-site-verification": process.env.GOOGLE_SITE_VERIFICATION ?? "",
  },
}

const themeScript = `(function(){try{var s=localStorage.getItem('gp-theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var t=s||p;document.documentElement.setAttribute('data-theme',t);if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: применяет тему до рендера React */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Preconnect для ускорения загрузки Digiseller-виджета */}
        <link rel="preconnect" href="https://cdn.digiseller.ru" />
        <link rel="preconnect" href="https://shop.digiseller.com" />
        <link rel="dns-prefetch" href="https://graph.digiseller.ru" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Providers>
            {/* Skip to main content — доступность (Accessibility) */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
            >
              Перейти к содержимому
            </a>
            <DigisellerScript />
            <Header />
            <main id="main-content" className="min-h-screen">
              {children}
            </main>
            <Footer />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
