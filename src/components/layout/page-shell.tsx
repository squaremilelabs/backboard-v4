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

  // Desktop: show header only when sidebar is collapsed
  const showDesktopHeader = isHydrated && isCollapsed

  return (
    <div className="flex h-screen flex-col items-center-safe bg-muted">
      {/* Header - always on mobile, only when collapsed on desktop */}
      <header
        className={cn(
          "flex h-9 w-7xl max-w-full shrink-0 items-center gap-2 px-3",
          // Mobile: always show
          "md:hidden",
          // Desktop: only show when collapsed
          showDesktopHeader && "md:flex",
          "transition-[height] transition-discrete starting:h-0"
        )}
      >
        {/* Mobile: hamburger menu */}
        <div className="md:hidden">
          <MobileNav />
        </div>

        {/* Desktop (collapsed): sidebar toggle */}
        <div className="hidden md:block">
          <SidebarToggle isCollapsed={isCollapsed} onToggle={toggleSidebar} />
        </div>

        {/* Logotype */}
        <span className="text-sm font-semibold">Backboard</span>
      </header>

      {/* Main area: sidebar + content */}
      <div className="flex min-h-0 w-7xl max-w-full flex-1">
        {/* Desktop sidebar - has its own header when expanded */}
        <div
          className={cn(
            "hidden transition-all duration-200 md:block",
            isCollapsed ? "w-0" : "w-70",
            isHydrated ? "opacity-100" : "opacity-0"
          )}
        >
          <AppSidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
        </div>

        {/* Content area - max-w-5xl per original spec */}
        <main className={cn("w-full min-w-0 flex-1 p-3 pt-0", isCollapsed ? "pt-0" : "md:pt-3")}>
          {/* <div className="mx-auto h-full max-w-5xl">{children}</div> */}
          {children}
        </main>
      </div>
    </div>
  )
}
