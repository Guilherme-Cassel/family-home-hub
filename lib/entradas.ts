import { normalizar } from '@/lib/texto'
import type { StockEntry } from '@/types/domain'

/**
 * Junta linhas que apontam para o mesmo produto numa entrada só, somando as
 * quantidades.
 *
 * Fotografar cinco pacotes iguais gera cinco linhas na revisão, cada uma com
 * 1 un. Sem agrupar, cada linha vira uma movimentação — e, quando o item ainda
 * não existe, cada uma criava um cadastro novo com o mesmo nome. Agrupando
 * aqui, o histórico mostra "+5" uma vez só, do jeito que a compra aconteceu.
 *
 * Itens novos casam por nome normalizado (sem acento nem caixa), ignorando
 * categoria e unidade: se o nome é o mesmo, é o mesmo produto, e vale o que
 * veio na primeira linha. Linhas com preço ficam de fora do agrupamento —
 * somar quantidade mantendo o preço de uma delas distorceria o histórico.
 */
export function agruparEntradas(entradas: StockEntry[]): StockEntry[] {
  const agrupadas: StockEntry[] = []
  const porChave = new Map<string, StockEntry>()

  for (const entrada of entradas) {
    const nomeNovo = entrada.stock_item_id
      ? null
      : normalizar(entrada.new_item?.name ?? '')

    const agrupavel =
      (entrada.price_at_time === null || entrada.price_at_time === undefined) &&
      (entrada.stock_item_id !== null || nomeNovo !== '')

    if (!agrupavel) {
      agrupadas.push(entrada)
      continue
    }

    const chave = [
      entrada.stock_item_id ?? `novo:${nomeNovo}`,
      entrada.reason ?? 'compra',
    ].join('|')

    const existente = porChave.get(chave)

    if (existente) {
      existente.quantity_change += entrada.quantity_change
    } else {
      const copia = { ...entrada }
      porChave.set(chave, copia)
      agrupadas.push(copia)
    }
  }

  return agrupadas
}
