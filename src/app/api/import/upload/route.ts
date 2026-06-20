import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { importQueue } from "../../../../lib/queue"
import { parseInputList } from "../../../../lib/import-url-parser"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const MAX_IDS = 500
const ALLOWED_TYPES = ["text/plain", "text/csv", "application/csv", "application/octet-stream"]
const ALLOWED_EXT = ["txt", "csv"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Ошибка чтения файла" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Выберите файл для загрузки" }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Файл слишком большой. Максимум 2 МБ." }, { status: 400 })
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({
      error: `Формат .${ext} не поддерживается. Загружайте TXT или CSV файлы.\nDля Excel: Файл → Сохранить как → CSV (разделители-запятые)`,
    }, { status: 400 })
  }

  // Читаем как текст
  let text: string
  try {
    text = await file.text()
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать содержимое файла" }, { status: 400 })
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Файл пустой" }, { status: 400 })
  }

  // Парсим ID из текста
  const { ids, unsupported, funpay, total } = parseInputList(text)

  if (ids.length === 0) {
    return NextResponse.json({
      error: `Не найдено ни одного ID товара. Строк в файле: ${total}. Убедитесь что каждый ID на отдельной строке.`,
      sample: text.split("\n").slice(0, 3).join(" | "),
    }, { status: 400 })
  }

  const toProcess = ids.slice(0, MAX_IDS)
  const truncated = ids.length > MAX_IDS ? ids.length - MAX_IDS : 0

  // Проверяем дубли
  const existing = await prisma.product.findMany({
    where: { digisellerProductId: { in: toProcess } },
    select: { digisellerProductId: true, name: true, isActive: true },
  })
  const existingMap = new Map(existing.map(e => [e.digisellerProductId, e]))

  const newIds = toProcess.filter(id => !existingMap.has(id))
  const duplicates = toProcess.filter(id => existingMap.has(id))

  if (newIds.length > 0) {
    const jobs = newIds.map((id, i) => ({
      name: "import-product",
      data: { productId: id },
      opts: { jobId: `product-${id}`, delay: i * 15000 },
    }))
    await importQueue.addBulk(jobs)
  }

  return NextResponse.json({
    fileName: file.name,
    fileSize: file.size,
    linesInFile: total,
    scheduled: newIds.length,
    duplicates: duplicates.length,
    unsupported: unsupported.length,
    funpay,
    truncated,
  })
}
