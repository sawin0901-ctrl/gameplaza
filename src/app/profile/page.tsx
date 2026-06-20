import { getServerSession } from "next-auth"
import { authOptions } from "../../lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "../../lib/prisma"
import type { Metadata } from "next"
import SignOutButton from "./SignOutButton"
import ChangePasswordForm from "./ChangePasswordForm"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Профиль — GamePlaza",
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/login")

  const wishlistCount = await prisma.wishlist.count({ where: { userId: session.user.id } }).catch(() => 0)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  }).catch(() => null)

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-white mb-8">Мой профиль</h1>

      <div className="card p-6 space-y-4 mb-4">
        <div>
          <p className="text-gray-500 text-xs mb-1">Имя</p>
          <p className="text-white font-medium">{session.user.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Email</p>
          <div className="flex items-center gap-2">
            <p className="text-white font-medium">{session.user.email}</p>
            {user?.emailVerified ? (
              <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">✓ Подтверждён</span>
            ) : (
              <span className="text-xs bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full">Не подтверждён</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Роль</p>
          <p className="text-white font-medium">
            {session.user.role === "admin" ? "Администратор" : "Пользователь"}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link href="/profile/wishlist"
          className="card p-4 flex items-center gap-3 hover:border-brand/30 transition-colors">
          <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center text-lg">♥</div>
          <div>
            <p className="text-white text-sm font-medium">Избранное</p>
            <p className="text-gray-500 text-xs">{wishlistCount} товаров</p>
          </div>
        </Link>
        {session.user.role === "admin" && (
          <Link href="/admin"
            className="card p-4 flex items-center gap-3 hover:border-brand/30 transition-colors">
            <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center text-lg">⚙️</div>
            <div>
              <p className="text-white text-sm font-medium">Панель</p>
              <p className="text-gray-500 text-xs">Администратор</p>
            </div>
          </Link>
        )}
      </div>

      <div className="space-y-3">
        <ChangePasswordForm />
        <SignOutButton />
      </div>
    </div>
  )
}
