"use client"
import { usePathname } from "next/navigation"
import Header from "./Header"
import Footer from "./Footer"
import { CurrencyTicker } from "./CurrencyTicker"
import ScrollToTop from "./ScrollToTop"

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith("/admin")

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <CurrencyTicker />
      <Header />
      <main id="main-content" className="min-h-screen">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </>
  )
}