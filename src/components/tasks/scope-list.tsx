"use client"

import { useEffect, useMemo } from "react"
import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTaskScopes, findTaskScope, type TaskScope } from "@/hooks/use-task-scopes"
import { ActivityDot, type DotVariant } from "@/components/ui/activity-dot"
import { cn } from "@/lib/utils"

export function ScopeList() {
  const [activeListType] = useQueryState("list", searchParamsParsers.list)
  const [activeScopeId, setActiveScopeId] = useQueryState("scope", searchParamsParsers.scope)

  const scopeData = useTaskScopes(activeListType)

  // Show Triage in Now/Later/Backlog only
  const showTriage = ["now", "later", "backlog"].includes(activeListType)

  // Only show colored dots in "now" list - later/backlog are neutral
  const isNowList = activeListType === "now"

  // Check if the current scope exists in the list
  const currentScopeInList = useMemo(() => {
    if (!scopeData) return true // Still loading, assume it's fine
    if (activeScopeId === "triage") return showTriage
    return findTaskScope(scopeData, activeScopeId) !== null
  }, [scopeData, activeScopeId, showTriage])

  // Auto-switch to triage if current scope is not in the list
  useEffect(() => {
    if (scopeData && !currentScopeInList) {
      // Find the first available scope to select
      if (showTriage) {
        setActiveScopeId("triage")
      } else if (scopeData.jobs.length > 0) {
        setActiveScopeId(scopeData.jobs[0].id)
      } else if (scopeData.projectGroups.length > 0) {
        setActiveScopeId(scopeData.projectGroups[0].parent.id)
      }
    }
  }, [scopeData, currentScopeInList, showTriage, setActiveScopeId])

  if (!scopeData) {
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
          <span className="flex-1 truncate">Triage</span>
          {scopeData.triageHasTasks && (
            <ActivityDot
              variant="neutral"
              outlined={scopeData.triageHasPendingActions}
              className="ml-auto"
            />
          )}
        </button>
      )}

      {/* Jobs (theme-gold) */}
      {scopeData.jobs.map((job) => (
        <ScopeButton
          key={job.id}
          scope={job}
          isActive={activeScopeId === job.id}
          onClick={() => setActiveScopeId(job.id)}
          themeClass="theme-gold"
          dotVariant="gold"
          isNowList={isNowList}
        />
      ))}

      {/* Projects (theme-blue) - grouped by parent/child */}
      {scopeData.projectGroups.map((group) => (
        <div key={group.parent.id}>
          {/* Parent project */}
          <ScopeButton
            scope={group.parent}
            isActive={activeScopeId === group.parent.id}
            onClick={() => setActiveScopeId(group.parent.id)}
            themeClass="theme-blue"
            dotVariant="blue"
            isNowList={isNowList}
          />
          {/* Child projects (indented) */}
          {group.children.map((child) => (
            <ScopeButton
              key={child.project.id}
              scope={child.project}
              isActive={activeScopeId === child.project.id}
              onClick={() => setActiveScopeId(child.project.id)}
              themeClass="theme-blue"
              dotVariant="blue"
              isNowList={isNowList}
              isChild
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface ScopeButtonProps {
  scope: TaskScope
  isActive: boolean
  onClick: () => void
  themeClass: "theme-gold" | "theme-blue"
  dotVariant: "gold" | "blue"
  isNowList: boolean
  isChild?: boolean
}

function ScopeButton({
  scope,
  isActive,
  onClick,
  themeClass,
  dotVariant,
  isNowList,
  isChild,
}: ScopeButtonProps) {
  // Jobs: filled dot, Projects: parent = filled, child = outlined
  const isProject = scope.type === "project"
  const dotClass = isProject && isChild ? "border-2 border-primary bg-transparent" : "bg-primary"

  // isFaded means this parent is only shown for visual grouping (not selectable)
  const isDisabled = scope.isFaded

  // Determine right-hand indicator dot variant
  // In "now" list: red if unfocused, otherwise scope color
  // In later/backlog: always neutral
  const indicatorVariant: DotVariant | null = scope.hasTasksInList
    ? isNowList
      ? scope.isUnfocused
        ? "red"
        : dotVariant
      : "neutral"
    : null

  // Outlined if there are pending actions
  const isOutlined = scope.hasPendingActions

  if (isDisabled) {
    // Render as non-interactive label for visual grouping
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm",
          "text-muted-foreground",
          isChild && "pl-6"
        )}
      >
        <span className={cn(themeClass, "opacity-50")}>
          <span className={cn("block h-2.5 w-2.5 shrink-0 rounded-full", dotClass)} />
        </span>
        <span className="flex-1 truncate">{scope.title}</span>
        {indicatorVariant && <ActivityDot variant={indicatorVariant} outlined={isOutlined} />}
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
        isActive ? "bg-muted font-medium" : "text-foreground hover:bg-muted hover:text-foreground",
        isChild && "pl-6" // Indent children
      )}
    >
      <span className={themeClass}>
        <span className={cn("block h-2.5 w-2.5 shrink-0 rounded-full", dotClass)} />
      </span>
      <span className="flex-1 truncate">{scope.title}</span>
      {indicatorVariant && <ActivityDot variant={indicatorVariant} outlined={isOutlined} />}
    </button>
  )
}
