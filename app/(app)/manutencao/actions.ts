'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { hojeIso } from '@/lib/datas'
import { requireUser } from '@/lib/supabase/auth'

export type FormState = { error?: string }

function paraTexto(valor: FormDataEntryValue | null) {
  return String(valor ?? '').trim()
}

function revalidarTelasDeManutencao() {
  revalidatePath('/manutencao')
  revalidatePath('/')
}

function lerFormulario(formData: FormData) {
  const name = paraTexto(formData.get('name'))
  if (!name) return { error: 'O nome do item é obrigatório.' } as const

  const frequencia = Number(paraTexto(formData.get('frequency_days')))
  if (!Number.isInteger(frequencia) || frequencia <= 0) {
    return { error: 'A frequência precisa ser um número de dias maior que zero.' } as const
  }

  const ultimaVez = paraTexto(formData.get('last_done_date')) || hojeIso()

  return {
    valores: {
      name,
      category: paraTexto(formData.get('category')) || null,
      frequency_days: frequencia,
      last_done_date: ultimaVez,
      notes: paraTexto(formData.get('notes')) || null,
    },
  } as const
}

export async function criarManutencao(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser()

  const lido = lerFormulario(formData)
  if ('error' in lido) return lido

  const { error } = await supabase.from('maintenance_items').insert(lido.valores)

  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` }
  }

  revalidarTelasDeManutencao()
  redirect('/manutencao')
}

export async function atualizarManutencao(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser()

  const id = paraTexto(formData.get('id'))
  if (!id) return { error: 'Item não identificado.' }

  const lido = lerFormulario(formData)
  if ('error' in lido) return lido

  const { error } = await supabase
    .from('maintenance_items')
    .update(lido.valores)
    .eq('id', id)

  if (error) {
    return { error: `Não foi possível atualizar: ${error.message}` }
  }

  revalidarTelasDeManutencao()
  redirect('/manutencao')
}

export async function excluirManutencao(formData: FormData) {
  const { supabase } = await requireUser()

  const id = paraTexto(formData.get('id'))
  if (!id) return

  await supabase.from('maintenance_items').delete().eq('id', id)

  revalidarTelasDeManutencao()
  redirect('/manutencao')
}

/**
 * Marca a manutenção como feita hoje.
 *
 * Delega para a função `mark_maintenance_done` no Postgres, que grava no
 * histórico e atualiza `last_done_date` na mesma transação — os dois nunca
 * ficam discordando. `next_due_date` se recalcula sozinho, por ser gerada.
 */
export async function marcarComoFeito(
  itemId: string,
  observacao?: string,
): Promise<FormState> {
  const { supabase } = await requireUser()

  const { error } = await supabase.rpc('mark_maintenance_done', {
    p_item_id: itemId,
    p_done_date: hojeIso(),
    p_notes: observacao ?? null,
  })

  if (error) {
    return { error: `Não foi possível registrar: ${error.message}` }
  }

  revalidarTelasDeManutencao()
  revalidatePath(`/manutencao/${itemId}`)
  return {}
}
