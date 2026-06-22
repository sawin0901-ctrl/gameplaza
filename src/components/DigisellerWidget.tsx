"use client"
import { useEffect, useState, useRef } from "react"

const AFFILIATE_ID = "1459731"

interface Props { productId: number }

export default function DigisellerWidget({ productId }: Props) {
  const [ready, setReady] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReady(false)
    const el = ref.current
    if (!el) return

    // Already rendered (e.g. fast cache hit)
    if (el.innerHTML.trim().length > 0) { setReady(true); return }

    const obs = new MutationObserver(() => {
      if (el.innerHTML.trim().length > 0) { setReady(true); obs.disconnect() }
    })
    obs.observe(el, { childList: true, subtree: true })

    // Safety fallback — show widget div regardless after 10s
    const timer = setTimeout(() => setReady(true), 10_000)
    return () => { obs.disconnect(); clearTimeout(timer) }
  }, [productId])

  return (
    <div className="relative" style={{ minHeight: "300px" }}>
      {!ready && (
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 10 }}
          className="animate-pulse rounded-xl bg-white/5 p-4 overflow-hidden"
        >
          <div className="h-8 w-20 rounded bg-white/10 mb-2" />
          <div className="h-3 w-28 rounded bg-white/10 mb-4" />
          <div className="space-y-2">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="h-9 rounded-lg bg-white/10" />
            ))}
          </div>
          <div className="mt-4 h-11 rounded-xl bg-violet-500/20" />
        </div>
      )}
      <div
        ref={ref}
        className="digiseller-buy-standalone"
        data-id={String(productId)}
        data-ai={AFFILIATE_ID}
        data-img="0"
        data-img-size=""
        data-name="1"
        data-price="1"
        data-no-price="0"
      />
    </div>
  )
}