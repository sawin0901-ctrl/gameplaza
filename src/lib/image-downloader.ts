import axios from "axios"
import * as fs from "fs/promises"
import * as path from "path"
import * as crypto from "crypto"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products")
const PUBLIC_PATH = "/uploads/products"

// Image magic bytes for validation
function isValidImageBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false
  const b = buf
  // JPEG: FF D8 FF
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return true
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return true
  // GIF: 47 49 46
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return true
  // WebP: RIFF....WEBP
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return true
  // BMP: 42 4D
  if (b[0] === 0x42 && b[1] === 0x4D) return true
  // AVIF / HEIC (ftyp box)
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return true
  return false
}

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
}

export async function downloadImage(url: string): Promise<string> {
  if (!url) return url
  if (!url.startsWith("http")) return url

  try {
    await ensureDir()

    const hash = crypto.createHash("md5").update(url).digest("hex")
    const urlNoQuery = url.split("?")[0]
    const rawExt = urlNoQuery.split(".").pop()?.slice(0, 4).toLowerCase() ?? ""
    const ext = ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(rawExt) ? rawExt : "jpg"
    const filename = `${hash}.${ext}`
    const filePath = path.join(UPLOAD_DIR, filename)

    // Return cached — but verify it's a valid image
    try {
      const stat = await fs.stat(filePath)
      if (stat.size > 500) {
        const head = Buffer.alloc(12)
        const fh = await fs.open(filePath, "r")
        await fh.read(head, 0, 12, 0)
        await fh.close()
        if (isValidImageBuffer(head)) return `${PUBLIC_PATH}/${filename}`
        // Cache is corrupted — delete and re-download
        await fs.unlink(filePath).catch(() => {})
      }
    } catch {}

    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 25000,
      maxContentLength: 10 * 1024 * 1024, // 10MB max
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/avif,image/*,*/*;q=0.8",
        "Referer": "https://plati.market/",
      },
    })

    const buf = Buffer.from(res.data as ArrayBuffer)

    if (!isValidImageBuffer(buf)) {
      console.warn(`[image-dl] Not a valid image (${buf.length} bytes, first bytes: ${buf.slice(0, 4).toString("hex")}): ${url}`)
      return url // Return original URL instead of saving garbage
    }

    // Detect real extension from magic bytes
    let realExt = ext
    if (buf[0] === 0xFF && buf[1] === 0xD8) realExt = "jpg"
    else if (buf[0] === 0x89 && buf[1] === 0x50) realExt = "png"
    else if (buf[0] === 0x47 && buf[1] === 0x49) realExt = "gif"
    else if (buf[0] === 0x52 && buf[1] === 0x49) realExt = "webp"

    const realFilename = realExt !== ext ? `${hash}.${realExt}` : filename
    const realFilePath = path.join(UPLOAD_DIR, realFilename)

    await fs.writeFile(realFilePath, buf)
    console.log(`[image-dl] Saved ${realFilename} (${(buf.length / 1024).toFixed(1)}KB) from ${url}`)
    return `${PUBLIC_PATH}/${realFilename}`
  } catch (err) {
    console.error(`[image-dl] Failed to download ${url}:`, err instanceof Error ? err.message : String(err))
    return url
  }
}

export async function downloadImages(urls: string[]): Promise<string[]> {
  const results: string[] = []
  for (const url of urls) {
    const local = await downloadImage(url)
    results.push(local)
  }
  return results
}
