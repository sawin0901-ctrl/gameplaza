"use client"
import { SessionProvider } from "next-auth/react"
import LocaleProvider from "./LocaleProvider"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </SessionProvider>
  )
}