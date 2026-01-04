"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTaskScopes } from "@/hooks/use-task-scopes"
import { cn } from "@/lib/utils"

export function ScopeList() {
  const [activeListType] = useQueryState("list", searchParamsParsers.list)
  const [activeScopeId, setActiveScopeId] = useQueryState("scope", searchParamsParsers.scope)

  const scopes = useTaskScopes(activeListType)

  // Show Triage in Now/Later/Backlog only
  const showTriage = ["now", "later", "backlog"].includes(activeListType)

  if (!scopes) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {/* Triage (special fixed item at top) */}
      {showTriage && (
        <button
          onClick={() => setActiveScopeId("triage")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
            activeScopeId === "triage"
              ? "bg-muted font-medium"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground" />
          <span className="truncate">Triage</span>
          {/* TODO: Add task count indicator dot */}
        </button>
      )}

      {/* All scopes */}
      {scopes.map((scope) => {
        const isActive = activeScopeId === scope.id
        const isJob = scope.type === "job"

        // Jobs: filled dot, Projects: filled dot (color differs via theme)
        const dotClass = isJob ? "bg-primary" : "bg-primary"

        return (
          <button
            key={scope.id}
            onClick={() => setActiveScopeId(scope.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
              isActive
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              scope.isFaded && "opacity-50"
            )}
          >
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClass)} />
            <span className="truncate">{scope.title}</span>
            {/* TODO: Add task count indicator dot */}
          </button>
        )
      })}
    </div>
  )
}
