"use client"

import * as React from 'react'

type GradientButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  rounded?: 'full' | 'xl'
}

export function GradientButton({ leftIcon, rightIcon, className = '', rounded = 'full', children, ...props }: GradientButtonProps) {
  const radius = rounded === 'full' ? 'rounded-full' : 'rounded-xl'
  return (
    <button
      {...props}
      className={[
        'relative inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white select-none',
        'transition-all duration-200',
        radius,
        // Soft glossy card with subtle inner highlight and outer glow
        'bg-gradient-to-r from-[#1d1028] via-[#271337] to-[#1a0f24]',
        'hover:from-[#25143a] hover:via-[#2e1746] hover:to-[#20122e]',
        'border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_30px_rgba(0,0,0,0.35)]',
        'active:translate-y-[1px]',
        'disabled:opacity-60',
        className,
      ].join(' ')}
    >
      {leftIcon}
      <span className="font-medium">{children}</span>
      {rightIcon}
    </button>
  )
}


