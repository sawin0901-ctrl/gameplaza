"use client"
import { useEffect } from "react"
import { usePathname } from "next/navigation"

export default function DigisellerScript() {
  const pathname = usePathname()

  useEffect(() => {
    // Clean up Digiseller scripts when navigating away from product pages
    // (product pages load the script themselves via DigisellerWidget)
    if (!pathname.startsWith("/product/")) {
      document.getElementById("digiseller-js")?.remove()
      document.getElementById("digiseller-inline")?.remove()
    }
  }, [pathname])

  return null
}
