import { cn } from "@/lib/utils"

export type DotVariant = "gold" | "blue" | "neutral" | "red"

interface ActivityDotProps {
  variant: DotVariant
  outlined?: boolean
  className?: string
}

const filledClasses: Record<DotVariant, string> = {
  gold: "bg-[oklch(0.72_0.155_85)]",
  blue: "bg-[oklch(0.6_0.1_220)]",
  neutral: "bg-muted-foreground",
  red: "bg-destructive",
}

const outlinedClasses: Record<DotVariant, string> = {
  gold: "border-2 border-[oklch(0.72_0.155_85)] bg-transparent",
  blue: "border-2 border-[oklch(0.6_0.1_220)] bg-transparent",
  neutral: "border-2 border-muted-foreground bg-transparent",
  red: "border-2 border-destructive bg-transparent",
}

export function ActivityDot({ variant, outlined = false, className }: ActivityDotProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        outlined ? outlinedClasses[variant] : filledClasses[variant],
        className
      )}
    />
  )
}

interface ActivityDotsProps {
  variants: DotVariant[]
  className?: string
}

export function ActivityDots({ variants, className }: ActivityDotsProps) {
  if (variants.length === 0) return null

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {variants.map((variant, i) => (
        <ActivityDot key={`${variant}-${i}`} variant={variant} />
      ))}
    </span>
  )
}
