"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTaskScopes, findTaskScope, type TaskScope } from "@/hooks/use-task-scopes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function ScopeSelector() {
  const [open, setOpen] = useState(false)
  const [activeListType] = useQueryState("list", searchParamsParsers.list)
  const [activeScopeId, setActiveScopeId] = useQueryState("scope", searchParamsParsers.scope)

  const scopeData = useTaskScopes(activeListType)

  // Show Triage in Now/Later/Backlog only
  const showTriage = ["now", "later", "backlog"].includes(activeListType)

  // Find current selected scope
  const selectedScope = activeScopeId !== "triage" ? findTaskScope(scopeData, activeScopeId) : null
  const selectedLabel =
    activeScopeId === "triage" ? "Triage" : selectedScope?.title || "Select scope..."
  const selectedThemeClass =
    selectedScope?.type === "job"
      ? "theme-gold"
      : selectedScope?.type === "project"
        ? "theme-blue"
        : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            {activeScopeId === "triage" ? (
              <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
            ) : selectedThemeClass ? (
              <span className={selectedThemeClass}>
                <span className="block h-2 w-2 shrink-0 rounded-full bg-primary" />
              </span>
            ) : null}
            {selectedLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search scopes..." />
          <CommandList>
            <CommandEmpty>No scope found.</CommandEmpty>
            <CommandGroup>
              {/* Triage (special item) */}
              {showTriage && (
                <CommandItem
                  value="triage"
                  onSelect={() => {
                    setActiveScopeId("triage")
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      activeScopeId === "triage" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="mr-2 h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
                  Triage
                </CommandItem>
              )}

              {/* Jobs (theme-gold) */}
              {scopeData?.jobs.map((job) => (
                <ScopeItem
                  key={job.id}
                  scope={job}
                  isSelected={activeScopeId === job.id}
                  onSelect={() => {
                    setActiveScopeId(job.id)
                    setOpen(false)
                  }}
                  themeClass="theme-gold"
                />
              ))}

              {/* Projects (theme-blue) - grouped by parent/child */}
              {scopeData?.projectGroups.map((group) => (
                <div key={group.parent.id}>
                  <ScopeItem
                    scope={group.parent}
                    isSelected={activeScopeId === group.parent.id}
                    onSelect={() => {
                      setActiveScopeId(group.parent.id)
                      setOpen(false)
                    }}
                    themeClass="theme-blue"
                  />
                  {group.children.map((child) => (
                    <ScopeItem
                      key={child.project.id}
                      scope={child.project}
                      isSelected={activeScopeId === child.project.id}
                      onSelect={() => {
                        setActiveScopeId(child.project.id)
                        setOpen(false)
                      }}
                      themeClass="theme-blue"
                      isChild
                    />
                  ))}
                </div>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface ScopeItemProps {
  scope: TaskScope
  isSelected: boolean
  onSelect: () => void
  themeClass: "theme-gold" | "theme-blue"
  isChild?: boolean
}

function ScopeItem({ scope, isSelected, onSelect, themeClass, isChild }: ScopeItemProps) {
  // Jobs: filled dot, Projects: parent = filled, child = outlined
  const isProject = scope.type === "project"
  const dotClass =
    isProject && isChild ? "border-2 border-primary bg-transparent" : "bg-primary"

  // isFaded means this parent is only shown for visual grouping (not selectable)
  const isDisabled = scope.isFaded

  if (isDisabled) {
    // Render as non-interactive label for visual grouping
    return (
      <div
        className={cn(
          "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm",
          "text-muted-foreground/60",
          isChild && "pl-8"
        )}
      >
        {/* Empty space where check would be */}
        <span className="mr-2 h-4 w-4" />
        <span className={cn(themeClass, "opacity-50")}>
          <span className={cn("mr-2 block h-2 w-2 shrink-0 rounded-full", dotClass)} />
        </span>
        {scope.title}
      </div>
    )
  }

  return (
    <CommandItem
      value={scope.id}
      onSelect={onSelect}
      className={cn(isChild && "pl-8")}
    >
      <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
      <span className={themeClass}>
        <span className={cn("mr-2 block h-2 w-2 shrink-0 rounded-full", dotClass)} />
      </span>
      {scope.title}
    </CommandItem>
  )
}
