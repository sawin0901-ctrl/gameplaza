import type { Metadata } from "next"
import "./globals.css"
import Header from "../components/Header"
import Footer from "../components/Footer"
import DigisellerScript from "../components/DigisellerScript"
import Providers from "../components/Providers"

export const metadata: Metadata = {
  title: { default: "GamePlaza — магазин цифровых товаров", template: "%s | GamePlaza" },
  description: "Купить цифровые товары: игры, ПО, ключи активации. Быстро, безопасно, выгодно.",
  metadataBase: new URL("https://gameplaza.site"),
  openGraph: { siteName: "GamePlaza", locale: "ru_RU", type: "website" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body>
        <Providers>
          <DigisellerScript />
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
