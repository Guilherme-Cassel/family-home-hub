import { cn } from '@/lib/cn'
import Link from 'next/link'
import type { ComponentProps } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg' | 'icon'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700',
  secondary:
    'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 active:bg-slate-100',
  ghost: 'text-slate-700 hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-700',
}

const SIZES: Record<Size, string> = {
  md: 'h-11 px-4 text-sm',
  lg: 'h-13 px-5 text-base',
  icon: 'h-11 w-11',
}

/** Classes comuns a botões e links com aparência de botão. */
export function buttonClasses(variant: Variant = 'primary', size: Size = 'md') {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
    'transition-colors select-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
  )
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: Variant
  size?: Size
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button {...props} className={cn(buttonClasses(variant, size), className)} />
  )
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant
  size?: Size
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link {...props} className={cn(buttonClasses(variant, size), className)} />
  )
}
