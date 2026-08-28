'use client'

import { useOptimistic, useTransition } from 'react'
import { ajustarQuantidade } from '@/app/(app)/estoque/actions'
import { IconMinus, IconPlus } from '@/components/icons'
import { formatarQuantidade } from '@/lib/formatters'

type Props = {
  itemId: string
  quantidade: number
  unidade: string
  onErro: (mensagem: string | null) => void
}

/**
 * Consumir e repor sem sair da listagem.
 *
 * A quantidade é atualizada na hora com useOptimistic — no celular, esperar o
 * round-trip a cada toque deixaria a ação lenta demais para o uso diário.
 * Se o servidor recusar, a revalidação devolve o valor real e a mensagem sobe
 * para o banner da tela.
 */
export function QuantityStepper({ itemId, quantidade, unidade, onErro }: Props) {
  // A forma com reducer importa: se o usuário tocar em "+" cinco vezes rápido,
  // os deltas se acumulam sobre o valor otimista corrente em vez de cada
  // chamada sobrescrever a anterior com o mesmo valor de partida.
  const [otimista, aplicarDelta] = useOptimistic(
    quantidade,
    (atual: number, delta: number) => Math.max(0, atual + delta),
  )
  const [pendente, startTransition] = useTransition()

  function ajustar(delta: number) {
    startTransition(async () => {
      aplicarDelta(delta)
      onErro(null)

      const resultado = await ajustarQuantidade(itemId, delta)
      if (resultado.error) {
        onErro(resultado.error)
      }
    })
  }

  const podeConsumir = otimista > 0

  return (
    <div className="flex items-center gap-1" aria-busy={pendente}>
      <button
        type="button"
        onClick={() => ajustar(-1)}
        disabled={!podeConsumir}
        aria-label="Consumir uma unidade"
        className="press-sm flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-ink transition hover:brightness-95 disabled:opacity-40"
      >
        <IconMinus />
      </button>

      <div className="min-w-16 text-center">
        <span className="text-base font-semibold tabular-nums text-ink">
          {formatarQuantidade(otimista)}
        </span>
        <span className="ml-1 text-xs text-ink-2">{unidade}</span>
      </div>

      <button
        type="button"
        onClick={() => ajustar(1)}
        aria-label="Repor uma unidade"
        className="press-sm flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-ink transition hover:brightness-95 disabled:opacity-40"
      >
        <IconPlus />
      </button>
    </div>
  )
}
