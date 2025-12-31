"use client"

import { ScopeList } from "@/components/scopes/scope-list"
import { ScopeGridHeader } from "@/components/scopes/scope-grid-header"

export default function JobsPage() {
  return (
    <div className="theme-gold flex h-full flex-col overflow-hidden">
      {/* Scrollable grid container */}
      <div className="flex flex-1 flex-col overflow-x-auto">
        {/* Grid header with day columns */}
        <ScopeGridHeader type="jobs" />

        {/* Scrollable job list with grid rows */}
        <div className="flex-1 overflow-y-auto">
          <ScopeList type="job" />
        </div>
      </div>
    </div>
  )
}
