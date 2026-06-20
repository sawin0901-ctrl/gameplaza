"use client"
import { useEffect } from "react"

const SELLER_ID = "1459731"

interface Props {
  productId: number
}

export default function DigisellerWidget({ productId }: Props) {
  useEffect(() => {
    // Remove stale script so Digiseller re-scans DOM for the new div
    document.getElementById("digiseller-js")?.remove()
    document.getElementById("digiseller-inline")?.remove()

    // Load CSS once
    if (!document.getElementById("digiseller-css")) {
      const link = document.createElement("link")
      link.type = "text/css"
      link.rel = "stylesheet"
      link.id = "digiseller-css"
      link.href = `//shop.digiseller.com/xml/store2_css.asp?seller_id=${SELLER_ID}`
      document.head.appendChild(link)
    }

    // Load Digiseller API — runs after div is already in DOM
    const script = document.createElement("script")
    script.async = true
    script.id = "digiseller-js"
    script.src = `//digiseller.com/store2/digiseller-api.js.asp?seller_id=${SELLER_ID}`
    document.head.appendChild(script)
  }, [productId])

  return (
    <div
      style={{ display: "inline-block", width: "100%" }}
      className="digiseller-buy-standalone"
      data-id={String(productId)}
      data-ai={SELLER_ID}
      data-img="0"
      data-img-size=""
      data-name="1"
      data-price="1"
      data-no-price="0"
    />
  )
}
