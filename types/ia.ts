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
  /**
   * O conteúdo declarado na embalagem, como está escrito nela: `{ quantidade:
   * 1, unidade: 'L' }` para uma caixinha de leite de 1 litro.
   *
   * Vem cru, na unidade do rótulo, e é convertido para a unidade do item
   * cadastrado no cliente — a tabela de conversão fica em `lib/medidas.ts`,
   * fora do alcance de palpite do modelo. Null quando o rótulo não está
   * legível na foto.
   */
  embalagem: { quantidade: number; unidade: string } | null
}

/**
 * Um item que a frase da alteração rápida mencionou.
 *
 * A quantidade já vem **na unidade em que o item está cadastrado**: a frase
 * fala "meio litro" e o leite está em ml, então chega 500. A conversão é feita
 * no servidor, com a tabela de `lib/medidas.ts`.
 */
export type AlteracaoIA = {
  /**
   * Para que lado o estoque anda: `saida` quando a frase fala de gastar
   * ("usei", "comi", "acabou"), `entrada` quando fala de repor ("comprei",
   * "trouxe do mercado").
   *
   * A revisão mostra o sinal e deixa inverter num toque — é lá que um "peguei"
   * ambíguo se resolve, não aqui.
   */
  tipo: 'entrada' | 'saida'
  /** Item do cadastro, ou null quando a frase citou algo que não existe lá. */
  stock_item_id: string | null
  /** Nome do item cadastrado, ou o que a pessoa falou quando não achou. */
  nome: string
  /**
   * Categoria sugerida, usada só quando não há cadastro: uma entrada de item
   * novo precisa dela para nascer. Para item já cadastrado, vem vazia.
   */
  categoria: string
  quantidade: number
  unidade: string
  /**
   * Como a medida foi dita, quando difere da unidade do cadastro: "0.5 L" para
   * um item em ml. Serve para a revisão mostrar de onde veio o número.
   */
  falado: string | null
  /**
   * false quando não deu para converter a medida falada para a unidade do item
   * (falar "dois pacotes" de algo cadastrado em kg). O número passa adiante
   * como foi dito, e a revisão pede conferência.
   */
  convertido: boolean
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
