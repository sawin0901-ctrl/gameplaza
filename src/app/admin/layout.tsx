import { getServerSession } from "next-auth"
import { authOptions } from "../../lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import AdminNav from "../../components/AdminNav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") redirect("/auth/login")

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold text-white text-sm">G</div>
            <span className="font-bold text-sm text-[var(--text)]">Админ панель</span>
          </Link>
        </div>
        <AdminNav />
        <div className="p-3 border-t border-[var(--border)]">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-2)] text-xs transition-colors">
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
