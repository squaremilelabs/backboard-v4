"use client"

import { cn } from "@/lib/utils"

interface ScopeToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function ScopeToggle({ checked, onChange }: ScopeToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs
        text-muted-foreground transition-colors hover:text-foreground"
    >
      <span>Show unfocused scopes</span>
      <span
        className={cn(
          `relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full
          transition-colors`,
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            `pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm
            transition-transform`,
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  )
}
