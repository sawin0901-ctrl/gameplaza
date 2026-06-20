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
  metadataBase: new URL("https://gameplaza.site"),
  openGraph: { siteName: "GamePlaza", locale: "ru_RU", type: "website" },
}

// Инлайн-скрипт для предотвращения мигания темы (FOUC)
// Запускается до гидратации React, сразу применяет тему из localStorage
const themeScript = `
  (function() {
    try {
      var saved = localStorage.getItem('gp-theme');
      var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var theme = saved || preferred;
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch(e) {}
  })();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        {/* Anti-flash script — синхронный, запускается до рендера */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Providers>
            <DigisellerScript />
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
