'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/auth'
import type { StockEntry } from '@/types/domain'

export type ResultadoEntradas = { error?: string; total?: number }

/**
 * Grava um lote de entradas de estoque de uma vez.
 *
 * Usada tanto pela adição rápida digitada quanto pela entrada em massa por
 * foto. A gravação inteira acontece dentro de `apply_stock_entries`, no
 * Postgres: se qualquer linha falhar, nenhuma entra — o usuário não fica com
 * meia compra registrada.
 */
export async function salvarEntradas(
  entradas: StockEntry[],
): Promise<ResultadoEntradas> {
  const { supabase } = await requireUser()

  if (entradas.length === 0) {
    return { error: 'Nenhuma linha preenchida para salvar.' }
  }

  // Validação no servidor: o cliente já filtra, mas Server Actions são um
  // endpoint público e não dá para confiar só na tela.
  for (const entrada of entradas) {
    if (!Number.isFinite(entrada.quantity_change) || entrada.quantity_change === 0) {
      return { error: 'Há linhas com quantidade inválida.' }
    }
    if (!entrada.stock_item_id && !entrada.new_item?.name?.trim()) {
      return { error: 'Há linhas sem item vinculado nem nome para criar.' }
    }
  }

  const { data, error } = await supabase.rpc('apply_stock_entries', {
    p_entries: entradas,
  })

  if (error) {
    return { error: `Não foi possível salvar as entradas: ${error.message}` }
  }

  revalidatePath('/estoque')
  revalidatePath('/compras')
  revalidatePath('/')

  return { total: data ?? entradas.length }
}
