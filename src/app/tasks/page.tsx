"use client"

import { ContentPanel } from "@/components/layout/content-panel"

// Tasks page has a different layout - scope list on gray bg, task list in white panel
// This will be implemented properly in a future spec
export default function TasksPage() {
  return (
    <div className="flex h-full">
      {/* Left: Scope list (on gray bg - no panel) */}
      <div className="w-64 shrink-0 p-4">
        <p className="text-sm text-muted-foreground">Scope list coming soon...</p>
      </div>

      {/* Right: Task list (in ContentPanel) */}
      <ContentPanel>
        <div className="p-6">
          <h1 className="text-lg font-semibold">Tasks</h1>
          <p className="mt-2 text-sm text-muted-foreground">Task management coming soon...</p>
        </div>
      </ContentPanel>
    </div>
  )
}
