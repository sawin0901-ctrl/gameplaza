import { getServerSession } from "next-auth"
import { authOptions } from "../../lib/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import SignOutButton from "./SignOutButton"
import ChangePasswordForm from "./ChangePasswordForm"

export const metadata: Metadata = {
  title: "Профиль — GamePlaza",
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/login")

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
          <p className="text-white font-medium">{session.user.email}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Роль</p>
          <p className="text-white font-medium">
            {session.user.role === "admin" ? "Администратор" : "Пользователь"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <ChangePasswordForm />
        <SignOutButton />
      </div>
    </div>
  )
}
