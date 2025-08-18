import { cn } from "@/lib/utils"

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  "aria-label"?: string
}

/**
 * Accessible, zero‑CLS skeleton with gentle 1.2s shimmer.
 * Honors prefers-reduced-motion via global CSS settings.
 */
function Skeleton({ className, ...props }: SkeletonProps) {
  const hasAriaLabel = typeof props["aria-label"] === "string" && props["aria-label"].length > 0

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-white/10",
        "shimmer", // 1.2s shimmer from globals.css (GPU-friendly)
        className
      )}
      role={hasAriaLabel ? "status" : undefined}
      aria-live={hasAriaLabel ? "polite" : undefined}
      aria-hidden={hasAriaLabel ? undefined : true}
      {...props}
    />
  )
}

export { Skeleton }
