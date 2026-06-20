import { prisma } from "./prisma"

export interface ImportSettings {
  markupType: "none" | "fixed" | "percent"
  markupValue: number
  markupMinProfit: number
  syncEnabled: boolean
  syncInterval: number // минуты: 5, 15, 60, 1440
}

const DEFAULTS: ImportSettings = {
  markupType: "none",
  markupValue: 0,
  markupMinProfit: 0,
  syncEnabled: false,
  syncInterval: 60,
}

export async function getImportSettings(): Promise<ImportSettings> {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { startsWith: "import_" } },
    })
    const map = new Map(rows.map(r => [r.key, r.value]))
    return {
      markupType: (map.get("import_markup_type") ?? DEFAULTS.markupType) as ImportSettings["markupType"],
      markupValue: parseFloat(map.get("import_markup_value") ?? "0") || 0,
      markupMinProfit: parseFloat(map.get("import_markup_min_profit") ?? "0") || 0,
      syncEnabled: map.get("import_sync_enabled") === "true",
      syncInterval: parseInt(map.get("import_sync_interval") ?? "60", 10) || 60,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function saveImportSettings(s: Partial<ImportSettings>): Promise<void> {
  const entries: { key: string; value: string }[] = []
  if (s.markupType !== undefined) entries.push({ key: "import_markup_type", value: s.markupType })
  if (s.markupValue !== undefined) entries.push({ key: "import_markup_value", value: String(s.markupValue) })
  if (s.markupMinProfit !== undefined) entries.push({ key: "import_markup_min_profit", value: String(s.markupMinProfit) })
  if (s.syncEnabled !== undefined) entries.push({ key: "import_sync_enabled", value: s.syncEnabled ? "true" : "false" })
  if (s.syncInterval !== undefined) entries.push({ key: "import_sync_interval", value: String(s.syncInterval) })

  if (!entries.length) return
  await prisma.$transaction(
    entries.map(e =>
      prisma.systemSetting.upsert({ where: { key: e.key }, create: e, update: { value: e.value } })
    )
  )
}

export function applyMarkup(supplierPrice: number, settings: ImportSettings): number {
  if (settings.markupType === "none" || settings.markupValue <= 0) return supplierPrice

  let result = supplierPrice
  if (settings.markupType === "percent") {
    result = supplierPrice * (1 + settings.markupValue / 100)
  } else if (settings.markupType === "fixed") {
    result = supplierPrice + settings.markupValue
  }

  if (settings.markupMinProfit > 0 && result < supplierPrice + settings.markupMinProfit) {
    result = supplierPrice + settings.markupMinProfit
  }

  return Math.ceil(result * 100) / 100
}
