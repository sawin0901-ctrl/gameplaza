import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { exec } from "child_process"
import { promisify } from "util"

export const dynamic = "force-dynamic"

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scriptPath = "/var/www/gameplaza/scripts/backup.sh"

  try {
    const { stdout, stderr } = await execAsync(`bash ${scriptPath}`, { timeout: 120_000 })
    const output = [stdout, stderr].filter(Boolean).join("\n").trim()
    return NextResponse.json({ ok: true, output })
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: number }
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n").trim()
    return NextResponse.json({
      ok: false,
      error: `Скрипт завершился с ошибкой (код ${e.code ?? "?"})`,
      output,
    })
  }
}
