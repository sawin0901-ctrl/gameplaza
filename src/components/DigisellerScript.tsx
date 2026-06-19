"use client"
import { useEffect } from "react"
import { usePathname } from "next/navigation"

const SELLER_ID = "1459731"

export default function DigisellerScript() {
  const pathname = usePathname()

  useEffect(() => {
    if (!document.getElementById("digiseller-css")) {
      const link = document.createElement("link")
      link.type = "text/css"
      link.rel = "stylesheet"
      link.id = "digiseller-css"
      link.href = `//shop.digiseller.com/xml/store2_css.asp?seller_id=${SELLER_ID}`
      document.head.appendChild(link)
    }

    // Re-load script on every route change to re-initialize all widgets on new page
    const prev = document.getElementById("digiseller-js")
    if (prev) prev.remove()

    const t = setTimeout(() => {
      const s = document.createElement("script")
      s.async = true
      s.id = "digiseller-js"
      s.src = `//digiseller.com/store2/digiseller-api.js.asp?seller_id=${SELLER_ID}&lang=ru-RU`
      document.head.appendChild(s)
    }, 80)

    return () => clearTimeout(t)
  }, [pathname])

  return null
}
