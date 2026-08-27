import type { FotoEnviada, IdentificacaoIA, ReceitaIA } from '@/types/ia'

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

/** Pede sugestões de receita a partir dos alimentos em estoque. */
export async function sugerirReceitas(
  ingredientes: {
    nome: string
    quantidade: number
    unidade: string
    validade: string | null
  }[],
): Promise<ReceitaIA[]> {
  const { receitas } = await postJson<{ receitas: ReceitaIA[] }>(
    '/api/gemini-suggest-recipes',
    { ingredientes },
  )

  return receitas
}
