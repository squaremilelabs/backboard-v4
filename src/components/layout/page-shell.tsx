"use client"

import { AppSidebar } from "./app-sidebar"
import { MobileNav } from "./mobile-nav"

interface PageShellProps {
  children: React.ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="flex h-screen w-7xl max-w-full flex-col bg-muted lg:flex-row lg:justify-center">
      {/* Mobile header - only visible below lg breakpoint */}
      <header className="flex h-12 shrink-0 items-center gap-2 px-3 lg:hidden">
        <MobileNav />
        <span className="text-sm font-semibold">Backboard</span>
      </header>

      {/* Desktop layout - centered 1280px container */}
      <div className="flex min-h-0 flex-1 lg:w-[1280px] lg:max-w-full">
        {/* Desktop sidebar - only visible at lg and above */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        {/* Content area - fills remaining width */}
        <main className="min-w-0 flex-1 p-3">{children}</main>
      </div>
    </div>
  )
}
