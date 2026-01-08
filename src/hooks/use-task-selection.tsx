"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface TaskSelectionContextValue {
  selectedIds: Set<string>
  isSelected: (taskId: string) => boolean
  toggle: (taskId: string) => void
  select: (taskId: string) => void
  deselect: (taskId: string) => void
  selectMany: (taskIds: string[]) => void
  selectAll: (taskIds: string[]) => void
  deselectAll: () => void
  toggleAll: (taskIds: string[]) => void
  count: number
}

const TaskSelectionContext = createContext<TaskSelectionContextValue | null>(null)

export function TaskSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isSelected = useCallback((taskId: string) => selectedIds.has(taskId), [selectedIds])

  const toggle = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }, [])

  const select = useCallback((taskId: string) => {
    setSelectedIds((prev) => new Set(prev).add(taskId))
  }, [])

  const deselect = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
  }, [])

  const selectMany = useCallback((taskIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of taskIds) next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((taskIds: string[]) => {
    setSelectedIds(new Set(taskIds))
  }, [])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const toggleAll = useCallback((taskIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = taskIds.every((id) => prev.has(id))
      if (allSelected) {
        // Deselect all from this list
        const next = new Set(prev)
        for (const id of taskIds) next.delete(id)
        return next
      } else {
        // Select all from this list
        const next = new Set(prev)
        for (const id of taskIds) next.add(id)
        return next
      }
    })
  }, [])

  return (
    <TaskSelectionContext.Provider
      value={{
        selectedIds,
        isSelected,
        toggle,
        select,
        deselect,
        selectMany,
        selectAll,
        deselectAll,
        toggleAll,
        count: selectedIds.size,
      }}
    >
      {children}
    </TaskSelectionContext.Provider>
  )
}

export function useTaskSelection() {
  const context = useContext(TaskSelectionContext)
  if (!context) {
    throw new Error("useTaskSelection must be used within TaskSelectionProvider")
  }
  return context
}
