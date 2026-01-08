"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { useState } from "react"
import { SyncButton } from "./sync-button"
import { UserMenu } from "@/components/auth/user-menu"
import { LoginDialog } from "@/components/auth/login-dialog"
import { useTaskIndicators } from "@/hooks/use-task-indicators"
import { ActivityDots, type DotVariant } from "@/components/ui/activity-dot"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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
  onClick?: () => void
  dots?: DotVariant[]
}

function NavItem({ href, label, isActive, onClick, dots }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        `flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium
        transition-colors`,
        isActive
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <span>{label}</span>
      {dots && dots.length > 0 && <ActivityDots variants={dots} />}
    </Link>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const indicators = useTaskIndicators()

  // Get dots for Tasks nav item (same as NOW tab)
  const tasksDots = indicators?.nowDots ?? []

  const closeSheet = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-left text-lg font-semibold">Backboard</SheetTitle>
        </SheetHeader>
        <div className="flex h-[calc(100%-57px)] flex-col">
          {/* Main navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              const dots = item.href === "/tasks" ? tasksDots : undefined

              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  isActive={isActive}
                  onClick={closeSheet}
                  dots={dots}
                />
              )
            })}
          </nav>

          {/* Secondary navigation (Auth + Sync + Archive) */}
          <nav className="space-y-1 border-t p-4">
            <UserMenu variant="mobile" />
            <SyncButton variant="mobile" />
            {secondaryNavItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                onClick={closeSheet}
              />
            ))}
          </nav>
        </div>
      </SheetContent>

      {/* Login dialog - renders when login flow is triggered */}
      <LoginDialog />
    </Sheet>
  )
}
