import { cn } from "@/lib/utils"

interface ContentPanelProps {
  children: React.ReactNode
  className?: string
}

export function ContentPanel({ children, className }: ContentPanelProps) {
  return (
    <div className={cn("h-full overflow-hidden rounded-xl border-2 bg-background", className)}>
      {children}
    </div>
  )
}
