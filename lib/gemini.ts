import 'server-only'

import { GoogleGenAI } from '@google/genai'

import { RespostaInvalidaError, parseJsonDaIA } from './jsonIA'

/**
 * Camada fina sobre o SDK do Gemini.
 *
 * Tudo aqui roda exclusivamente no servidor: `server-only` faz o build quebrar
 * se algum componente de cliente importar este arquivo por engano, o que
 * vazaria a chave da API para o navegador.
 */

/**
 * Modelo padrão: o Flash-Lite.
 *
 * Medido com 6 fotos de 1024x768, o mesmo payload que o app manda de verdade:
 * flash-lite respondeu em 5s, o flash em 34s (e chegou a 112s numa chamada).
 * Para reconhecer embalagem de supermercado a diferença de qualidade não
 * aparece, mas a de latência decide se a função da Vercel termina ou morre no
 * meio.
 */
const MODELO_PADRAO = 'gemini-3.5-flash-lite'

/**
 * Modelos tentados em sequência quando o principal responde 503.
 *
 * O 503 do Gemini é falta de capacidade por modelo, do lado do Google, e
 * atinge um tier enquanto os outros seguem normais — foi exatamente o que a
 * medição pegou: o 3.7 fora do ar no mesmo minuto em que o 3.6 e o lite
 * respondiam. Cair para outro modelo resolve o que nenhuma quantidade de
 * retry no mesmo modelo resolveria.
 */
const FALLBACKS_PADRAO = ['gemini-3.6-flash', 'gemini-3.5-flash']

/** Quantas fotos vão em uma única requisição. Ver README sobre a cota. */
export const TAMANHO_LOTE_PADRAO = 6

export function getModelo() {
  return process.env.GEMINI_MODEL?.trim() || MODELO_PADRAO
}

/** Cadeia completa de tentativas, sem repetir o principal. */
export function getModelos(): string[] {
  const principal = getModelo()

  const configurados = process.env.GEMINI_MODEL_FALLBACK?.split(',')
    .map((m) => m.trim())
    .filter(Boolean)

  const fallbacks = configurados?.length ? configurados : FALLBACKS_PADRAO

  return [principal, ...fallbacks.filter((m) => m !== principal)]
}

export function getTamanhoLote() {
  const bruto = Number(process.env.GEMINI_BATCH_SIZE)
  if (!Number.isInteger(bruto) || bruto < 1 || bruto > 16) {
    return TAMANHO_LOTE_PADRAO
  }
  return bruto
}

/** Erro com mensagem já pronta para mostrar ao usuário, em português. */
export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'GeminiError'
  }
}

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim()

  if (!apiKey) {
    throw new GeminiError(
      'A chave do Gemini não está configurada. Preencha GEMINI_API_KEY no ' +
        '.env.local (ou nas variáveis de ambiente da Vercel).',
      503,
    )
  }

  return new GoogleGenAI({ apiKey })
}

/**
 * Traduz falhas do SDK em mensagens acionáveis.
 *
 * O 429 tem tratamento próprio de propósito: a cota diária gratuita do Flash
 * é pequena, então estourar o limite é um caminho esperado do fluxo, não um
 * erro genérico de rede.
 */
export function traduzirErroGemini(erro: unknown): GeminiError {
  if (erro instanceof GeminiError) return erro
  if (erro instanceof RespostaInvalidaError) return new GeminiError(erro.message, 502)

  const mensagem = erro instanceof Error ? erro.message : String(erro)
  const texto = mensagem.toLowerCase()

  if (texto.includes('429') || texto.includes('resource_exhausted') || texto.includes('quota')) {
    return new GeminiError(
      'A cota diária gratuita da IA acabou. Ela se renova à meia-noite no ' +
        'horário do Pacífico — até lá, dá para registrar os itens digitando.',
      429,
    )
  }

  // Sobrecarga do modelo, não erro de configuração: acontece de verdade e
  // costuma passar sozinho em pouco tempo.
  if (texto.includes('503') || texto.includes('unavailable') || texto.includes('overloaded')) {
    return new GeminiError(
      'A IA está sobrecarregada agora. Isso costuma durar pouco — espere alguns ' +
        'segundos e toque de novo. Suas fotos continuam aqui.',
      503,
    )
  }

  if (texto.includes('api key') || texto.includes('401') || texto.includes('403')) {
    return new GeminiError(
      'A chave do Gemini foi recusada. Confira o valor de GEMINI_API_KEY.',
      401,
    )
  }

  if (texto.includes('404') || texto.includes('not found')) {
    return new GeminiError(
      `O modelo "${getModelo()}" não está disponível para esta chave. ` +
        'Ajuste GEMINI_MODEL para um modelo Flash que a sua conta acesse.',
      404,
    )
  }

  return new GeminiError(`A IA não respondeu como esperado: ${mensagem}`, 502)
}

function ehIndisponibilidade(erro: unknown): boolean {
  const texto = (erro instanceof Error ? erro.message : String(erro)).toLowerCase()
  return (
    texto.includes('503') ||
    texto.includes('unavailable') ||
    texto.includes('overloaded') ||
    texto.includes('500') ||
    texto.includes('internal')
  )
}

type ParametrosGeracao = Omit<
  Parameters<ReturnType<typeof getGeminiClient>['models']['generateContent']>[0],
  'model'
>

/**
 * Gera conteúdo tentando cada modelo da cadeia até um responder.
 *
 * Só troca de modelo em falha de disponibilidade (503/500). Erro de cota, de
 * chave ou de payload não melhora com outro modelo, então esses sobem na hora
 * — insistir só gastaria o tempo da função e, no caso da cota, requisições
 * que o usuário não tem.
 *
 * O orçamento de tempo existe porque a função da Vercel tem prazo: melhor
 * devolver um erro honesto do que ser morta no meio e o cliente receber uma
 * resposta que nem é JSON.
 */
export async function gerarComResiliencia(
  parametros: ParametrosGeracao,
  orcamentoMs = 45_000,
) {
  const ai = getGeminiClient()
  const modelos = getModelos()
  const limite = Date.now() + orcamentoMs

  for (const [indice, model] of modelos.entries()) {
    if (indice > 0 && Date.now() > limite) break

    try {
      const response = await ai.models.generateContent({ ...parametros, model })
      return { response, modelo: model }
    } catch (erro) {
      if (!ehIndisponibilidade(erro)) throw traduzirErroGemini(erro)
    }
  }

  throw new GeminiError(
    'Todos os modelos de IA disponíveis estão sobrecarregados agora ' +
      `(tentei ${modelos.join(', ')}). Isso costuma passar em alguns minutos. ` +
      'Suas fotos continuam aqui, ou dá para registrar digitando.',
    503,
  )
}

/** Reexportado para as rotas importarem tudo de um lugar só. */
export { parseJsonDaIA, RespostaInvalidaError }
