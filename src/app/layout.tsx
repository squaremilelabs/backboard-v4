import type { Metadata } from "next"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import "./globals.css"
import { PageShell } from "@/components/layout/page-shell"
import { SyncProvider } from "@/components/providers/sync-provider"

export const metadata: Metadata = {
  title: "Backboard V4 (Prototype)",
  description: "Prototype",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-muted">
      <body className="flex flex-col items-center bg-muted">
        <NuqsAdapter>
          <SyncProvider>
            <PageShell>{children}</PageShell>
          </SyncProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
