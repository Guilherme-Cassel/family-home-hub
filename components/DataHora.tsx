'use client'

import { useSyncExternalStore } from 'react'
import { FUSO_DA_CASA } from '@/lib/datas'

/** Um formatador por fuso, criado sob demanda — montar Intl não é barato. */
const FORMATADORES = new Map<string, Intl.DateTimeFormat>()

function formatador(fuso: string) {
  let existente = FORMATADORES.get(fuso)

  if (!existente) {
    existente = new Intl.DateTimeFormat('pt-BR', {
      timeZone: fuso,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    FORMATADORES.set(fuso, existente)
  }

  return existente
}

// O fuso de quem está lendo não muda no meio da sessão, então não há nada a
// que se inscrever: a função de cancelamento é devolvida sem fazer nada.
const semInscricao = () => () => {}
const fusoDoLeitor = () => Intl.DateTimeFormat().resolvedOptions().timeZone
const fusoDoServidor = () => FUSO_DA_CASA

/**
 * Momento em que algo aconteceu, no relógio de quem está lendo.
 *
 * `created_at` é `timestamptz`: guarda um instante absoluto, então o registro
 * é o mesmo no mundo inteiro — muda só como se escreve. Quem abrir o app
 * viajando vê a hora do lugar onde está, sem nada mudar no banco.
 *
 * O `useSyncExternalStore` existe justamente para este caso: o snapshot de
 * servidor devolve o fuso da casa, que é o que o HTML inicial traz e o que a
 * hidratação compara; depois de hidratar, o React troca para o fuso real do
 * navegador se ele for outro. Quem está em casa não vê diferença nenhuma.
 */
export function DataHora({ iso }: { iso: string | null }) {
  const fuso = useSyncExternalStore(semInscricao, fusoDoLeitor, fusoDoServidor)

  if (!iso) return <>—</>

  return <time dateTime={iso}>{formatador(fuso).format(new Date(iso))}</time>
}
