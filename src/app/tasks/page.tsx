"use client"

import { Suspense } from "react"
import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { ContentPanel } from "@/components/layout/content-panel"
import { TaskListTabs } from "@/components/tasks/task-list-tabs"
import { ScopeList } from "@/components/tasks/scope-list"
import { ScopeSelector } from "@/components/tasks/scope-selector"
import { TaskList } from "@/components/tasks/task-list"
import { RecentTaskList } from "@/components/tasks/recent-task-list"
import { RecurringTaskList } from "@/components/tasks/recurring-task-list"
import { TaskContentPlaceholder } from "@/components/tasks/task-content-placeholder"
import { TaskDndProvider } from "@/components/tasks/task-dnd-provider"
import { TaskSelectionProvider } from "@/hooks/use-task-selection"
import { useIsMobile } from "@/hooks/use-media-query"

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksPageSkeleton />}>
      <TasksPageContent />
    </Suspense>
  )
}

function TasksPageSkeleton() {
  return (
    <ContentPanel>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="h-12 border-b" />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 shrink-0 border-r" />
          <div className="flex-1" />
        </div>
      </div>
    </ContentPanel>
  )
}

function TasksPageContent() {
  const isMobile = useIsMobile()
  const [listType] = useQueryState("list", searchParamsParsers.list)

  // Show appropriate list based on type
  const isActiveList = ["now", "later", "backlog"].includes(listType)
  const isRecentList = listType === "recent"
  const isRecurringList = listType === "recurring"

  return (
    <ContentPanel>
      <TaskSelectionProvider>
        <TaskDndProvider>
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
              <main className="flex flex-1 flex-col overflow-x-hidden overflow-y-hidden">
                {/* Mobile: Scope selector dropdown */}
                {isMobile && (
                  <div className="border-b p-3">
                    <ScopeSelector />
                  </div>
                )}

                {/* Content area */}
                <div className="flex-1 overflow-x-hidden overflow-y-hidden">
                  {isActiveList ? (
                    <TaskList />
                  ) : isRecentList ? (
                    <RecentTaskList />
                  ) : isRecurringList ? (
                    <RecurringTaskList />
                  ) : (
                    <TaskContentPlaceholder />
                  )}
                </div>
              </main>
            </div>
          </div>
        </TaskDndProvider>
      </TaskSelectionProvider>
    </ContentPanel>
  )
}
