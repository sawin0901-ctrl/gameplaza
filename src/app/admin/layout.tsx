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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col fixed top-0 left-0 h-screen z-30">
        {/* Logo / Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-gray-100">
          <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm">
              G
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate leading-none">GamePlaza</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Администратор</p>
            </div>
          </Link>
          <NotificationBell />
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100">
          <AdminSearch />
        </div>

        {/* Navigation */}
        <AdminNav />

        {/* Footer */}
        <div className="px-3 pb-4 pt-2 border-t border-gray-100 space-y-1">
          <Link href="/" target="_blank"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3" />
            </svg>
            Открыть магазин
          </Link>
        </div>
      </aside>

      {/* Main content — offset by sidebar width */}
      <main className="flex-1 ml-60 min-h-screen overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  )
}