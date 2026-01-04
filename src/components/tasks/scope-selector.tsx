"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTaskScopes } from "@/hooks/use-task-scopes"
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

  const scopes = useTaskScopes(activeListType)

  // Show Triage in Now/Later/Backlog only
  const showTriage = ["now", "later", "backlog"].includes(activeListType)

  // Find current selected scope
  const selectedScope =
    activeScopeId !== "triage" ? scopes?.find((s) => s.id === activeScopeId) : null
  const selectedLabel =
    activeScopeId === "triage" ? "Triage" : selectedScope?.title || "Select scope..."

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedLabel}
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

              {/* All scopes */}
              {scopes?.map((scope) => {
                const isJob = scope.type === "job"
                const dotClass = isJob ? "bg-primary" : "bg-primary"

                return (
                  <CommandItem
                    key={scope.id}
                    value={scope.id}
                    onSelect={() => {
                      setActiveScopeId(scope.id)
                      setOpen(false)
                    }}
                    className={cn(scope.isFaded && "opacity-50")}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        activeScopeId === scope.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className={cn("mr-2 h-2 w-2 shrink-0 rounded-full", dotClass)} />
                    {scope.title}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
