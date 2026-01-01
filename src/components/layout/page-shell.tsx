"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "./app-sidebar"
import { MobileNav } from "./mobile-nav"
import { SidebarToggle } from "./sidebar-toggle"
import { cn } from "@/lib/utils"

const SIDEBAR_STORAGE_KEY = "backboard-sidebar-collapsed"

interface PageShellProps {
  children: React.ReactNode
}

export function PageShell({ children }: PageShellProps) {
  // Start collapsed to match most common initial render, prevents flash
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    // Default to expanded (false) if no preference stored
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCollapsed(stored === "true")
    setIsHydrated(true)
  }, [])

  // Persist sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState))
  }

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      {/* Minimal flat header - 36px, spans full width */}
      <header className="flex h-9 shrink-0 items-center gap-2 px-3">
        {/* Mobile: hamburger menu */}
        <div className="md:hidden">
          <MobileNav />
        </div>

        {/* Desktop: sidebar toggle */}
        <div
          className={cn(
            "hidden transition-opacity duration-200 md:block",
            isHydrated ? "opacity-100" : "opacity-0"
          )}
        >
          <SidebarToggle isCollapsed={isCollapsed} onToggle={toggleSidebar} />
        </div>

        {/* Logotype */}
        <span className="text-sm font-semibold">Backboard</span>
      </header>

      {/* Main area: sidebar + content */}
      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar - flat, no border */}
        <div
          className={cn(
            "hidden transition-opacity duration-200 md:block",
            isHydrated ? "opacity-100" : "opacity-0"
          )}
        >
          <AppSidebar isCollapsed={isCollapsed} />
        </div>

        {/* Content area - pages decide their own card styling */}
        <main className="min-w-0 flex-1 p-3 pt-0">{children}</main>
      </div>
    </div>
  )
}
