"use client"

import { ContentPanel } from "@/components/layout/content-panel"
import { TaskListTabs } from "@/components/tasks/task-list-tabs"
import { ScopeList } from "@/components/tasks/scope-list"
import { ScopeSelector } from "@/components/tasks/scope-selector"
import { TaskContentPlaceholder } from "@/components/tasks/task-content-placeholder"
import { useIsMobile } from "@/hooks/use-media-query"

export default function TasksPage() {
  const isMobile = useIsMobile()

  return (
    <ContentPanel>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Tabs (horizontal navigation) */}
        <TaskListTabs />

        {/* Two-column layout: Scope selector + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Scope selector sidebar (desktop) */}
          {!isMobile && (
            <aside className="w-64 shrink-0 overflow-y-auto border-r">
              <ScopeList />
            </aside>
          )}

          {/* Right: Main content area */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* Mobile: Scope selector dropdown */}
            {isMobile && (
              <div className="border-b p-3">
                <ScopeSelector />
              </div>
            )}

            {/* Content area (placeholder for now) */}
            <div className="flex-1 overflow-y-auto">
              <TaskContentPlaceholder />
            </div>
          </main>
        </div>
      </div>
    </ContentPanel>
  )
}
