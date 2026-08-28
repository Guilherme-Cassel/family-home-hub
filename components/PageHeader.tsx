'use client'

import { cn } from '@/lib/cn'
import { useEffect, useState, type ReactNode } from 'react'
import { IconButtonLink } from '@/components/Button'
import { IconArrowLeft } from '@/components/icons'

type Props = {
  titulo: string
  subtitulo?: ReactNode
  /** Endereço da seta de voltar. Sem isso, o cabeçalho não mostra seta. */
  voltar?: string
  /** Botões redondos da direita, no padrão da barra da One UI. */
  acao?: ReactNode
}

/** A partir de quantos pixels de rolagem o título grande dá lugar ao pequeno. */
const LIMIAR = 24

/**
 * Cabeçalho que recolhe — a assinatura da One UI.
 *
 * O título abre enorme e alinhado à esquerda, com o topo vazio de propósito:
 * é o que empurra o conteúdo para a metade de baixo da tela, onde o polegar
 * alcança. Ao rolar, ele some e reaparece pequeno e centralizado na barra
 * fixa, que só então ganha a linha de separação.
 */
export function PageHeader({ titulo, subtitulo, voltar, acao }: Props) {
  const [recolhido, setRecolhido] = useState(false)

  useEffect(() => {
    const aoRolar = () => setRecolhido(window.scrollY > LIMIAR)

    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <>
      {/* A barra sangra até as bordas da coluna de conteúdo. */}
      <div
        className={cn(
          'glass sticky top-0 z-30 -mx-5 flex h-14 items-center gap-1 px-2',
          'transition-shadow duration-200',
          recolhido && 'shadow-[0_1px_0_var(--color-line)]',
        )}
      >
        {voltar ? (
          <IconButtonLink href={voltar} aria-label="Voltar">
            <IconArrowLeft />
          </IconButtonLink>
        ) : (
          <span className="w-11 shrink-0" aria-hidden="true" />
        )}

        <span
          aria-hidden="true"
          className={cn(
            'min-w-0 flex-1 truncate px-1 text-center text-[17px] font-bold',
            'tracking-[-0.01em] transition-all duration-200',
            recolhido ? 'opacity-100' : 'translate-y-1.5 opacity-0',
          )}
        >
          {titulo}
        </span>

        <div className="flex shrink-0 items-center justify-end gap-0.5">
          {acao ?? <span className="w-11" aria-hidden="true" />}
        </div>
      </div>

      <header
        className={cn(
          'pt-4 pb-6 transition-all duration-200',
          recolhido && '-translate-y-2.5 opacity-0',
        )}
      >
        <h1 className="text-[34px] leading-[1.15] font-bold tracking-[-0.025em] text-ink">
          {titulo}
        </h1>
        {subtitulo ? (
          <p className="mt-1.5 text-[15px] text-ink-2">{subtitulo}</p>
        ) : null}
      </header>
    </>
  )
}
