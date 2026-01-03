"use client"

import { ContentPanel } from "@/components/layout/content-panel"
import { ScopeList } from "@/components/scopes/scope-list"
import { ScopeGridHeader } from "@/components/scopes/scope-grid-header"

export default function JobsPage() {
  return (
    <ContentPanel>
      <div className="theme-gold flex h-full flex-col">
        {/* Single scroll container for both header and content */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-fit">
            {/* Sticky header row */}
            <ScopeGridHeader type="jobs" />
            {/* Content rows */}
            <ScopeList type="job" />
          </div>
        </div>
      </div>
    </ContentPanel>
  )
}
