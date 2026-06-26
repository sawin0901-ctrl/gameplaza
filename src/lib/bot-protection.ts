// Domains known to provide disposable/throwaway email addresses
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamail.net", "guerrillamail.org",
  "temp-mail.org", "tempmail.com", "tempinbox.com", "10minutemail.com",
  "20minutemail.com", "tempr.email", "throwam.com", "dispostable.com",
  "trashmail.com", "trashmail.at", "trashmail.me", "trashmail.io",
  "maildrop.cc", "yopmail.com", "sharklasers.com", "spam4.me",
  "tmpmail.net", "tmpmail.org", "emailondeck.com", "discard.email",
  "fakeinbox.com", "armyspy.com", "cuvox.de", "dayrep.com", "einrot.com",
  "fleckens.hu", "gustr.com", "jourrapide.com", "rhyta.com",
  "superrito.com", "teleworm.us", "spamgourmet.com", "spamgourmet.net",
  "mailnull.com", "spam.la", "spambox.us", "spamfree24.org",
  "getairmail.com", "filzmail.com", "throwam.com", "0box.eu",
  "33mail.com", "e4ward.com", "mytrashmail.com", "mt2009.com",
  "mt2014.com", "sogetthis.com", "spamherelots.com", "spamhereplease.com",
])

export type BotReason =
  | "disposable_email"
  | "fragmented_local"     // d.o.r.s.e.y@... pattern
  | "excessive_dots"
  | "high_digit_ratio"     // >40% digits in local
  | "consecutive_digits"   // ends with 4+ digits
  | "no_vowels"            // random consonant cluster

export interface BotCheckResult {
  bot: boolean
  score: number        // 0–100, higher = more suspicious
  reasons: BotReason[]
}

export function checkBotEmail(raw: string): BotCheckResult {
  const email = raw.toLowerCase().trim()
  const atIdx = email.indexOf("@")
  if (atIdx < 1) return { bot: false, score: 0, reasons: [] }

  const local  = email.slice(0, atIdx)
  const domain = email.slice(atIdx + 1)
  const reasons: BotReason[] = []
  let score = 0

  // 1. Disposable domain
  if (DISPOSABLE.has(domain)) {
    reasons.push("disposable_email")
    score += 80
  }

  const parts = local.split(".")

  // 2. Fragmented local: many short segments → d.or.s.eybe.r6.5.70@gmail.com
  if (parts.length >= 4) {
    const shortCount = parts.filter(p => p.length <= 3).length
    const shortRatio = shortCount / parts.length
    if (shortRatio >= 0.6) {
      reasons.push("fragmented_local")
      score += 60
    }
  }

  // 3. Excessive dots overall
  const dotCount = (local.match(/\./g) ?? []).length
  if (dotCount >= 4) {
    reasons.push("excessive_dots")
    score += 30
  }

  // 4. High digit ratio
  const digits = (local.replace(/\./g, "").match(/\d/g) ?? []).length
  const base   = local.replace(/\./g, "").length
  if (base > 5 && digits / base > 0.4) {
    reasons.push("high_digit_ratio")
    score += 35
  }

  // 5. Ends with 4+ consecutive digits (e.g. r6570)
  if (/\d{4,}$/.test(local.replace(/\./g, ""))) {
    reasons.push("consecutive_digits")
    score += 20
  }

  // 6. No vowels in a non-trivial local part
  const lettersOnly = local.replace(/[^a-z]/g, "")
  if (lettersOnly.length > 5 && !/[aeiou]/.test(lettersOnly)) {
    reasons.push("no_vowels")
    score += 40
  }

  return {
    bot: score >= 60,
    score: Math.min(100, score),
    reasons,
  }
}

/** Human-readable description for the admin panel */
export function botReasonLabel(reason: BotReason): string {
  return {
    disposable_email:    "Одноразовый email",
    fragmented_local:    "Разбитый адрес (d.o.r.s.@...)",
    excessive_dots:      "Слишком много точек",
    high_digit_ratio:    "Много цифр в адресе",
    consecutive_digits:  "Цифровой суффикс",
    no_vowels:           "Нет гласных (случайные символы)",
  }[reason] ?? reason
}
