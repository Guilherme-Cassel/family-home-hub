import { FRACAO_ALERTA_MANUTENCAO } from './constants'
import { diasAte } from './datas'
import { pluralDias } from './formatters'
import type {
  MaintenanceItem,
  MaintenanceStatus,
  StockItem,
  StockStatus,
} from '@/types/domain'
import type { BadgeTone } from '@/components/Badge'

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

/**
 * Situação de um item de estoque.
 *
 * A ordem importa: falta de estoque pesa mais do que validade, porque é o que
 * manda o item para a lista de compras.
 */
export function statusDoItem(
  item: StockItem,
  diasAvisoValidade: number,
): StockStatus {
  if (item.is_below_minimum) return 'abaixo_do_minimo'

  if (item.expiration_date) {
    const dias = diasAte(item.expiration_date)
    if (dias < 0) return 'vencido'
    if (dias <= diasAvisoValidade) return 'vence_em_breve'
  }

  return 'ok'
}

export function rotuloStatusEstoque(
  item: StockItem,
  status: StockStatus,
): { texto: string; tom: BadgeTone } | null {
  switch (status) {
    case 'abaixo_do_minimo':
      return { texto: 'Abaixo do mínimo', tom: 'danger' }
    case 'vencido':
      return { texto: 'Vencido', tom: 'danger' }
    case 'vence_em_breve': {
      const dias = item.expiration_date ? diasAte(item.expiration_date) : 0
      return {
        texto: dias === 0 ? 'Vence hoje' : `Vence em ${pluralDias(dias)}`,
        tom: 'warning',
      }
    }
    default:
      return null
  }
}

/** Item de alimento perto de vencer — usado no dashboard. */
export function venceEmBreve(item: StockItem, diasAviso: number): boolean {
  if (!item.expiration_date) return false
  return diasAte(item.expiration_date) <= diasAviso
}

// ---------------------------------------------------------------------------
// Manutenção
// ---------------------------------------------------------------------------

/**
 * Semáforo da manutenção: vermelho se passou do prazo, amarelo nos últimos
 * 15% do intervalo, verde no resto.
 */
export function statusDaManutencao(item: MaintenanceItem): MaintenanceStatus {
  const dias = diasAte(item.next_due_date)
  if (dias < 0) return 'atrasado'

  const janelaAlerta = Math.max(
    1,
    Math.round(item.frequency_days * FRACAO_ALERTA_MANUTENCAO),
  )
  if (dias <= janelaAlerta) return 'perto_do_vencimento'

  return 'em_dia'
}

export function rotuloStatusManutencao(item: MaintenanceItem): {
  texto: string
  tom: BadgeTone
} {
  const dias = diasAte(item.next_due_date)
  const status = statusDaManutencao(item)

  if (status === 'atrasado') {
    return { texto: `Atrasado há ${pluralDias(dias)}`, tom: 'danger' }
  }
  if (status === 'perto_do_vencimento') {
    return {
      texto: dias === 0 ? 'Vence hoje' : `Vence em ${pluralDias(dias)}`,
      tom: 'warning',
    }
  }
  return { texto: `Em dia · faltam ${pluralDias(dias)}`, tom: 'success' }
}

/** Ordena do mais atrasado para o menos urgente. */
export function porUrgencia(a: MaintenanceItem, b: MaintenanceItem): number {
  return a.next_due_date.localeCompare(b.next_due_date)
}
