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

export type IngredienteFaltante = {
  nome: string
  quantidade: number
  unidade: string
}

/**
 * Joga na lista de compras os ingredientes que faltam para uma receita.
 *
 * Três situações, e cada uma pede um tratamento diferente:
 *
 * 1. O ingrediente já está na lista pedindo MENOS do que a receita precisa —
 *    a quantidade sobe. Comprar 200 g de manteiga não adianta se a receita
 *    leva 400 g.
 * 2. Já está na lista com quantidade suficiente, ou já consta no estoque
 *    abaixo do mínimo — não faz nada. Sem isso, o mesmo item aparecia duas
 *    vezes, em seções diferentes.
 * 3. Não está em lugar nenhum — entra como avulso, com quantidade e unidade.
 */
export async function adicionarFaltantes(
  ingredientes: IngredienteFaltante[],
): Promise<FormState> {
  const { supabase } = await requireUser()

  const limpos = ingredientes
    .map((i) => ({ ...i, nome: i.nome?.trim() ?? '' }))
    .filter((i) => i.nome)

  if (limpos.length === 0) return { error: 'Nenhum ingrediente para adicionar.' }

  const [{ data: existentes, error: erroLeitura }, { data: doEstoque }] =
    await Promise.all([
      supabase
        .from('shopping_list_extras')
        .select('id, name, quantity')
        .eq('is_done', false),
      supabase.from('stock_items').select('id, name').eq('is_below_minimum', true),
    ])

  if (erroLeitura) {
    return { error: `Não foi possível ler a lista: ${erroLeitura.message}` }
  }

  const porNome = new Map(
    (existentes ?? []).map((item) => [normalizar(item.name), item]),
  )

  const novos: IngredienteFaltante[] = []
  const aumentar: { id: string; quantity: number }[] = []

  for (const ingrediente of limpos) {
    const jaAvulso = porNome.get(normalizar(ingrediente.nome))

    if (jaAvulso) {
      if (ingrediente.quantidade > (jaAvulso.quantity ?? 0)) {
        aumentar.push({ id: jaAvulso.id, quantity: ingrediente.quantidade })
      }
      continue
    }

    // Mesma tolerância do casamento por foto: "Manteiga" não deveria virar
    // avulso se o estoque já pede "Manteiga sem sal".
    const correspondencia = melhorCorrespondencia(ingrediente.nome, doEstoque ?? [])
    if (
      correspondencia !== null &&
      correspondencia.pontuacao >= LIMIAR_MATCH_AUTOMATICO
    ) {
      continue
    }

    novos.push(ingrediente)
  }

  if (novos.length > 0) {
    const { error } = await supabase.from('shopping_list_extras').insert(
      novos.map((i) => ({
        name: i.nome,
        quantity: i.quantidade > 0 ? i.quantidade : null,
        unit: i.unidade || null,
      })),
    )

    if (error) {
      return { error: `Não foi possível adicionar à lista: ${error.message}` }
    }
  }

  for (const ajuste of aumentar) {
    const { error } = await supabase
      .from('shopping_list_extras')
      .update({ quantity: ajuste.quantity })
      .eq('id', ajuste.id)

    if (error) {
      return { error: `Não foi possível ajustar a quantidade: ${error.message}` }
    }
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
