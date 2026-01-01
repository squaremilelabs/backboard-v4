"use client"

import { ContentPanel } from "@/components/layout/content-panel"

export default function ArchivePage() {
  return (
    <ContentPanel>
      <div className="flex h-full flex-col p-6">
        <h1 className="text-lg font-semibold">Archive</h1>
        <p className="mt-2 text-sm text-muted-foreground">Archived items will appear here...</p>
      </div>
    </ContentPanel>
  )
}
