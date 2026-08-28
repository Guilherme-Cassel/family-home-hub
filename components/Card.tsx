import { cn } from '@/lib/cn'
import type { ComponentProps, ReactNode } from 'react'

/**
 * Bloco branco de canto largo — a caixa básica da One UI.
 *
 * Sem sombra e sem anel de propósito: na One UI a separação vem do contraste
 * entre a superfície e o fundo cinza da tela, não de bordas desenhadas.
 */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div {...props} className={cn('rounded-card bg-surface', className)} />
  )
}

/**
 * Card que agrupa itens de lista com divisórias entre eles, como as telas de
 * Ajustes do Galaxy. Aceita `<li>` ou `<div>` como filhos diretos.
 */
export function CardGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'divide-y divide-line rounded-card bg-surface overflow-hidden',
        className,
      )}
    />
  )
}

/** Rótulo de seção: pequeno, na cor de acento, colado no topo do grupo. */
export function SectionLabel({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      {...props}
      className={cn(
        'px-1.5 pb-2.5 text-[13px] font-semibold text-accent',
        className,
      )}
    />
  )
}

type SquircleProps = {
  /** Classe de fundo (`bg-danger`) ou de fundo suave (`bg-warn-soft`). */
  cor: string
  /** Cor do glifo quando o fundo é suave. Sem isso, o glifo fica branco. */
  tinta?: string
  tamanho?: 'sm' | 'md'
  children: ReactNode
}

/**
 * Quadradinho arredondado colorido que carrega o ícone de uma linha — o
 * elemento que mais identifica visualmente as listas da One UI.
 */
export function Squircle({
  cor,
  tinta = 'text-on-fill',
  tamanho = 'md',
  children,
}: SquircleProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center',
        tamanho === 'md' ? 'h-10 w-10 rounded-[13px]' : 'h-8 w-8 rounded-[11px]',
        cor,
        tinta,
      )}
    >
      {children}
    </span>
  )
}
