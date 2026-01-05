"use client"

import { ArchiveRestore } from "lucide-react"
import { ContentPanel } from "@/components/layout/content-panel"
import { useArchivedScopes } from "@/hooks/use-scopes"
import { unarchiveScope } from "@/lib/scope-mutations"
import { ActivityDot } from "@/components/ui/activity-dot"
import { cn } from "@/lib/utils"

export default function ArchivePage() {
  const archivedScopes = useArchivedScopes()

  if (archivedScopes === undefined) {
    return (
      <ContentPanel>
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </ContentPanel>
    )
  }

  return (
    <ContentPanel>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h1 className="text-lg font-semibold">Archive</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Archived items are automatically deleted after 30 days
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {archivedScopes.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">No archived items</p>
            </div>
          ) : (
            <div className="divide-y">
              {archivedScopes.map((scope) => (
                <ArchivedScopeItem
                  key={scope.id}
                  id={scope.id}
                  title={scope.title}
                  type={scope.type}
                  archivedAt={scope.archivedAt!}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ContentPanel>
  )
}

interface ArchivedScopeItemProps {
  id: string
  title: string
  type: "job" | "project"
  archivedAt: number
}

function ArchivedScopeItem({ id, title, type, archivedAt }: ArchivedScopeItemProps) {
  const handleUnarchive = async () => {
    await unarchiveScope(id)
  }

  // Format date
  const archiveDate = new Date(archivedAt)
  const dateStr = archiveDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: archiveDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  })

  return (
    <div className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50">
      {/* Type indicator dot */}
      <div className={type === "job" ? "theme-gold" : "theme-blue"}>
        <ActivityDot variant={type === "job" ? "gold" : "blue"} />
      </div>

      {/* Title and date */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">Archived {dateStr}</p>
      </div>

      {/* Unarchive button */}
      <button
        onClick={handleUnarchive}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          "transition-colors"
        )}
      >
        <ArchiveRestore className="h-4 w-4" />
        <span>Unarchive</span>
      </button>
    </div>
  )
}
