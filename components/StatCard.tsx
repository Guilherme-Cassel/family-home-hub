import clsx from 'clsx'
import Link from 'next/link'
import type { ReactNode } from 'react'

type Tom = 'neutro' | 'alerta' | 'critico' | 'ok'

const TONS: Record<Tom, { valor: string; caixa: string }> = {
  neutro: { valor: 'text-slate-900', caixa: 'ring-slate-200' },
  ok: { valor: 'text-emerald-700', caixa: 'ring-emerald-200 bg-emerald-50/50' },
  alerta: { valor: 'text-amber-700', caixa: 'ring-amber-200 bg-amber-50/50' },
  critico: { valor: 'text-red-700', caixa: 'ring-red-200 bg-red-50/50' },
}

type Props = {
  href: string
  rotulo: string
  valor: number
  detalhe?: ReactNode
  tom?: Tom
}

/** Número grande e clicável do resumo da casa. */
export function StatCard({ href, rotulo, valor, detalhe, tom = 'neutro' }: Props) {
  const estilo = TONS[tom]

  return (
    <Link
      href={href}
      className={clsx(
        'block rounded-2xl bg-white p-4 shadow-sm ring-1 transition-colors',
        'hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        estilo.caixa,
      )}
    >
      <p className={clsx('text-3xl font-semibold tabular-nums', estilo.valor)}>
        {valor}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-700">{rotulo}</p>
      {detalhe ? <p className="mt-1 text-xs text-slate-500">{detalhe}</p> : null}
    </Link>
  )
}
