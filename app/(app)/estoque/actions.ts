'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { agruparEntradas } from '@/lib/entradas'
import { requireUser } from '@/lib/supabase/auth'
import type { StockEntry, StockMovementReason } from '@/types/domain'

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

/** Uma linha da alteração rápida, já revisada na tela. */
export type AlteracaoRevisada = {
  /** null quando é produto que ainda não existe no cadastro. */
  stock_item_id: string | null
  /** Dados para criar o item, quando não há `stock_item_id`. */
  novo_item?: { name: string; category: string; unit: string }
  quantidade: number
  tipo: 'entrada' | 'saida'
}

/**
 * Aplica várias alterações de uma vez, vindas da alteração rápida.
 *
 * Passa pelo mesmo `apply_stock_entries` da entrada por foto: se uma linha
 * falhar, nenhuma entra — não dá para registrar metade da compra nem metade do
 * jantar. Linhas repetidas do mesmo item e do mesmo lado são somadas antes,
 * porque "usei um ovo e depois mais um ovo" é uma baixa de dois.
 *
 * Saída vira movimentação de consumo; entrada vira compra, que é de onde vem
 * quase toda reposição ditada — voltando do mercado.
 *
 * Entrada de produto que ainda não existe cria o cadastro na hora, dentro da
 * mesma transação. Saída não: dar baixa em algo que a casa nunca teve seria
 * criar um item para deixá-lo em zero.
 */
export async function salvarAlteracoes(
  alteracoes: AlteracaoRevisada[],
): Promise<FormState & { total?: number }> {
  const { supabase } = await requireUser()

  if (alteracoes.length === 0) {
    return { error: 'Nenhuma alteração para gravar.' }
  }

  // Server Action é endpoint público: a tela já filtra, mas não dá para
  // confiar só nela.
  for (const alteracao of alteracoes) {
    if (!Number.isFinite(alteracao.quantidade) || alteracao.quantidade <= 0) {
      return { error: 'Há linhas com quantidade inválida.' }
    }
    if (!alteracao.stock_item_id) {
      if (!alteracao.novo_item?.name?.trim()) {
        return { error: 'Há linhas sem item vinculado nem nome para criar.' }
      }
      if (alteracao.tipo !== 'entrada') {
        return { error: 'Só dá para dar baixa em item que já existe no estoque.' }
      }
    }
  }

  const entradas: StockEntry[] = alteracoes.map((alteracao) => ({
    stock_item_id: alteracao.stock_item_id,
    new_item: alteracao.stock_item_id
      ? undefined
      : {
          name: alteracao.novo_item?.name.trim() ?? '',
          category: alteracao.novo_item?.category || 'outros',
          unit: alteracao.novo_item?.unit || 'un',
          minimum_quantity: 0,
        },
    quantity_change:
      alteracao.tipo === 'entrada' ? alteracao.quantidade : -alteracao.quantidade,
    reason: alteracao.tipo === 'entrada' ? ('compra' as const) : ('consumo' as const),
  }))

  const { data, error } = await supabase.rpc('apply_stock_entries', {
    p_entries: agruparEntradas(entradas),
  })

  if (error) {
    return { error: `Não foi possível gravar as alterações: ${error.message}` }
  }

  revalidarTelasDeEstoque()
  return { total: data ?? alteracoes.length }
}
