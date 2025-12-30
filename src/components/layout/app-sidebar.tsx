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
        "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
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

  if (isCollapsed) {
    return null
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      {/* Header with toggle */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <span className="font-semibold">Backboard</span>
        <SidebarToggle isCollapsed={isCollapsed} onToggle={onToggle} />
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 p-4">
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
      <nav className="border-t p-4">
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
