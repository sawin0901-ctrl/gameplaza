"use client"
import { useState } from "react"

export default function AdminBackupPage() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; output?: string; error?: string } | null>(null)

  async function runBackup() {
    setRunning(true); setResult(null)
    try {
      const r = await fetch("/api/admin/backup/run", { method: "POST" })
      const d = await r.json()
      setResult(d)
    } catch { setResult({ ok: false, error: "Ошибка запроса" }) }
    setRunning(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Резервные копии</h1>
      <p className="text-gray-500 text-sm mb-6">Бэкап базы данных PostgreSQL в <code className="text-gray-400">/var/backups/gameplaza/</code></p>

      {/* Setup instructions */}
      <div className="card p-5 mb-6">
        <h3 className="text-white font-semibold mb-3">Настройка автоматического бэкапа</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="text-brand font-bold shrink-0">1.</span>
            <div>
              <p className="text-gray-300 mb-1">Разрешить выполнение скрипта:</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-green-400 text-xs">
                chmod +x /var/www/gameplaza/scripts/backup.sh
              </code>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-brand font-bold shrink-0">2.</span>
            <div>
              <p className="text-gray-300 mb-1">Добавить в cron (запуск каждую ночь в 03:00):</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-green-400 text-xs">
                crontab -e
              </code>
              <code className="block bg-black/40 px-3 py-2 rounded text-green-400 text-xs mt-1">
                0 3 * * * bash /var/www/gameplaza/scripts/backup.sh &gt;&gt; /var/log/gameplaza-backup.log 2&gt;&amp;1
              </code>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-brand font-bold shrink-0">3.</span>
            <div>
              <p className="text-gray-300 mb-1">Убедиться что pg_dump установлен:</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-green-400 text-xs">
                which pg_dump || apt install postgresql-client -y
              </code>
            </div>
          </li>
        </ol>
      </div>

      {/* Manual backup */}
      <div className="card p-5 mb-6">
        <h3 className="text-white font-semibold mb-1">Ручной бэкап</h3>
        <p className="text-gray-500 text-xs mb-4">Запускает скрипт немедленно через API. Занимает 10–60 секунд.</p>
        <button onClick={runBackup} disabled={running}
          className="btn-primary py-2 px-5 disabled:opacity-50">
          {running ? "⏳ Выполняется..." : "💾 Создать бэкап сейчас"}
        </button>

        {result && (
          <div className={`mt-4 rounded-lg p-4 text-sm ${result.ok ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
            <p className={`font-semibold mb-2 ${result.ok ? "text-emerald-400" : "text-red-400"}`}>
              {result.ok ? "✅ Бэкап создан успешно" : "❌ Ошибка при создании бэкапа"}
            </p>
            {result.output && (
              <pre className="text-gray-400 text-xs whitespace-pre-wrap font-mono bg-black/30 p-3 rounded mt-2 overflow-x-auto">
                {result.output}
              </pre>
            )}
            {result.error && <p className="text-red-400 text-xs">{result.error}</p>}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-3">Расположение файлов</h3>
        <div className="space-y-2 text-sm">
          {[
            ["/var/backups/gameplaza/", "Папка с бэкапами (gzip, .sql.gz)"],
            ["/var/log/gameplaza-backup.log", "Лог выполнения cron"],
            ["/var/www/gameplaza/scripts/backup.sh", "Скрипт бэкапа"],
          ].map(([path, desc]) => (
            <div key={path} className="flex gap-3">
              <code className="text-green-400 text-xs bg-black/30 px-2 py-1 rounded shrink-0">{path}</code>
              <span className="text-gray-500 text-xs self-center">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-4">Бэкапы старше 30 дней удаляются автоматически при следующем запуске скрипта.</p>
      </div>
    </div>
  )
}
