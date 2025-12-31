"use client"

import { ScopeList } from "@/components/scopes/scope-list"
import { ScopeGridHeader } from "@/components/scopes/scope-grid-header"

export default function ProjectsPage() {
  return (
    <div className="theme-blue flex h-full flex-col overflow-hidden">
      {/* Scrollable grid container */}
      <div className="flex flex-1 flex-col overflow-x-auto">
        {/* Grid header with month columns */}
        <ScopeGridHeader type="projects" />

        {/* Scrollable project list with grid rows */}
        <div className="flex-1 overflow-y-auto">
          <ScopeList type="project" />
        </div>
      </div>
    </div>
  )
}
