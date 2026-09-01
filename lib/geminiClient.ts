import type { AlteracaoIA, FotoEnviada, IdentificacaoIA, ReceitaIA } from '@/types/ia'

/**
 * Chamadas às rotas de IA a partir do navegador.
 *
 * O front nunca fala com o Gemini direto: a chave só existe no servidor. Estas
 * funções conversam com as rotas em /api, que fazem a ponte.
 */

async function postJson<T>(url: string, corpo: unknown): Promise<T> {
  let resposta: Response

  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
  } catch {
    throw new Error(
      'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.',
    )
  }

  let dados: unknown
  try {
    dados = await resposta.json()
  } catch {
    throw new Error('O servidor devolveu uma resposta inesperada.')
  }

  if (!resposta.ok) {
    const mensagem =
      typeof dados === 'object' && dados !== null && 'error' in dados
        ? String((dados as { error: unknown }).error)
        : 'Algo deu errado ao falar com a IA.'
    throw new Error(mensagem)
  }

  return dados as T
}

/** Identifica um lote de fotos numa única requisição. */
export async function identificarFotos(
  fotos: FotoEnviada[],
): Promise<IdentificacaoIA[]> {
  const { resultados } = await postJson<{ resultados: IdentificacaoIA[] }>(
    '/api/gemini-identify-photos',
    { fotos },
  )

  return resultados
}

/**
 * Interpreta uma frase de alteração do estoque, para os dois lados: "usei um
 * ovo e comprei dois litros de leite" vira uma saída e uma entrada.
 *
 * Não recebe o estoque: a rota lê no servidor, com a mesma sessão, e resolve
 * ali o item de cada trecho da frase.
 */
export async function interpretarAlteracao(texto: string): Promise<AlteracaoIA[]> {
  const { alteracoes } = await postJson<{ alteracoes: AlteracaoIA[] }>(
    '/api/gemini-alteracao',
    { texto },
  )

  return alteracoes
}

/**
 * Pede sugestões de receita a partir dos alimentos em estoque.
 *
 * Não recebe os ingredientes: a rota lê o estoque no servidor, com a mesma
 * sessão. É a mesma informação, com menos dados trafegando e sem depender do
 * que o cliente resolveu mandar.
 */
export async function sugerirReceitas(): Promise<{
  receitas: ReceitaIA[]
  aviso?: string
}> {
  return postJson<{ receitas: ReceitaIA[]; aviso?: string }>(
    '/api/gemini-suggest-recipes',
    {},
  )
}
