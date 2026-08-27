/**
 * Parser defensivo do JSON devolvido por um modelo de linguagem.
 *
 * Fica separado de `lib/gemini.ts` porque aquele arquivo é `server-only` e
 * carrega o SDK inteiro; aqui é lógica pura, sem dependência nenhuma.
 */

export class RespostaInvalidaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RespostaInvalidaError'
  }
}

/**
 * Mesmo pedindo `responseMimeType: application/json` com schema, o modelo
 * ocasionalmente devolve o JSON embrulhado em cerca de markdown ou com prosa
 * antes e depois. Aqui a gente descasca isso antes do JSON.parse, em vez de
 * deixar o fluxo inteiro cair por causa de três crases.
 */
export function parseJsonDaIA<T>(bruto: string | undefined | null): T {
  if (!bruto || !bruto.trim()) {
    throw new RespostaInvalidaError('A IA devolveu uma resposta vazia.')
  }

  let texto = bruto.trim()

  // ```json ... ``` ou ``` ... ```
  const cerca = texto.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (cerca) {
    texto = cerca[1].trim()
  }

  try {
    return JSON.parse(texto) as T
  } catch {
    // Última tentativa: recortar do primeiro delimitador de array/objeto até o
    // último, descartando qualquer texto em volta.
    const inicio = texto.search(/[[{]/)
    const fim = Math.max(texto.lastIndexOf(']'), texto.lastIndexOf('}'))

    if (inicio !== -1 && fim > inicio) {
      try {
        return JSON.parse(texto.slice(inicio, fim + 1)) as T
      } catch {
        // cai no erro abaixo
      }
    }

    throw new RespostaInvalidaError(
      'A IA devolveu um formato que não deu para interpretar. Tente de novo.',
    )
  }
}
