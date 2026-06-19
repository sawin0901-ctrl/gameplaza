import { getServerSession } from "next-auth"
import { authOptions } from "../../lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

const NAV = [
  { href: "/admin", label: "Дашборд", icon: "📊" },
  { href: "/admin/products", label: "Товары", icon: "🎮" },
  { href: "/admin/import", label: "Импорт", icon: "⬇️" },
  { href: "/admin/categories", label: "Категории", icon: "📁" },
  { href: "/admin/users", label: "Пользователи", icon: "👥" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") redirect("/auth/login")

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-[#0d0d14] border-r border-[#1f2937] flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-[#1f2937]">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold text-white text-sm">G</div>
            <span className="font-bold text-sm text-white">Админ панель</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-sm transition-colors">
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-[#1f2937]">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-400 text-xs transition-colors">
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
