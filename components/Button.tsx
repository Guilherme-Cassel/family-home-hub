import { cn } from '@/lib/cn'
import Link from 'next/link'
import type { ComponentProps } from 'react'

type Variant = 'primary' | 'secondary' | 'neutral' | 'ghost' | 'danger'
type Size = 'md' | 'lg' | 'icon'

/**
 * Botões da One UI são pílulas. O "secondary" é tonal (fundo suave do acento),
 * não contornado — é assim que o Galaxy trata a ação secundária. O "neutral"
 * existe para ações que não são do acento nem destrutivas, tipo "Voltar".
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-fill hover:brightness-110',
  secondary: 'bg-accent-soft text-accent-ink hover:brightness-[0.97]',
  neutral: 'bg-surface-2 text-ink hover:brightness-[0.97]',
  ghost: 'text-ink-2 hover:bg-surface-2',
  danger: 'bg-danger text-on-fill hover:brightness-110',
}

const SIZES: Record<Size, string> = {
  md: 'h-12 px-5 text-[15px]',
  lg: 'h-14 px-6 text-base',
  icon: 'h-12 w-12',
}

/** Classes comuns a botões e links com aparência de botão. */
export function buttonClasses(variant: Variant = 'primary', size: Size = 'md') {
  return cn(
    'press inline-flex items-center justify-center gap-2 rounded-full font-semibold',
    'tracking-[-0.01em] select-none',
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
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

/**
 * Botão redondo e discreto da barra superior. Alvo de 44px, glifo em cinza —
 * o padrão da One UI para ações do cabeçalho.
 */
export function IconButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      {...props}
      className={cn(
        'press-sm grid h-11 w-11 shrink-0 place-items-center rounded-full',
        'text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink',
        'disabled:opacity-40',
        className,
      )}
    />
  )
}

export function IconButtonLink({
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        'press-sm grid h-11 w-11 shrink-0 place-items-center rounded-full',
        'text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink',
        className,
      )}
    />
  )
}
