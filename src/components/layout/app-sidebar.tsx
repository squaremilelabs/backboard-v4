"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SidebarToggle } from "./sidebar-toggle"
import { cn } from "@/lib/utils"

const mainNavItems = [
  { href: "/tasks", label: "Tasks" },
  { href: "/schedule", label: "Schedule" },
  { href: "/projects", label: "Projects" },
  { href: "/jobs", label: "Jobs" },
]

const secondaryNavItems = [{ href: "/archive", label: "Archive" }]

interface NavItemProps {
  href: string
  label: string
  isActive: boolean
}

function NavItem({ href, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
        isActive
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {label}
    </Link>
  )
}

interface AppSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-background transition-[width] duration-200 ease-in-out",
        isCollapsed ? "w-0 overflow-hidden border-r-0" : "w-64"
      )}
    >
      {/* Header with toggle */}
      <div className="flex h-14 min-w-64 items-center justify-between border-b px-4">
        <span className="font-semibold">Backboard</span>
        <SidebarToggle isCollapsed={isCollapsed} onToggle={onToggle} />
      </div>

      {/* Main navigation */}
      <nav className="min-w-64 flex-1 space-y-1 p-4">
        {mainNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>

      {/* Secondary navigation (Archive) */}
      <nav className="min-w-64 border-t p-4">
        {secondaryNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>
    </aside>
  )
}
