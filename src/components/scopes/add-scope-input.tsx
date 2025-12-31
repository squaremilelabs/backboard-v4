"use client"

import { useState, useRef } from "react"
import { Plus } from "lucide-react"
import { createScope } from "@/lib/scope-mutations"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ScopeType } from "@/lib/db"

interface AddScopeInputProps {
  type: ScopeType
  parentId?: string
  placeholder?: string
}

export function AddScopeInput({ type, parentId, placeholder }: AddScopeInputProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const typeLabel = type === "job" ? "job" : "project"
  const defaultPlaceholder = parentId ? `Add sub-${typeLabel}...` : `Add ${typeLabel}...`

  const handleSubmit = async () => {
    if (!value.trim()) {
      setIsAdding(false)
      return
    }

    await createScope(type, value.trim(), parentId)
    setValue("")
    // Keep input open for rapid entry
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    } else if (e.key === "Escape") {
      setValue("")
      setIsAdding(false)
    }
  }

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("w-full justify-start gap-2 text-muted-foreground", parentId && "ml-6")}
        onClick={() => {
          setIsAdding(true)
          // Focus after state update
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
      >
        <Plus className="h-4 w-4" />
        {placeholder ?? defaultPlaceholder}
      </Button>
    )
  }

  return (
    <div className={cn("px-3 py-1", parentId && "ml-6")}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? defaultPlaceholder}
        className="h-8"
      />
    </div>
  )
}
