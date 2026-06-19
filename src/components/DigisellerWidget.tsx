"use client"
import { useEffect, useRef, useState } from "react"

interface Props {
  productId: number
  price: number
}

export default function DigisellerWidget({ productId, price }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const attempts = useRef(0)

  useEffect(() => {
    const SELLER_ID = process.env.NEXT_PUBLIC_DIGISELLER_SELLER_ID
    if (!SELLER_ID || !ref.current) return

    const scriptId = `digi-script-${productId}`
    if (document.getElementById(scriptId)) {
      setLoaded(true)
      return
    }

    function tryLoad() {
      attempts.current++
      const script = document.createElement("script")
      script.id = scriptId
      script.src = `https://www.digiseller.ru/js/show_button.js?seller_id=${SELLER_ID}&product_id=${productId}`
      script.async = true
      script.defer = true
      script.onload = () => setLoaded(true)
      script.onerror = () => {
        if (attempts.current < 3) setTimeout(tryLoad, 3000 * attempts.current)
        else setError(true)
      }
      document.body.appendChild(script)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { observer.disconnect(); tryLoad() }
    }, { rootMargin: "200px" })

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [productId])

  return (
    <div ref={ref}>
      {!loaded && !error && (
        <div className="animate-pulse bg-gray-700 rounded-lg h-14 w-48" />
      )}
      {error && (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm mb-2">Виджет недоступен</p>
          <p className="text-white font-bold text-xl">{price.toLocaleString("ru-RU")} ₽</p>
        </div>
      )}
      <div id={`digiseller-button-${productId}`} className={loaded ? "" : "hidden"} />
    </div>
  )
}