"use client"
import { useState } from "react"

export interface TabDef {
  id: string
  label: string
  count?: number
}

interface Props {
  tabs: TabDef[]
  panels: React.ReactNode[]
}

export default function ProductTabs({ tabs, panels }: Props) {
  const [active, setActive] = useState(0)

  return (
    <div>
      {/* Tab navigation — горизонтальный скролл на мобильных */}
      <div className="flex overflow-x-auto border-b border-[#1e1e2e] scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActive(i)}
            className={`
              relative whitespace-nowrap px-4 sm:px-5 py-3 text-sm font-medium
              transition-colors duration-150 shrink-0
              ${i === active
                ? "text-white border-b-2 border-brand -mb-px"
                : "text-gray-500 hover:text-gray-300 border-b-2 border-transparent -mb-px"
              }
            `}
            aria-selected={i === active}
            role="tab"
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-normal
                  ${i === active
                    ? "bg-brand/20 text-brand"
                    : "bg-white/5 text-gray-500"
                  }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels — все в DOM для SEO, показываем/скрываем через CSS */}
      <div className="mt-6">
        {panels.map((panel, i) => (
          <div
            key={tabs[i]?.id ?? i}
            className={i === active ? "" : "hidden"}
            role="tabpanel"
          >
            {panel}
          </div>
        ))}
      </div>
    </div>
  )
}
