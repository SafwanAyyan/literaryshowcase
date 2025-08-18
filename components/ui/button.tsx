import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { ThemeTokens, gradientTokenClasses, MotionTokens, transitionClass } from "@/lib/theme-tokens"

const buttonVariants = cva(
  // Base: tokens-aligned radius, smooth micro-interactions (GPU-friendly)
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-xl text-sm font-medium",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    transitionClass("opacity,transform,box-shadow,background-color,color", "micro"),
    "will-change-transform will-change-opacity",
  ].join(" "),
  {
    variants: {
      variant: {
        // Shadcn defaults (kept for compatibility)
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Unified brand gradient variant
        brand: [
          gradientTokenClasses(ThemeTokens.gradient.brand),
          ThemeTokens.shadow.brand,
          ThemeTokens.color.buttonText,
          // Soft lift on hover, gentle press on active
          "hover:-translate-y-0.5 active:translate-y-[1px]",
          ThemeTokens.elevation?.hover ?? "",
        ].join(" "),
        subtle: [
          gradientTokenClasses(ThemeTokens.gradient.subtle),
          "text-white",
          "hover:-translate-y-0.5 active:translate-y-[1px]",
        ].join(" "),
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-xl px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
      round: {
        default: "",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "brand",
      size: "default",
      round: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, round, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, round, className }))}
        ref={ref}
        {...props}
        // Respect reduced motion
        data-reduced-motion={typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "true" : "false"}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
