import { prisma } from "../../../lib/prisma"

export const revalidate = 0

export default async function AdminUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Пользователи</h1>
        <p className="text-[var(--text-3)] text-sm mt-1">Всего: {users.length}</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-gray-500">
              <th className="text-left px-4 py-3">Имя</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-center px-4 py-3">Роль</th>
              <th className="text-right px-4 py-3">Дата</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/2">
                <td className="px-4 py-3 text-white">{u.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`badge ${u.role === "admin" ? "bg-brand/20 text-brand-400" : "bg-white/5 text-gray-500"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600 text-xs">
                  {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-16 text-gray-600">Пользователей нет</div>
        )}
      </div>
    </div>
  )
}
