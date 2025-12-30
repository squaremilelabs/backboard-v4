"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "./app-sidebar"
import { MobileNav } from "./mobile-nav"
import { SidebarToggle } from "./sidebar-toggle"

const SIDEBAR_STORAGE_KEY = "backboard-sidebar-collapsed"

interface PageShellProps {
  children: React.ReactNode
}

export function PageShell({ children }: PageShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    // Defer state updates to avoid synchronous setState in effect
    const id = requestAnimationFrame(() => {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (stored !== null) {
        setIsCollapsed(stored === "true")
      }
      setIsHydrated(true)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  // Persist sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState))
  }

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Centered container: sidebar (256px) + content (max 1024px) */}
      <div className="mx-auto flex h-full">
        {/* Desktop sidebar - hidden on mobile, fixed width */}
        {isHydrated && (
          <div className="hidden md:block">
            <AppSidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
          </div>
        )}

        {/* Main content area - max 1024px */}
        <div className="flex w-screen max-w-5xl flex-col overflow-hidden md:w-auto md:flex-1">
          {/* Header - always visible, content varies by screen size */}
          <header className="flex h-14 items-center gap-2 border-b bg-background px-4">
            {/* Mobile: hamburger menu */}
            <div className="md:hidden">
              <MobileNav />
            </div>

            {/* Desktop: sidebar toggle (when collapsed) */}
            {isHydrated && isCollapsed && (
              <div className="hidden md:block">
                <SidebarToggle isCollapsed={isCollapsed} onToggle={toggleSidebar} />
              </div>
            )}

            {/* Title - visible when sidebar is collapsed or on mobile */}
            {(isCollapsed || !isHydrated) && (
              <span className="hidden font-semibold md:block">Backboard</span>
            )}
            <span className="font-semibold md:hidden">Backboard</span>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </div>
  )
}
