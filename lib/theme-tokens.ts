/**
 * Centralized design tokens for buttons and shared UI primitives.
 * Use these tokens to ensure consistent gradients, radii, spacing, motion, and states.
 *
 * Adoption plan:
 * - Prefer Button variant "brand" (wired in components/ui/button.tsx)
 * - Legacy gradient buttons should import brandButtonClasses() for consistency
 * - Use MotionTokens for all transitions/animations to ensure 60fps-friendly micro-interactions
 */
 
export type GradientToken = {
  base: string
  hover: string
  active: string
  focus: string
  disabled: string
}
 
export const ThemeTokens = {
  radius: {
    // Standardize all actionable controls to rounded-xl across site
    button: 'rounded-xl',
    pill: 'rounded-full',
    card: 'rounded-2xl',
  },
  spacing: {
    buttonX: 'px-5',
    buttonY: 'py-2.5',
    buttonGap: 'gap-2',
  },
  font: {
    buttonSize: 'text-sm',
    buttonWeight: 'font-medium',
  },
  color: {
    buttonText: 'text-white',
  },
  state: {
    // Focus-visible ring tuned for accessibility
    focusRing:
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 focus-visible:ring-offset-2',
    disabled: 'disabled:opacity-50 disabled:pointer-events-none',
  },
  gradient: {
    // Chosen as most common production gradient in project
    brand: {
      base: 'bg-gradient-to-r from-[#1e1e1f] to-[#2a0a37]',
      hover: 'hover:from-[#252526] hover:to-[#3a0f4d]',
      active: 'active:translate-y-[1px]',
      focus:
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 focus-visible:ring-offset-2',
      disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    } as GradientToken,
    // Subtle secondary gradient used occasionally (not primary)
    subtle: {
      base: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
      hover: 'hover:from-purple-500/30 hover:to-pink-500/30',
      active: 'active:translate-y-[1px]',
      focus:
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 focus-visible:ring-offset-2',
      disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    } as GradientToken,
  },
  shadow: {
    brand:
      'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.35)]',
  },
  elevation: {
    base: 'shadow-sm',
    card:
      'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.35)]',
    hover:
      'hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)] hover:translate-y-[-2px]',
  },
} as const
 
/**
 * Motion tokens for consistent timings and easing. Favor transforms/opacity only.
 * Durations are chosen per brief: micro 120–220ms, page 220–350ms, shimmer ~1.2s
 */
export const MotionTokens = {
  duration: {
    microFast: 120,
    micro: 180,
    microSlow: 220,
    page: 300,
    pageSlow: 350,
    shimmer: 1200,
  },
  easing: {
    standard: 'cubic-bezier(0.22,1,0.36,1)',
    emphasized: 'cubic-bezier(0.2,0,0,1)',
    entrance: 'cubic-bezier(0.16,1,0.3,1)',
  },
  media: {
    reduced: '@media (prefers-reduced-motion: reduce)',
  },
} as const
 
/**
 * Build a Tailwind-friendly transition string using MotionTokens and arbitrary values
 * Example: transitionClass('opacity,transform', 'micro') -> 'transition-[opacity,transform] duration-[180ms] ease-[cubic-bezier(...)]'
 */
export function transitionClass(
  props: string = 'opacity,transform',
  duration:
    | keyof typeof MotionTokens.duration
    | number = 'micro',
  easing: keyof typeof MotionTokens.easing = 'standard'
): string {
  const ms =
    typeof duration === 'number'
      ? duration
      : MotionTokens.duration[duration] ?? MotionTokens.duration.micro
  const ease = MotionTokens.easing[easing] ?? MotionTokens.easing.standard
  return [
    `transition-[${props}]`,
    `duration-[${ms}ms]`,
    `ease-[${ease}]`,
  ].join(' ')
}
 
/**
 * Compose canonical brand button classes
 * Use for non-shadcn buttons or legacy elements to match tokens exactly.
 */
export function brandButtonClasses(extra?: string): string {
  const parts = [
    'inline-flex items-center justify-center',
    ThemeTokens.spacing.buttonX,
    ThemeTokens.spacing.buttonY,
    ThemeTokens.spacing.buttonGap,
    ThemeTokens.font.buttonSize,
    ThemeTokens.font.buttonWeight,
    ThemeTokens.color.buttonText,
    ThemeTokens.radius.button,
    ThemeTokens.gradient.brand.base,
    ThemeTokens.gradient.brand.hover,
    ThemeTokens.gradient.brand.active,
    ThemeTokens.state.focusRing,
    ThemeTokens.state.disabled,
    ThemeTokens.shadow.brand,
    transitionClass('opacity,transform,box-shadow', 'micro'),
    extra,
  ].filter(Boolean)
  return parts.join(' ')
}
 
/**
 * Utility to build gradient token set into className string
 */
export function gradientTokenClasses(token: GradientToken): string {
  return [token.base, token.hover, token.active, token.focus, token.disabled].join(
    ' '
  )
}