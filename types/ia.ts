/**
 * Contrato entre o navegador e as rotas de IA.
 *
 * Vive fora de `lib/gemini.ts` de propósito: aquele arquivo é `server-only`, e
 * componentes de cliente precisam destes tipos.
 */

/** Imagem pronta para enviar: já comprimida, em base64 e sem prefixo `data:`. */
export type FotoEnviada = {
  mimeType: string
  data: string
}

export type NivelConfianca = 'alta' | 'media' | 'baixa'

/** O que a IA devolve para cada foto do lote. */
export type IdentificacaoIA = {
  indice: number
  nome_identificado: string
  categoria_sugerida: string
  confianca: NivelConfianca
  /**
   * Item do cadastro que a IA reconheceu como sendo o mesmo produto, ou null.
   *
   * A comparação por texto não resolve "Leite integral" contra "Caixinha de
   * Leite 1L" — são o mesmo produto com nomes distantes. Mandar o cadastro
   * junto com as fotos deixa o modelo usar o que ele sabe do mundo em vez de
   * a gente tentar adivinhar por similaridade de string.
   *
   * O índice devolvido pela IA é convertido para este id no servidor, contra
   * a lista real, então um índice inventado nunca vira vínculo.
   */
  stock_item_id: string | null
}

/**
 * Um ingrediente de receita, com quantidade.
 *
 * Para os que já estão na despensa, a quantidade vem **na mesma unidade em
 * que o item está cadastrado** — a IA recebe a unidade junto com o nome e
 * responde nela. Isso elimina a conversão de "400 g" para um estoque medido
 * em kg, que seria fonte garantida de erro na hora de dar baixa.
 */
export type IngredienteIA = {
  nome: string
  quantidade: number
  unidade: string
  /** Item do cadastro correspondente, ou null quando é preciso comprar. */
  stock_item_id: string | null
}

/** Uma receita sugerida a partir do estoque atual. */
export type ReceitaIA = {
  nome_receita: string
  tempo_preparo_minutos: number
  porcoes: number
  ingredientes_disponiveis: IngredienteIA[]
  ingredientes_faltando: IngredienteIA[]
  modo_preparo: string[]
}
