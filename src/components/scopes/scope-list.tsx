"use client"

import { useState } from "react"

import { AddScopeInput } from "./add-scope-input"
import { ScopeGridRow } from "./scope-grid-row"
import { ScopeModal } from "./scope-modal"
import { useScopes } from "@/hooks/use-scopes"
import type { Scope, ScopeType } from "@/lib/db"

interface ScopeListProps {
  type: ScopeType
}

export function ScopeList({ type }: ScopeListProps) {
  const scopes = useScopes(type)
  const [modalScope, setModalScope] = useState<Scope | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  // For jobs: simple flat list
  // For projects: group by parent/child
  if (type === "job") {
    return (
      <>
        <div className="flex flex-col">
          {scopes.map((scope) => (
            <ScopeGridRow key={scope.id} scope={scope} onOpenModal={handleOpenModal} />
          ))}
          <AddScopeInput type="job" />
        </div>

        <ScopeModal scope={modalScope} open={isModalOpen} onOpenChange={handleCloseModal} />
      </>
    )
  }

  // Projects: handle nesting
  const parentProjects = scopes.filter((s) => !s.parentId)
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

  return (
    <>
      <div className="flex flex-col">
        {parentProjects.map((project) => (
          <div key={project.id}>
            <ScopeGridRow scope={project} onOpenModal={handleOpenModal} />
            {/* Nested children */}
            {childrenByParent[project.id]?.map((child) => (
              <ScopeGridRow key={child.id} scope={child} isNested onOpenModal={handleOpenModal} />
            ))}
            {/* Add child project */}
            <AddScopeInput type="project" parentId={project.id} />
          </div>
        ))}
        <AddScopeInput type="project" />
      </div>

      <ScopeModal scope={modalScope} open={isModalOpen} onOpenChange={handleCloseModal} />
    </>
  )
}
