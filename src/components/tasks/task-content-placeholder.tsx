"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTaskScopes, findTaskScope } from "@/hooks/use-task-scopes"

export function TaskContentPlaceholder() {
  const [activeListType] = useQueryState("list", searchParamsParsers.list)
  const [activeScopeId] = useQueryState("scope", searchParamsParsers.scope)
  const scopeData = useTaskScopes(activeListType)

  const selectedScope = activeScopeId !== "triage" ? findTaskScope(scopeData, activeScopeId) : null
  const scopeName = activeScopeId === "triage" ? "Triage" : selectedScope?.title || "Unknown"

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Task list component will appear here</p>
        <p className="mt-2 text-xs text-muted-foreground/60">
          List: <span className="font-medium">{activeListType}</span> • Scope:{" "}
          <span className="font-medium">{scopeName}</span>
        </p>
      </div>
    </div>
  )
}
