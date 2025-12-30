import type { Metadata } from "next"
import "./globals.css"
import { PageShell } from "@/components/layout/page-shell"

export const metadata: Metadata = {
  title: "Backboard",
  description: "Task management for what's current",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <PageShell>{children}</PageShell>
      </body>
    </html>
  )
}
