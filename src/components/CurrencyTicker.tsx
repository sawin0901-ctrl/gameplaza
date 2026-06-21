"use client"
import { useEffect, useState } from "react"

interface Rates {
  usd: number | null
  eur: number | null
  btcRub: number | null
  btcUsd: number | null
}

function Arrow({ diff }: { diff: number }) {
  if (diff > 0) return <span className="text-emerald-400 text-[10px]">▲</span>
  if (diff < 0) return <span className="text-red-400 text-[10px]">▼</span>
  return null
}

export function CurrencyTicker() {
  const [rates, setRates] = useState<Rates | null>(null)
  const [prev, setPrev] = useState<Rates | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/rates")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) { setRates(d); setLoaded(true) } })
      .catch(() => {})

    const t = setInterval(() => {
      fetch("/api/rates")
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d && !d.error) {
            setPrev(p => p ?? d)
            setRates(d)
          }
        }).catch(() => {})
    }, 60 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (n: number, dec = 2) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: dec, maximumFractionDigits: dec })

  if (!loaded) return <div className="h-7 bg-[var(--bg-secondary)] border-b border-[var(--border)]" />

  const items = [
    rates?.usd != null && {
      label: "USD",
      icon: "$",
      value: fmt(rates.usd) + " ₽",
      diff: prev?.usd != null ? rates!.usd - prev.usd : 0,
    },
    rates?.eur != null && {
      label: "EUR",
      icon: "€",
      value: fmt(rates.eur) + " ₽",
      diff: prev?.eur != null ? rates!.eur - prev.eur : 0,
    },
    rates?.btcUsd != null && {
      label: "BTC",
      icon: "₿",
      value: "$" + fmt(rates.btcUsd, 0),
      diff: prev?.btcUsd != null ? rates!.btcUsd - prev.btcUsd : 0,
    },
  ].filter(Boolean) as { label: string; icon: string; value: string; diff: number }[]

  return (
    <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 h-7 flex items-center gap-5 overflow-x-auto scrollbar-none">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-1.5 shrink-0">
            <span className="text-[var(--text-3)] text-[11px] font-medium">{item.icon} {item.label}</span>
            <span className="text-[var(--text-2)] text-[11px] font-semibold">{item.value}</span>
            <Arrow diff={item.diff} />
          </div>
        ))}
        <span className="ml-auto text-[var(--text-3)] text-[10px] shrink-0 hidden sm:block opacity-50">ЦБ РФ · CoinGecko</span>
      </div>
    </div>
  )
}