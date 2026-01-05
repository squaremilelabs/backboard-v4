"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SyncButton } from "./sync-button"
import { UserMenu } from "@/components/auth/user-menu"
import { LoginDialog } from "@/components/auth/login-dialog"
import { useTaskIndicators } from "@/hooks/use-task-indicators"
import { ActivityDots, type DotVariant } from "@/components/ui/activity-dot"
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
  dots?: DotVariant[]
}

function NavItem({ href, label, isActive, dots }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        `flex items-center justify-between rounded-xl border-2 border-transparent px-3 py-1.5
        text-sm transition-colors`,
        isActive
          ? "border-border bg-background font-bold text-foreground"
          : "text-muted-foreground hover:bg-background hover:text-foreground"
      )}
    >
      <span>{label}</span>
      {dots && dots.length > 0 && <ActivityDots variants={dots} />}
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const indicators = useTaskIndicators()

  // Get dots for Tasks nav item (same as NOW tab)
  const tasksDots = indicators?.nowDots ?? []

  return (
    <aside className="flex h-full w-52 flex-col">
      {/* Logotype */}
      <div className="flex h-12 items-center px-3">
        <span className="text-sm font-semibold">Backboard</span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const dots = item.href === "/tasks" ? tasksDots : undefined

          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              isActive={isActive}
              dots={dots}
            />
          )
        })}
      </nav>

      {/* Secondary navigation (Auth + Sync + Archive) */}
      <nav className="space-y-1 px-3 pt-6 pb-3">
        <UserMenu />
        <SyncButton />
        {secondaryNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>

      {/* Login dialog - renders when login flow is triggered */}
      <LoginDialog />
    </aside>
  )
}
