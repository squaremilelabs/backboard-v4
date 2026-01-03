"use client"

import { ContentPanel } from "@/components/layout/content-panel"
import { ScopeList } from "@/components/scopes/scope-list"
import { ScopeGridHeader } from "@/components/scopes/scope-grid-header"

export default function ProjectsPage() {
  return (
    <ContentPanel>
      <div className="theme-blue flex h-full flex-col">
        {/* Single scroll container for both header and content */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-fit">
            {/* Sticky header row */}
            <ScopeGridHeader type="projects" />
            {/* Content rows */}
            <ScopeList type="project" />
          </div>
        </div>
      </div>
    </ContentPanel>
  )
}
