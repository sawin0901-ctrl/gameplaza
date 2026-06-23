import type { Metadata } from "next"
import "./globals.css"
import Header from "../components/Header"
import Footer from "../components/Footer"
import DigisellerScript from "../components/DigisellerScript"
import Providers from "../components/Providers"
import { ThemeProvider } from "../components/ThemeProvider"
import { Suspense } from "react"
import AnalyticsTracker from "../components/AnalyticsTracker"
import { CurrencyTicker } from "../components/CurrencyTicker"
import ScrollToTop from "../components/ScrollToTop"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"

export const metadata: Metadata = {
  title: { default: "GamePlaza — магазин цифровых товаров", template: "%s | GamePlaza" },
  description: "Купить цифровые товары: игры, ПО, ключи активации. Быстро, безопасно, выгодно.",
  metadataBase: new URL(SITE_URL),
  openGraph: { siteName: "GamePlaza", locale: "ru_RU", type: "website" },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/icon", sizes: "32x32", type: "image/png" },
      { url: "/icon", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icon",
  },
  other: {
    "google-site-verification": process.env.GOOGLE_SITE_VERIFICATION ?? "",
    ...(process.env.YANDEX_VERIFICATION ? { "yandex-verification": process.env.YANDEX_VERIFICATION } : {}),
  },
}

const themeScript = `(function(){try{var s=localStorage.getItem('gp-theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var t=s||p;document.documentElement.setAttribute('data-theme',t);if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`

const orgJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GamePlaza",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  email: "support@gameplaza.site",
  description: "Магазин цифровых товаров: игры, ключи активации, подписки",
})

const siteJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "GamePlaza",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/catalog?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgJsonLd }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLd }} />
        <link rel="preconnect" href="https://digiseller.com" />
        <link rel="preconnect" href="https://cdn.digiseller.ru" />
        <link rel="preconnect" href="https://shop.digiseller.com" />
        <link rel="dns-prefetch" href="https://graph.digiseller.ru" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Providers>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
            >
              Перейти к содержимому
            </a>
            <Suspense fallback={null}>
              <AnalyticsTracker />
            </Suspense>
            <DigisellerScript />
            <CurrencyTicker />
        <Header />
            <main id="main-content" className="min-h-screen">
              {children}
            </main>
            <Footer />
            <ScrollToTop />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}