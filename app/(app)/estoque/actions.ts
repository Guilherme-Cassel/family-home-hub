'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/supabase/auth'
import type { StockMovementReason } from '@/types/domain'

export type FormState = { error?: string }

/** Converte campo de formulário em número, tratando vírgula decimal. */
function paraNumero(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? '')
    .trim()
    .replace(',', '.')
  if (!texto) return null

  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : null
}

function paraTexto(valor: FormDataEntryValue | null): string {
  return String(valor ?? '').trim()
}

function revalidarTelasDeEstoque() {
  revalidatePath('/estoque')
  revalidatePath('/compras')
  revalidatePath('/')
}

function lerFormularioDeItem(formData: FormData) {
  const name = paraTexto(formData.get('name'))
  if (!name) return { error: 'O nome do item é obrigatório.' } as const

  const current = paraNumero(formData.get('current_quantity')) ?? 0
  const minimum = paraNumero(formData.get('minimum_quantity')) ?? 0

  if (current < 0 || minimum < 0) {
    return { error: 'As quantidades não podem ser negativas.' } as const
  }

  return {
    valores: {
      name,
      category: paraTexto(formData.get('category')) || 'outros',
      unit: paraTexto(formData.get('unit')) || 'un',
      current_quantity: current,
      minimum_quantity: minimum,
      expiration_date: paraTexto(formData.get('expiration_date')) || null,
      last_price: paraNumero(formData.get('last_price')),
      notes: paraTexto(formData.get('notes')) || null,
    },
  } as const
}

export async function criarItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser()

  const lido = lerFormularioDeItem(formData)
  if ('error' in lido) return lido

  const { error } = await supabase.from('stock_items').insert(lido.valores)

  if (error) {
    return { error: `Não foi possível salvar o item: ${error.message}` }
  }

  revalidarTelasDeEstoque()
  redirect('/estoque')
}

export async function atualizarItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser()

  const id = paraTexto(formData.get('id'))
  if (!id) return { error: 'Item não identificado.' }

  const lido = lerFormularioDeItem(formData)
  if ('error' in lido) return lido

  const { error } = await supabase
    .from('stock_items')
    .update(lido.valores)
    .eq('id', id)

  if (error) {
    return { error: `Não foi possível atualizar o item: ${error.message}` }
  }

  revalidarTelasDeEstoque()
  redirect('/estoque')
}

export async function excluirItem(formData: FormData) {
  const { supabase } = await requireUser()

  const id = paraTexto(formData.get('id'))
  if (!id) return

  await supabase.from('stock_items').delete().eq('id', id)

  revalidarTelasDeEstoque()
  redirect('/estoque')
}

/**
 * Consumir ou repor direto na listagem.
 *
 * Grava uma movimentação; o trigger no Postgres é quem ajusta o saldo, então
 * histórico e quantidade nunca divergem.
 */
export async function ajustarQuantidade(
  itemId: string,
  delta: number,
): Promise<FormState> {
  const { supabase } = await requireUser()

  if (!Number.isFinite(delta) || delta === 0) {
    return { error: 'Ajuste inválido.' }
  }

  const reason: StockMovementReason = delta > 0 ? 'reposicao' : 'consumo'

  const { error } = await supabase.from('stock_movements').insert({
    stock_item_id: itemId,
    quantity_change: delta,
    reason,
  })

  if (error) {
    return { error: `Não foi possível registrar o ajuste: ${error.message}` }
  }

  revalidarTelasDeEstoque()
  return {}
}
