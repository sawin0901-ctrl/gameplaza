const PATTERNS = [
  // plati.market/itm/nazvan/123456 или /itm/123456
  /plati\.market\/itm\/(?:[^/\s?#]+\/)?(\d{5,10})/i,
  // digiseller.ru?id_d=123456 или id=123456
  /[?&](?:id_d?|id_goods)=(\d{5,10})/i,
  // digiseller.ru/info/123456
  /digiseller\.(?:ru|com)\/(?:info|asp2)[/]?(\d{5,10})/i,
  // любой URL с числом 5-10 цифр в конце пути
  /\/(\d{5,10})(?:[/?#]|$)/,
]

export function parseDigisellerId(input: string): number | null {
  const s = input.trim()
  if (!s) return null

  // Просто число
  if (/^\d{5,10}$/.test(s)) {
    const n = parseInt(s, 10)
    return n > 0 ? n : null
  }

  // FunPay — разные ID, не совместимы с Digiseller
  if (s.includes("funpay.com")) return null

  for (const pattern of PATTERNS) {
    const m = s.match(pattern)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > 0) return n
    }
  }

  return null
}

export interface ParseResult {
  ids: number[]
  unsupported: string[]
  funpay: number
  total: number
}

export function parseInputList(text: string): ParseResult {
  const lines = text.split(/[\n,]+/).map(l => l.trim()).filter(Boolean)
  const ids: number[] = []
  const unsupported: string[] = []
  let funpay = 0
  const seen = new Set<number>()

  for (const line of lines) {
    if (line.includes("funpay.com")) {
      funpay++
      continue
    }
    const id = parseDigisellerId(line)
    if (id !== null && !seen.has(id)) {
      ids.push(id)
      seen.add(id)
    } else if (id === null) {
      unsupported.push(line.length > 80 ? line.slice(0, 77) + "..." : line)
    }
  }

  return { ids, unsupported, funpay, total: lines.length }
}
