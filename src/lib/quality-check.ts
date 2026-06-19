import { DigisellerProduct } from "./digiseller"

export interface QualityResult {
  valid: boolean
  reasons: string[]
}

export function checkProductQuality(product: DigisellerProduct): QualityResult {
  const reasons: string[] = []

  if (!product.name_goods?.trim()) reasons.push("Нет названия")
  if (!product.info_goods?.trim() || product.info_goods.trim().length < 30)
    reasons.push("Нет или слишком короткое описание")
  if (!product.image_link) reasons.push("Нет изображения")
  if (!product.price_rub || product.price_rub <= 0) reasons.push("Нет цены")
  if (product.cnt_goods <= 0) reasons.push("Нет в наличии")
  if (product.status !== 1) reasons.push("Товар отключён продавцом")

  const descOnlyLinks = /^(\s*<a[^>]*>.*?<\/a>\s*)+$/i.test(product.info_goods ?? "")
  if (descOnlyLinks) reasons.push("Описание содержит только ссылки")

  return { valid: reasons.length === 0, reasons }
}