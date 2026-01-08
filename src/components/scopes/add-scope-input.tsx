"use client"

import { useState, useRef } from "react"
import { Plus } from "lucide-react"
import { createScope } from "@/lib/scope-mutations"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { ScopeType } from "@/lib/db"

interface AddScopeInputProps {
  type: ScopeType
  parentId?: string
}

export function AddScopeInput({ type, parentId }: AddScopeInputProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

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
      <button
        onClick={() => {
          setIsAdding(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className={cn(
          `flex w-3xs items-center gap-2 bg-background px-4 py-2 text-sm text-muted-foreground
          transition-colors hover:text-foreground lg:w-2xs`,
          parentId && "pl-8"
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add</span>
      </button>
    )
  }

  return (
    <div className={cn("w-3xs bg-background px-4 py-1 lg:w-2xs", parentId && "pl-8")}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        placeholder={
          parentId ? "Sub-project name..." : `${type === "job" ? "Job" : "Project"} name...`
        }
        className="h-7 border-transparent bg-transparent px-2 shadow-none focus-visible:border-muted
          focus-visible:ring-0"
      />
    </div>
  )
}
