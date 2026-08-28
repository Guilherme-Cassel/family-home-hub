import { cn } from '@/lib/cn'
import Link from 'next/link'
import { Squircle } from '@/components/Card'
import type { ReactNode } from 'react'

type Tom = 'neutro' | 'alerta' | 'critico' | 'ok'

const TONS: Record<Tom, { valor: string; fundo: string; tinta: string }> = {
  neutro: { valor: 'text-ink', fundo: 'bg-surface-2', tinta: 'text-ink-2' },
  ok: { valor: 'text-ok', fundo: 'bg-ok-soft', tinta: 'text-ok' },
  alerta: { valor: 'text-warn', fundo: 'bg-warn-soft', tinta: 'text-warn' },
  critico: { valor: 'text-danger', fundo: 'bg-danger-soft', tinta: 'text-danger' },
}

type Props = {
  href: string
  rotulo: string
  valor: number
  detalhe?: ReactNode
  tom?: Tom
  icone?: ReactNode
}

/** Número grande e clicável do resumo da casa. */
export function StatCard({
  href,
  rotulo,
  valor,
  detalhe,
  tom = 'neutro',
  icone,
}: Props) {
  const estilo = TONS[tom]

  return (
    <Link href={href} className="press block rounded-card bg-surface p-[18px]">
      <span className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'block text-[40px] leading-none font-bold tracking-[-0.04em] tabular-nums',
            estilo.valor,
          )}
        >
          {valor}
        </span>
        {icone ? (
          <Squircle cor={estilo.fundo} tinta={estilo.tinta} tamanho="sm">
            {icone}
          </Squircle>
        ) : null}
      </span>

      <span className="mt-2.5 block text-[14.5px] font-semibold tracking-[-0.01em] text-ink">
        {rotulo}
      </span>
      {detalhe ? (
        <span className="mt-0.5 block text-[12.5px] text-ink-2">{detalhe}</span>
      ) : null}
    </Link>
  )
}
