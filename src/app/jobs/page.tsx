"use client"

import { ScopeList } from "@/components/scopes/scope-list"
import { GridPlaceholder } from "@/components/scopes/grid-placeholder"

export default function JobsPage() {
  return (
    <div className="theme-gold flex h-full">
      {/* Left panel: Job list */}
      <div className="w-full border-r md:w-72 lg:w-80">
        <div className="border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Jobs</h1>
        </div>
        <div className="overflow-auto">
          <ScopeList type="job" />
        </div>
      </div>

      {/* Right panel: Grid placeholder (hidden on mobile) */}
      <div className="hidden flex-1 md:block">
        <GridPlaceholder type="jobs" />
      </div>
    </div>
  )
}
