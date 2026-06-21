import axios from "axios"
import * as fs from "fs/promises"
import * as path from "path"
import * as crypto from "crypto"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products")
const PUBLIC_PATH = "/uploads/products"

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
}

export async function downloadImage(url: string): Promise<string> {
  if (!url || !url.startsWith("http")) return url
  try {
    await ensureDir()
    const hash = crypto.createHash("md5").update(url).digest("hex")
    const urlNoQuery = url.split("?")[0]
    const rawExt = urlNoQuery.split(".").pop()?.slice(0, 4).toLowerCase() ?? "jpg"
    const ext = ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(rawExt) ? rawExt : "jpg"
    const filename = `${hash}.${ext}`
    const filePath = path.join(UPLOAD_DIR, filename)

    try { await fs.access(filePath); return `${PUBLIC_PATH}/${filename}` } catch {}

    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://plati.market/",
      },
    })
    const buf = Buffer.from(res.data as ArrayBuffer)
    if (buf.length < 500) return url
    await fs.writeFile(filePath, buf)
    return `${PUBLIC_PATH}/${filename}`
  } catch {
    return url
  }
}

export async function downloadImages(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(urls.map(downloadImage))
  return results.map((r, i) => r.status === "fulfilled" ? r.value : urls[i])
}
