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
}

/** Uma receita sugerida a partir do estoque atual. */
export type ReceitaIA = {
  nome_receita: string
  tempo_preparo_minutos: number
  porcoes: number
  ingredientes_disponiveis: string[]
  ingredientes_faltando: string[]
  modo_preparo: string[]
}
