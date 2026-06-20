"use client"
import { createContext, useContext, useEffect, useState, useCallback } from "react"

type Theme = "dark" | "light"

interface ThemeCtxType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeCtxType>({
  theme: "dark",
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    // Читаем сохранённое значение или системный префрес
    const saved = localStorage.getItem("gp-theme") as Theme | null
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    const initial = saved ?? preferred
    applyTheme(initial)
    setTheme(initial)
  }, [])

  const applyTheme = (t: Theme) => {
    const root = document.documentElement
    root.setAttribute("data-theme", t)
    if (t === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark"
      localStorage.setItem("gp-theme", next)
      applyTheme(next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
