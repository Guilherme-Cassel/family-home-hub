import { dataDeIso } from './datas'

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const FORMATO_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const FORMATO_MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** "2026-08-26" -> "26/08/2026" */
export function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return FORMATO_DATA.format(dataDeIso(iso))
}

/** Timestamp do Postgres -> "26/08/2026 14:30" */
export function formatarDataHora(timestamp: string | null): string {
  if (!timestamp) return '—'
  return FORMATO_DATA_HORA.format(new Date(timestamp))
}

export function formatarMoeda(valor: number | null): string {
  if (valor === null || Number.isNaN(valor)) return '—'
  return FORMATO_MOEDA.format(valor)
}

/**
 * Mostra a quantidade sem casas decimais inúteis: 2 em vez de 2,000, mas
 * 1,5 continua 1,5.
 */
export function formatarQuantidade(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(valor)
}

/** "1 dia" / "3 dias" — evita o clássico "1 dias". */
export function pluralDias(dias: number): string {
  const absoluto = Math.abs(dias)
  return `${absoluto} ${absoluto === 1 ? 'dia' : 'dias'}`
}
