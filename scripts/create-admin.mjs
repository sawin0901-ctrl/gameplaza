import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const email = "admin@gameplaza.site"
const password = "GamePlaza2024!"
const name = "Администратор"

async function main() {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { password: await bcrypt.hash(password, 12), role: "admin", name },
    })
    console.log("Админ обновлён:", email)
  } else {
    await prisma.user.create({
      data: { email, password: await bcrypt.hash(password, 12), role: "admin", name },
    })
    console.log("Админ создан:", email)
  }
  console.log("Пароль:", password)
}

main().catch(console.error).finally(() => prisma.$disconnect())
