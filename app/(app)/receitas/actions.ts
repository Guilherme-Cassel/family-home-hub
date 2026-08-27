'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/supabase/auth'
import type { ReceitaIA } from '@/types/ia'

export type FormState = { error?: string }

function revalidar(id?: string) {
  revalidatePath('/receitas')
  revalidatePath('/estoque')
  revalidatePath('/')
  if (id) revalidatePath(`/receitas/${id}`)
}

/**
 * Copia a receita sugerida para o banco e abre o passo a passo.
 *
 * A sugestão da IA não existe em lugar nenhum além da tela; se ela não fosse
 * materializada aqui, fechar a aba no meio do preparo perderia a receita.
 */
export async function iniciarReceita(receita: ReceitaIA): Promise<FormState> {
  const { supabase } = await requireUser()

  const nome = receita.nome_receita?.trim()
  if (!nome) return { error: 'Receita sem nome.' }

  const ingredientes = [
    ...(receita.ingredientes_disponiveis ?? []),
    ...(receita.ingredientes_faltando ?? []),
  ].map((ingrediente) => ({
    stock_item_id: ingrediente.stock_item_id,
    nome: ingrediente.nome,
    quantidade: ingrediente.quantidade,
    unidade: ingrediente.unidade,
  }))

  const { data, error } = await supabase
    .from('recipe_sessions')
    .insert({
      name: nome,
      prep_minutes: receita.tempo_preparo_minutos || null,
      servings: receita.porcoes || null,
      steps: receita.modo_preparo ?? [],
      ingredients: ingredientes,
    })
    .select('id')
    .single()

  if (error) {
    return { error: `Não foi possível iniciar a receita: ${error.message}` }
  }

  revalidar()
  redirect(`/receitas/${data.id}`)
}

/** Marca ou desmarca um passo. */
export async function alternarPasso(
  sessaoId: string,
  indice: number,
  concluido: boolean,
): Promise<FormState> {
  const { supabase } = await requireUser()

  const { data: sessao, error: erroLeitura } = await supabase
    .from('recipe_sessions')
    .select('done_steps')
    .eq('id', sessaoId)
    .maybeSingle()

  if (erroLeitura || !sessao) {
    return { error: 'Esta receita não está mais em andamento.' }
  }

  // Reler e reescrever o array inteiro mantém duas pessoas cozinhando juntas
  // em estados coerentes: quem salvar por último não apaga o passo do outro,
  // porque a leitura acontece a cada toque.
  const passos = new Set(sessao.done_steps ?? [])
  if (concluido) passos.add(indice)
  else passos.delete(indice)

  const { error } = await supabase
    .from('recipe_sessions')
    .update({ done_steps: [...passos].sort((a, b) => a - b) })
    .eq('id', sessaoId)

  if (error) {
    return { error: `Não foi possível salvar o passo: ${error.message}` }
  }

  revalidar(sessaoId)
  return {}
}

export type Consumo = { stock_item_id: string | null; quantidade: number }

/**
 * Conclui a receita: dá baixa no estoque e encerra a sessão.
 *
 * Os consumos vêm da tela de confirmação, não do que foi salvo ao iniciar:
 * quem cozinha ajusta quantidade no meio do caminho, e o que precisa sair da
 * despensa é o que realmente foi usado.
 */
export async function concluirReceita(
  sessaoId: string,
  consumos: Consumo[],
): Promise<FormState> {
  const { supabase } = await requireUser()

  for (const consumo of consumos) {
    if (!Number.isFinite(consumo.quantidade) || consumo.quantidade < 0) {
      return { error: 'Há quantidades inválidas na conferência.' }
    }
  }

  const { error } = await supabase.rpc('finish_recipe_session', {
    p_session_id: sessaoId,
    p_consumos: consumos.filter((c) => c.stock_item_id && c.quantidade > 0),
  })

  if (error) {
    return { error: `Não foi possível concluir a receita: ${error.message}` }
  }

  revalidar(sessaoId)
  redirect('/receitas')
}

/** Desiste da receita sem mexer no estoque. */
export async function descartarReceita(formData: FormData): Promise<void> {
  const { supabase } = await requireUser()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('recipe_sessions').delete().eq('id', id)

  revalidar()
  redirect('/receitas')
}
