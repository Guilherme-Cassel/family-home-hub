/**
 * Conversão entre as unidades de medida do estoque.
 *
 * A foto mostra o que está escrito na embalagem ("1 L"), mas o item pode estar
 * cadastrado em outra escala ("ml"). Sem converter, uma caixinha de leite
 * entrava como 1 ml num estoque de 3000 ml.
 *
 * A conversão é feita aqui, com tabela, e não pedida à IA: fator de mil não é
 * lugar para palpite de modelo de linguagem.
 */

type Grandeza = 'massa' | 'volume'

/** Quanto vale uma unidade dela na unidade base da grandeza (g e ml). */
const ESCALA: Record<string, { grandeza: Grandeza; fator: number }> = {
  g: { grandeza: 'massa', fator: 1 },
  kg: { grandeza: 'massa', fator: 1000 },
  ml: { grandeza: 'volume', fator: 1 },
  l: { grandeza: 'volume', fator: 1000 },
}

/**
 * Apelidos que aparecem em rótulo e que a IA pode devolver.
 *
 * `un`, `pct` e `cx` não entram na tabela de escala de propósito: um pacote
 * não tem relação fixa com grama nenhuma, então converter para eles nunca dá
 * certo — e é isso que se quer, em vez de um número inventado.
 */
const APELIDOS: Record<string, string> = {
  l: 'L',
  lt: 'L',
  litro: 'L',
  litros: 'L',
  ml: 'ml',
  mls: 'ml',
  g: 'g',
  gr: 'g',
  grama: 'g',
  gramas: 'g',
  kg: 'kg',
  quilo: 'kg',
  quilos: 'kg',
  un: 'un',
  und: 'un',
  unid: 'un',
  unidade: 'un',
  unidades: 'un',
  pct: 'pct',
  pacote: 'pct',
  cx: 'cx',
  caixa: 'cx',
}

/** Devolve a unidade no formato usado pelo app, ou null se não reconhecer. */
export function normalizarUnidade(unidade: string): string | null {
  return APELIDOS[unidade.trim().toLowerCase()] ?? null
}

/**
 * Converte entre unidades da mesma grandeza.
 *
 * Devolve null quando a conversão não existe (de "L" para "un", por exemplo).
 * Quem chama decide o que fazer — aqui, cair para 1 e deixar a revisão
 * resolver é melhor do que somar um número sem sentido ao estoque.
 */
export function converterMedida(
  quantidade: number,
  de: string,
  para: string,
): number | null {
  if (!Number.isFinite(quantidade)) return null

  const origem = normalizarUnidade(de)
  const destino = normalizarUnidade(para)
  if (!origem || !destino) return null
  if (origem === destino) return quantidade

  const escalaOrigem = ESCALA[origem.toLowerCase()]
  const escalaDestino = ESCALA[destino.toLowerCase()]
  if (!escalaOrigem || !escalaDestino) return null
  if (escalaOrigem.grandeza !== escalaDestino.grandeza) return null

  // 3 casas é o que a coluna numeric(12,3) do banco guarda; arredondar aqui
  // evita mandar 0.3333333333 e receber outro número de volta.
  const convertida = (quantidade * escalaOrigem.fator) / escalaDestino.fator
  return Math.round(convertida * 1000) / 1000
}
