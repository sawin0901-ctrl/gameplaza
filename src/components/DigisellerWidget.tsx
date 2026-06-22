"use client"
import { useEffect, useState, useRef } from "react"

const AFFILIATE_ID = "1459731"

interface Props { productId: number }

function hasWidgetContent(wrapper: HTMLDivElement): boolean {
  const digi = wrapper.querySelector(".digiseller-buy-standalone")
  if (digi && digi.children.length > 0) return true
  if (digi && digi.textContent && digi.textContent.trim().length > 10) return true
  if (wrapper.querySelector("iframe")) return true
  if (wrapper.querySelector("table")) return true
  if (wrapper.querySelector("form")) return true
  return false
}

export default function DigisellerWidget({ productId }: Props) {
  const [ready, setReady] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReady(false)
    const wrapper = wrapperRef.current
    if (!wrapper) return

    if (hasWidgetContent(wrapper)) { setReady(true); return }

    let done = false
    const markReady = () => { if (!done) { done = true; setReady(true) } }

    // MutationObserver on WRAPPER (catches Digiseller replacing/adding children)
    const obs = new MutationObserver(() => { if (hasWidgetContent(wrapper)) markReady() })
    obs.observe(wrapper, { childList: true, subtree: true, attributes: true })

    // Polling every 250ms as backup (covers cases MutationObserver misses)
    const poll = setInterval(() => { if (hasWidgetContent(wrapper)) markReady() }, 250)

    // Hard fallback at 12s
    const timer = setTimeout(markReady, 12_000)

    return () => { obs.disconnect(); clearInterval(poll); clearTimeout(timer) }
  }, [productId])

  return (
    <div ref={wrapperRef} className="relative" style={{ minHeight: "300px" }}>
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