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
    <div className="flex h-screen bg-muted/30">
      {/* Centered container: sidebar + content (max 1024px) */}
      <div className="mx-auto flex h-full w-full max-w-[1280px]">
        {/* Desktop sidebar - hidden on mobile, animates width */}
        <div
          className={cn(
            "hidden transition-opacity duration-200 md:block",
            isHydrated ? "opacity-100" : "opacity-0"
          )}
        >
          <AppSidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
        </div>

        {/* Main content area - fills available width up to max-w-5xl */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header - always visible, content varies by screen size */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            {/* Mobile: hamburger menu */}
            <div className="md:hidden">
              <MobileNav />
            </div>

            {/* Desktop: sidebar toggle (when collapsed) */}
            <div
              className={cn(
                "hidden transition-opacity duration-200 md:block",
                isHydrated && isCollapsed ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <SidebarToggle isCollapsed={isCollapsed} onToggle={toggleSidebar} />
            </div>

            {/* Title - visible when sidebar is collapsed or on mobile */}
            <span
              className={cn(
                "hidden font-semibold transition-opacity duration-200 md:block",
                isCollapsed ? "opacity-100" : "opacity-0"
              )}
            >
              Backboard
            </span>
            <span className="font-semibold md:hidden">Backboard</span>
          </header>

          {/* Page content - constrained to max-w-5xl */}
          <main className="flex-1 overflow-auto">
            <div className="mx-auto h-full max-w-5xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
