import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { rateLimit } from "./rate-limit"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email.toLowerCase().trim()
        const ip = (req?.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? "unknown"
        const ua = (req?.headers?.["user-agent"] as string) ?? undefined

        if (!rateLimit(`login_ip:${ip}`, 10, 15 * 60 * 1000)) return null
        if (!rateLimit(`login_email:${email}`, 10, 15 * 60 * 1000)) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          await bcrypt.hash(credentials.password, 1)
          return null
        }

        const ok = await bcrypt.compare(credentials.password, user.password)

        // Record login attempt asynchronously (fire-and-forget)
        prisma.loginHistory.create({
          data: {
            userId: user.id,
            ip: ip !== "unknown" ? ip : null,
            userAgent: ua ?? null,
            success: ok,
          },
        }).catch(() => {})

        if (!ok) return null

        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
