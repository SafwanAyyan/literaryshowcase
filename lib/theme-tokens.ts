/**
 * Centralized design tokens for buttons and shared UI primitives.
 * Use these tokens to ensure consistent gradients, radii, spacing, and states.
 *
 * Adoption plan:
 * - Prefer Button variant "brand" (to be wired in components/ui/button.tsx)
 * - Legacy gradient buttons should import brandButtonClasses() for consistency
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
    focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 focus-visible:ring-offset-2',
    disabled: 'disabled:opacity-50 disabled:pointer-events-none',
  },
  gradient: {
    // Chosen as most common production gradient in project
    brand: {
      base: 'bg-gradient-to-r from-[#1e1e1f] to-[#2a0a37]',
      hover: 'hover:from-[#252526] hover:to-[#3a0f4d]',
      active: 'active:translate-y-[1px]',
      focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 focus-visible:ring-offset-2',
      disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    } as GradientToken,
    // Subtle secondary gradient used occasionally (not primary)
    subtle: {
      base: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
      hover: 'hover:from-purple-500/30 hover:to-pink-500/30',
      active: 'active:translate-y-[1px]',
      focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 focus-visible:ring-offset-2',
      disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    } as GradientToken,
  },
  shadow: {
    brand: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.35)]',
  },
} as const

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
    'transition-all duration-200',
    extra,
  ].filter(Boolean)
  return parts.join(' ')
}

/**
 * Utility to build gradient token set into className string
 */
export function gradientTokenClasses(token: GradientToken): string {
  return [
    token.base,
    token.hover,
    token.active,
    token.focus,
    token.disabled,
  ].join(' ')
}