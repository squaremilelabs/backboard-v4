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
        "block rounded-xl border-2 border-transparent px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "border-border bg-background font-bold text-foreground"
          : "text-muted-foreground hover:bg-background hover:text-foreground"
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
        "flex h-full flex-col transition-[width] duration-200 ease-in-out",
        isCollapsed ? "w-0 overflow-hidden" : "w-70"
      )}
    >
      {/* Header with toggle + logotype */}
      <div className="flex h-9 min-w-70 items-center gap-2 px-3">
        <SidebarToggle isCollapsed={isCollapsed} onToggle={onToggle} />
        <span className="text-sm font-semibold">Backboard</span>
      </div>

      {/* Main navigation */}
      <nav className="min-w-70 flex-1 space-y-0.5 px-3 py-2">
        {mainNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>

      {/* Secondary navigation (Archive) - spacing instead of border */}
      <nav className="min-w-70 px-3 pt-6 pb-3">
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
