"use client"

import { ContentPanel } from "@/components/layout/content-panel"
import { ScopeList } from "@/components/scopes/scope-list"
import { ScopeGridHeader } from "@/components/scopes/scope-grid-header"

export default function ProjectsPage() {
  return (
    <ContentPanel>
      <div className="theme-blue flex h-full flex-col">
        {/* Grid header with month columns */}
        <ScopeGridHeader type="projects" />

        {/* Scrollable project list with grid rows */}
        <div className="flex-1 overflow-auto">
          <ScopeList type="project" />
        </div>
      </div>
    </ContentPanel>
  )
}
