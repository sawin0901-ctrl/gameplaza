"use client"
import { useEffect } from "react"
import { usePathname } from "next/navigation"

const SELLER_ID = "1459731"

export default function DigisellerScript() {
  const pathname = usePathname()
  const isProductPage = pathname.startsWith("/product/")

  useEffect(() => {
    if (!isProductPage) return

    // CSS — add once, reuse across navigations
    if (!document.getElementById("digiseller-css")) {
      const css = document.createElement("link")
      css.rel = "stylesheet"
      css.id = "digiseller-css"
      css.href = `//shop.digiseller.com/xml/store2_css.asp?seller_id=${SELLER_ID}`
      document.head.appendChild(css)
    }

    // JS — remove and re-add on every product page to force re-scan of new widget div
    document.getElementById("digiseller-js")?.remove()
    const js = document.createElement("script")
    js.id = "digiseller-js"
    js.async = true
    js.src = `//digiseller.com/store2/digiseller-api.js.asp?seller_id=${SELLER_ID}&lang=ru`
    document.head.appendChild(js)
  }, [pathname, isProductPage])

  return null
}