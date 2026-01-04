"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useScopes } from "@/hooks/use-scopes"

export function TaskContentPlaceholder() {
  const [activeListType] = useQueryState("list", searchParamsParsers.list)
  const [activeScopeId] = useQueryState("scope", searchParamsParsers.scope)
  const scopes = useScopes()

  const scopeName =
    activeScopeId === "triage"
      ? "Triage"
      : scopes?.find((s) => s.id === activeScopeId)?.title || "Unknown"

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Task list component will appear here</p>
        <p className="mt-2 text-xs text-muted-foreground/60">
          List: <span className="font-medium">{activeListType}</span> • Scope:{" "}
          <span className="font-medium">{scopeName}</span>
        </p>
        {/* TODO: Replace with actual TaskList component in next implementation */}
      </div>
    </div>
  )
}
