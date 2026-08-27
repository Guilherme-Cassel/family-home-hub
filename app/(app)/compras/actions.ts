'use server'

import { revalidatePath } from 'next/cache'
import { LIMIAR_MATCH_AUTOMATICO, melhorCorrespondencia } from '@/lib/fuzzyMatch'
import { requireUser } from '@/lib/supabase/auth'
import { normalizar } from '@/lib/texto'

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

/**
 * Joga na lista de compras os ingredientes que faltam para uma receita.
 *
 * Ignora o que já está na lista em aberto, para não duplicar quando o usuário
 * pede duas receitas que precisam do mesmo item.
 */
export async function adicionarFaltantes(nomes: string[]): Promise<FormState> {
  const { supabase } = await requireUser()

  const limpos = [...new Set(nomes.map((nome) => nome.trim()).filter(Boolean))]
  if (limpos.length === 0) return { error: 'Nenhum ingrediente para adicionar.' }

  const { data: existentes, error: erroLeitura } = await supabase
    .from('shopping_list_extras')
    .select('name')
    .eq('is_done', false)

  if (erroLeitura) {
    return { error: `Não foi possível ler a lista: ${erroLeitura.message}` }
  }

  // A lista de compras tem duas origens, e o ingrediente pode já estar em
  // qualquer uma delas. Conferir só os avulsos deixava o mesmo item aparecer
  // duas vezes, em seções diferentes: o caso comum é um item de estoque
  // zerado, que a IA nunca vê (ela só recebe quantidade acima de zero) e
  // portanto reporta como faltando, mas que já está listado por estar abaixo
  // do mínimo.
  const { data: doEstoque } = await supabase
    .from('stock_items')
    .select('id, name')
    .eq('is_below_minimum', true)

  const jaNaLista = new Set(
    (existentes ?? []).map((item) => normalizar(item.name)),
  )

  const novos = limpos.filter((nome) => {
    if (jaNaLista.has(normalizar(nome))) return false

    // Mesma tolerância do casamento por foto: "Manteiga" não deveria virar
    // avulso se o estoque já pede "Manteiga sem sal".
    const correspondencia = melhorCorrespondencia(nome, doEstoque ?? [])
    return (
      correspondencia === null ||
      correspondencia.pontuacao < LIMIAR_MATCH_AUTOMATICO
    )
  })

  if (novos.length === 0) return {}

  const { error } = await supabase
    .from('shopping_list_extras')
    .insert(novos.map((name) => ({ name })))

  if (error) {
    return { error: `Não foi possível adicionar à lista: ${error.message}` }
  }

  revalidatePath('/compras')
  revalidatePath('/')
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
