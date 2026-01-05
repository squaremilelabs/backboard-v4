"use client"

import { useState, useMemo, useEffect, useRef } from "react"

import { AddScopeInput } from "./add-scope-input"
import { ScopeGridRow } from "./scope-grid-row"
import { ScopeModal } from "./scope-modal"
import { useScopes } from "@/hooks/use-scopes"
import { useDefaultScheduleSlots, useMonthSlots, getNext6Months } from "@/hooks/use-schedule-slots"
import { sortJobsBySchedule, sortProjectsBySchedule } from "@/lib/scope-sorting"
import type { Scope, ScopeType } from "@/lib/db"

interface ScopeListProps {
  type: ScopeType
}

export function ScopeList({ type }: ScopeListProps) {
  const scopes = useScopes(type)
  const defaultScheduleSlots = useDefaultScheduleSlots()
  const monthSlots = useMonthSlots()
  const [modalScope, setModalScope] = useState<Scope | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Store the initial sorted order - only computed once on first data load
  const [sortedParentIds, setSortedParentIds] = useState<string[] | null>(null)
  const [sortedChildrenByParent, setSortedChildrenByParent] = useState<Record<string, string[]>>({})
  const initialSortDoneRef = useRef(false)

  // Get month keys for project sorting
  const monthKeys = useMemo(() => getNext6Months().map((m) => m.key), [])

  // Compute initial sort order when data first loads
  useEffect(() => {
    // Only compute once when all data is loaded
    if (initialSortDoneRef.current || scopes === undefined) return

    if (type === "job") {
      if (defaultScheduleSlots === undefined) return
      const sorted = sortJobsBySchedule(scopes, defaultScheduleSlots)
      setSortedParentIds(sorted.map((s) => s.id))
      initialSortDoneRef.current = true
    } else {
      if (monthSlots === undefined) return

      // Separate parents and children
      const parentProjects = scopes.filter((s) => !s.parentId)
      const childrenByParent: Record<string, Scope[]> = {}
      for (const scope of scopes) {
        if (scope.parentId) {
          if (!childrenByParent[scope.parentId]) {
            childrenByParent[scope.parentId] = []
          }
          childrenByParent[scope.parentId].push(scope)
        }
      }

      // Sort parents
      const sortedParents = sortProjectsBySchedule(parentProjects, monthSlots, monthKeys)
      setSortedParentIds(sortedParents.map((p) => p.id))

      // Sort children within each parent
      const sortedChildren: Record<string, string[]> = {}
      for (const [parentId, children] of Object.entries(childrenByParent)) {
        const sorted = sortProjectsBySchedule(children, monthSlots, monthKeys)
        sortedChildren[parentId] = sorted.map((c) => c.id)
      }
      setSortedChildrenByParent(sortedChildren)
      initialSortDoneRef.current = true
    }
  }, [scopes, defaultScheduleSlots, monthSlots, type, monthKeys])

  // Create a lookup map for scopes (must be before any early returns to satisfy hooks rules)
  const scopeMap = useMemo(
    () => (scopes ? new Map(scopes.map((s) => [s.id, s])) : new Map<string, Scope>()),
    [scopes]
  )

  const handleOpenModal = (scope: Scope) => {
    setModalScope(scope)
    setIsModalOpen(true)
  }

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setModalScope(null)
    }
  }

  if (scopes === undefined) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  // For jobs: simple flat list with sorting
  if (type === "job") {
    // Use sorted order if available, otherwise fallback to raw order
    const displayScopes = sortedParentIds
      ? sortedParentIds.map((id) => scopeMap.get(id)).filter((s): s is Scope => s !== undefined)
      : scopes

    // Include any new scopes not in the sorted list (added after initial sort)
    const newScopes = scopes.filter((s) => !sortedParentIds?.includes(s.id))

    return (
      <>
        <div className="flex flex-col">
          {displayScopes.map((scope) => (
            <ScopeGridRow
              key={scope.id}
              scope={scope}
              onOpenModal={handleOpenModal}
              defaultScheduleSlots={defaultScheduleSlots}
            />
          ))}
          {/* New scopes added after initial sort appear at the end */}
          {newScopes.map((scope) => (
            <ScopeGridRow
              key={scope.id}
              scope={scope}
              onOpenModal={handleOpenModal}
              defaultScheduleSlots={defaultScheduleSlots}
            />
          ))}
          <AddScopeInput type="job" />
        </div>

        <ScopeModal scope={modalScope} open={isModalOpen} onOpenChange={handleCloseModal} />
      </>
    )
  }

  // Projects: handle nesting with sorting
  const allParentProjects = scopes.filter((s) => !s.parentId)
  const childrenByParent = scopes.reduce(
    (acc, scope) => {
      if (scope.parentId) {
        if (!acc[scope.parentId]) {
          acc[scope.parentId] = []
        }
        acc[scope.parentId].push(scope)
      }
      return acc
    },
    {} as Record<string, Scope[]>
  )

  // Use sorted parent order if available
  const displayParents = sortedParentIds
    ? sortedParentIds
        .map((id) => scopeMap.get(id))
        .filter((s): s is Scope => s !== undefined && !s.parentId)
    : allParentProjects

  // New parent projects added after initial sort
  const newParents = allParentProjects.filter((p) => !sortedParentIds?.includes(p.id))

  // Helper to get sorted children for a parent
  const getSortedChildren = (parentId: string): Scope[] => {
    const children = childrenByParent[parentId] || []
    const sortedIds = sortedChildrenByParent[parentId]
    if (!sortedIds) return children

    const sorted = sortedIds
      .map((id) => scopeMap.get(id))
      .filter((s): s is Scope => s !== undefined)

    // Include any new children not in the sorted list
    const newChildren = children.filter((c) => !sortedIds.includes(c.id))
    return [...sorted, ...newChildren]
  }

  return (
    <>
      <div className="flex flex-col">
        {displayParents.map((project) => {
          const children = getSortedChildren(project.id)
          const childIds = children.map((c) => c.id)

          return (
            <div key={project.id}>
              <ScopeGridRow
                scope={project}
                onOpenModal={handleOpenModal}
                monthSlots={monthSlots}
                childIds={childIds}
              />
              {/* Nested children */}
              {children.map((child) => (
                <ScopeGridRow
                  key={child.id}
                  scope={child}
                  isNested
                  onOpenModal={handleOpenModal}
                  monthSlots={monthSlots}
                />
              ))}
              {/* Add child project */}
              <AddScopeInput type="project" parentId={project.id} />
            </div>
          )
        })}
        {/* New parent projects added after initial sort */}
        {newParents.map((project) => {
          const children = getSortedChildren(project.id)
          const childIds = children.map((c) => c.id)

          return (
            <div key={project.id}>
              <ScopeGridRow
                scope={project}
                onOpenModal={handleOpenModal}
                monthSlots={monthSlots}
                childIds={childIds}
              />
              {children.map((child) => (
                <ScopeGridRow
                  key={child.id}
                  scope={child}
                  isNested
                  onOpenModal={handleOpenModal}
                  monthSlots={monthSlots}
                />
              ))}
              <AddScopeInput type="project" parentId={project.id} />
            </div>
          )
        })}
        <AddScopeInput type="project" />
      </div>

      <ScopeModal scope={modalScope} open={isModalOpen} onOpenChange={handleCloseModal} />
    </>
  )
}
