import { CATEGORIAS_ESTOQUE } from '@/lib/constants'
import { itemPorIndice } from '@/lib/ia/catalogo'
import { converterMedida, normalizarUnidade } from '@/lib/medidas'
import type { AlteracaoIA } from '@/types/ia'

/** Item do estoque como a rota o entrega para a IA. */
export type ItemCatalogo = {
  id: string
  name: string
  unit: string
  current_quantity: number
}

/**
 * Converte o que a IA entendeu para a unidade do item cadastrado.
 *
 * O índice é resolvido aqui, contra a lista real que foi enviada no prompt:
 * um índice inventado vira "não encontrado" em vez de apontar para o item
 * errado — mexer no item errado só aparece quando falta comida.
 */
export function sanitizarAlteracoes(bruto: unknown, catalogo: ItemCatalogo[]): AlteracaoIA[] {
  if (!Array.isArray(bruto)) return []

  const alteracoes: AlteracaoIA[] = []

  for (const linha of bruto) {
    if (typeof linha !== 'object' || linha === null) continue

    const registro = linha as Record<string, unknown>
    const quantidade = Number(registro.quantidade)
    if (!Number.isFinite(quantidade) || quantidade <= 0) continue

    // Qualquer coisa fora do contrato vira saída, o lado que não inventa
    // estoque que não existe. A revisão mostra o sinal e deixa inverter.
    const tipo = registro.tipo === 'entrada' ? 'entrada' : 'saida'

    const item = itemPorIndice(registro.indice_cadastro, catalogo)

    const falado = String(registro.nome_falado ?? '').trim()

    // Sem cadastro: a linha volta com o que é preciso para criar o item, que a
    // revisão ainda deixa ajustar. A categoria é conferida contra a lista do
    // app para a IA não inventar uma que a tela não sabe mostrar.
    if (!item) {
      const nome = String(registro.nome_cadastro ?? '').trim() || falado
      if (!nome) continue

      const categoria = String(registro.categoria_sugerida ?? '').trim().toLowerCase()

      alteracoes.push({
        tipo,
        stock_item_id: null,
        nome,
        categoria: CATEGORIAS_ESTOQUE.some((c) => c.valor === categoria)
          ? categoria
          : 'outros',
        quantidade,
        unidade: normalizarUnidade(String(registro.unidade ?? '')) ?? 'un',
        falado: null,
        convertido: true,
      })
      continue
    }

    const unidadeFalada = normalizarUnidade(String(registro.unidade ?? ''))
    const convertida = unidadeFalada
      ? converterMedida(quantidade, unidadeFalada, item.unit)
      : null

    alteracoes.push({
      tipo,
      stock_item_id: item.id,
      nome: item.name,
      categoria: '',
      // Sem conversão possível ("dois pacotes" de algo medido em kg), o número
      // passa como foi dito e a revisão sinaliza para conferir. Cair para 1
      // seria pior: a pessoa disse 2.
      quantidade: convertida ?? quantidade,
      unidade: item.unit,
      falado:
        unidadeFalada && unidadeFalada !== item.unit
          ? `${quantidade} ${unidadeFalada}`
          : null,
      convertido: convertida !== null,
    })
  }

  return alteracoes
}
