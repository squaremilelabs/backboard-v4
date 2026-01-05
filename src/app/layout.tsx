import type { Metadata } from "next"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import "./globals.css"
import { PageShell } from "@/components/layout/page-shell"

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
          <PageShell>{children}</PageShell>
        </NuqsAdapter>
      </body>
    </html>
  )
}
