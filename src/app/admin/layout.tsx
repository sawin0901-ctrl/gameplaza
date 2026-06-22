import { getServerSession } from "next-auth"
import { authOptions } from "../../lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import AdminNav from "../../components/AdminNav"
import { NotificationBell } from "../../components/admin/NotificationBell"
import { AdminSearch } from "../../components/admin/AdminSearch"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") redirect("/auth/login")

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex-shrink-0 flex flex-col">
        <div className="p-3 border-b border-[var(--border)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0">G</div>
              <span className="font-bold text-sm text-[var(--text)] truncate">Админ панель</span>
            </Link>
            <NotificationBell />
          </div>
          <AdminSearch />
        </div>
        <AdminNav />
        <div className="p-3 border-t border-[var(--border)]">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--text-3)] hover:text-[var(--text-2)] text-xs transition-colors hover:bg-black/5">
            ← На сайт
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}