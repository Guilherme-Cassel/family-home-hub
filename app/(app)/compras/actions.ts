'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/auth'

export type FormState = { error?: string }

function paraTexto(valor: FormDataEntryValue | null) {
  return String(valor ?? '').trim()
}

function paraNumero(valor: FormDataEntryValue | null): number | null {
  const texto = paraTexto(valor).replace(',', '.')
  if (!texto) return null

  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : null
}

/** Item avulso: uma compra pontual que não faz parte do estoque de rotina. */
export async function adicionarAvulso(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser()

  const name = paraTexto(formData.get('name'))
  if (!name) return { error: 'Escreva o que precisa comprar.' }

  const { error } = await supabase.from('shopping_list_extras').insert({
    name,
    quantity: paraNumero(formData.get('quantity')),
    unit: paraTexto(formData.get('unit')) || null,
  })

  if (error) {
    return { error: `Não foi possível adicionar: ${error.message}` }
  }

  revalidatePath('/compras')
  return {}
}

export async function alternarAvulso(
  id: string,
  concluido: boolean,
): Promise<FormState> {
  const { supabase } = await requireUser()

  const { error } = await supabase
    .from('shopping_list_extras')
    .update({ is_done: concluido })
    .eq('id', id)

  if (error) {
    return { error: `Não foi possível atualizar o item: ${error.message}` }
  }

  revalidatePath('/compras')
  return {}
}

export async function removerAvulso(id: string): Promise<FormState> {
  const { supabase } = await requireUser()

  const { error } = await supabase
    .from('shopping_list_extras')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `Não foi possível remover o item: ${error.message}` }
  }

  revalidatePath('/compras')
  return {}
}

/**
 * Limpa os avulsos já marcados, tipicamente ao voltar do mercado.
 *
 * Os itens de estoque não são tocados aqui: eles saem da lista sozinhos
 * quando as quantidades forem repostas pela entrada em massa.
 */
export async function limparAvulsosConcluidos(): Promise<FormState> {
  const { supabase } = await requireUser()

  const { error } = await supabase
    .from('shopping_list_extras')
    .delete()
    .eq('is_done', true)

  if (error) {
    return { error: `Não foi possível limpar a lista: ${error.message}` }
  }

  revalidatePath('/compras')
  return {}
}
