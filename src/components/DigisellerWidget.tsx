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
  const [timedOut, setTimedOut] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReady(false)
    setTimedOut(false)
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

    // Hard fallback at 12s — if widget still empty, show refresh hint
    const timer = setTimeout(() => {
      if (!done) {
        done = true
        setReady(true)
        if (wrapper && !hasWidgetContent(wrapper)) setTimedOut(true)
      }
    }, 12_000)

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
      {timedOut && (
        <div className="mt-3 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-center text-sm text-yellow-300 space-y-2">
          <p>Сайт в разработке. Если кнопка «Купить» не появилась —</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Обновить страницу
          </button>
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