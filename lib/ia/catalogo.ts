/**
 * A ponte entre o índice que a IA devolve e o item de verdade.
 *
 * As três rotas de IA mandam o cadastro numerado no prompt (`[0] Arroz`) e
 * recebem de volta o número. Resolver esse número contra a lista real é a
 * regra mais delicada do app: errar aqui credita a compra — ou a baixa — no
 * item errado, e isso não aparece na hora. Por isso ela mora num lugar só.
 *
 * A checagem é estrita de propósito. `Number(null)`, `Number('')` e
 * `Number(false)` valem 0 em JavaScript, e 0 é um índice válido: um campo
 * ausente ou nulo na resposta do modelo vinculava silenciosamente ao primeiro
 * item da lista. Aqui, só número inteiro de verdade vira vínculo.
 */
export function itemPorIndice<T>(indice: unknown, catalogo: readonly T[]): T | null {
  if (typeof indice !== 'number' || !Number.isInteger(indice)) return null
  if (indice < 0 || indice >= catalogo.length) return null

  return catalogo[indice]
}
