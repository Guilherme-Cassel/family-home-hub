import type { Tables } from './database'

export type Profile = Tables<'profiles'>
export type StockItem = Tables<'stock_items'>
export type StockMovement = Tables<'stock_movements'>
export type ShoppingExtra = Tables<'shopping_list_extras'>
export type MaintenanceItem = Tables<'maintenance_items'>
export type MaintenanceLogEntry = Tables<'maintenance_log'>
export type AppSettings = Tables<'app_settings'>

/** Item de estoque com o nome de quem mexeu nele por último. */
export type StockItemComAutor = StockItem & {
  updated_by_profile: Pick<Profile, 'display_name'> | null
}

/** Registro do histórico de manutenção com o nome de quem fez. */
export type MaintenanceLogComAutor = MaintenanceLogEntry & {
  done_by_profile: Pick<Profile, 'display_name'> | null
}

/** Situação de um item de estoque, usada para colorir a listagem. */
export type StockStatus =
  | 'ok'
  | 'abaixo_do_minimo'
  | 'vence_em_breve'
  | 'vencido'

/** Situação de um item de manutenção: o semáforo da tela de manutenção. */
export type MaintenanceStatus = 'em_dia' | 'perto_do_vencimento' | 'atrasado'

/** Motivo registrado em cada movimentação de estoque. */
export type StockMovementReason = 'consumo' | 'reposicao' | 'compra' | 'ajuste'

/**
 * Uma linha pronta para virar movimentação de estoque.
 *
 * É o formato que a entrada rápida e a entrada por foto enviam para a função
 * `apply_stock_entries` no Postgres.
 */
export type StockEntry = {
  stock_item_id: string | null
  new_item?: {
    name: string
    category: string
    unit: string
    minimum_quantity: number
  }
  quantity_change: number
  price_at_time?: number | null
  reason?: StockMovementReason
}
