"use client"
import { useEffect } from "react"
import { usePathname } from "next/navigation"

const SELLER_ID = "1459731"

const DIGISELLER_SCRIPT = `!function(e){var l=function(l){return e.cookie.match(new RegExp("(?:^|; )digiseller-"+l+"=([^;]*)"))},i=l("lang"),s=l("cart_uid"),t=i?"&lang="+i[1]:"",d=s?"&cart_uid="+s[1]:"",r=e.getElementsByTagName("head")[0]||e.documentElement,n=e.createElement("link"),a=e.createElement("script");n.type="text/css",n.rel="stylesheet",n.id="digiseller-css",n.href="//shop.digiseller.com/xml/store2_css.asp?seller_id=${SELLER_ID}",a.async=!0,a.id="digiseller-js",a.src="//digiseller.com/store2/digiseller-api.js.asp?seller_id=${SELLER_ID}"+t+d,!e.getElementById(n.id)&&r.appendChild(n),!e.getElementById(a.id)&&r.appendChild(a)}(document);`

export default function DigisellerScript() {
  const pathname = usePathname()

  useEffect(() => {
    // Remove old script to force re-init on navigation
    const old = document.getElementById("digiseller-js")
    if (old) old.remove()

    const el = document.createElement("script")
    el.id = "digiseller-js-inline"
    el.textContent = DIGISELLER_SCRIPT
    document.head.appendChild(el)

    return () => {
      document.getElementById("digiseller-js-inline")?.remove()
    }
  }, [pathname])

  return null
}