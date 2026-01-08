"use client"

import { cn } from "@/lib/utils"

interface TaskCheckboxProps {
  checked: boolean
  onChange: () => void
  className?: string
}

export function TaskCheckbox({ checked, onChange, className }: TaskCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        "border-muted-foreground/50 hover:border-foreground",
        checked && "border-primary bg-primary",
        className
      )}
    >
      {checked && (
        <svg
          className="h-3 w-3 text-primary-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  )
}
