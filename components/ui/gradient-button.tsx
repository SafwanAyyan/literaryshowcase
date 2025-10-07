"use client"

import * as React from 'react'
import { ThemeTokens, brandButtonClasses } from '@/lib/theme-tokens'

type GradientButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  rounded?: 'full' | 'xl'
}

/**
 * Legacy GradientButton wrapper, now normalized to ThemeTokens.
 * Prefer using the unified Button component with variant="brand" going forward.
 */
export function GradientButton({ leftIcon, rightIcon, className = '', rounded = 'full', children, ...props }: GradientButtonProps) {
  const radius = rounded === 'full' ? ThemeTokens.radius.pill : ThemeTokens.radius.button
  const normalized = brandButtonClasses([radius, className].filter(Boolean).join(' '))
  return (
    <button {...props} className={normalized}>
      {leftIcon}
      <span className={ThemeTokens.font.buttonWeight}>{children}</span>
      {rightIcon}
    </button>
  )
}


