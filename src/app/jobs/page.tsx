"use client"

import { ContentPanel } from "@/components/layout/content-panel"
import { ScopeList } from "@/components/scopes/scope-list"
import { ScopeGridHeader } from "@/components/scopes/scope-grid-header"

export default function JobsPage() {
  return (
    <ContentPanel>
      <div className="theme-gold flex h-full flex-col">
        {/* Grid header with day columns */}
        <ScopeGridHeader type="jobs" />

        {/* Scrollable job list with grid rows */}
        <div className="flex-1 overflow-auto">
          <ScopeList type="job" />
        </div>
      </div>
    </ContentPanel>
  )
}
