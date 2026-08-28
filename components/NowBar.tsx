'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { IconBox, IconWrench } from '@/components/icons'

export type AtividadeAgora = {
  id: string
  titulo: string
  detalhe: string
  href: string
  acao: string
  tom: 'critico' | 'alerta'
  icone: 'manutencao' | 'estoque'
}

const ICONES = { manutencao: IconWrench, estoque: IconBox }
const TONS = { critico: 'bg-danger', alerta: 'bg-warn' }

/** De quanto em quanto tempo a barra troca de atividade. */
const INTERVALO_MS = 5000

/**
 * Now Bar — a pílula escura flutuante da One UI 7/8, que mostra o que está
 * acontecendo agora. Aqui carrega o que a casa tem de mais urgente, e alterna
 * sozinha quando há mais de uma coisa pendente.
 *
 * Não aparece quando não há nada urgente: uma barra permanente dizendo "tudo
 * certo" só ocuparia espaço.
 */
export function NowBar({ atividades }: { atividades: AtividadeAgora[] }) {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (atividades.length < 2) return

    const id = setInterval(
      () => setIndice((i) => (i + 1) % atividades.length),
      INTERVALO_MS,
    )
    return () => clearInterval(id)
  }, [atividades.length])

  if (atividades.length === 0) return null

  // Se a lista encolher entre renderizações, o índice antigo pode sobrar.
  const atual = atividades[indice % atividades.length]
  const Icone = ICONES[atual.icone]

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 px-4"
    >
      <div className="pointer-events-auto mx-auto flex h-[60px] max-w-xl items-center gap-3 rounded-full bg-[rgb(24_26_29/0.92)] px-2.5 text-white shadow-[0_10px_30px_-8px_rgb(0_0_0/0.45)] backdrop-blur-xl dark:bg-[rgb(44_47_51/0.92)]">
        <span
          key={`icone-${atual.id}`}
          className={cn(
            'grid h-10 w-10 shrink-0 animate-[surgir_0.45s_ease] place-items-center rounded-full text-on-fill',
            TONS[atual.tom],
          )}
        >
          <Icone width={20} height={20} />
        </span>

        <span key={`texto-${atual.id}`} className="min-w-0 flex-1 animate-[surgir_0.45s_ease]">
          <span className="block truncate text-[14.5px] font-semibold tracking-[-0.01em]">
            {atual.titulo}
          </span>
          <span className="block truncate text-[12.5px] text-white/60">
            {atual.detalhe}
          </span>
        </span>

        <Link
          href={atual.href}
          className="press-sm h-9 shrink-0 rounded-full bg-white/15 px-4 text-[13.5px] leading-9 font-semibold text-white transition-colors hover:bg-white/25"
        >
          {atual.acao}
        </Link>
      </div>
    </div>
  )
}
