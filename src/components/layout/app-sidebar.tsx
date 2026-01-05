"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-52 flex-col">
      {/* Logotype */}
      <div className="flex h-12 items-center px-3">
        <span className="text-sm font-semibold">Backboard</span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1">
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
      <nav className="px-3 pt-6 pb-3">
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
