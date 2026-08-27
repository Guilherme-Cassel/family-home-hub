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

const MODELO_PADRAO = 'gemini-3.5-flash'

/** Quantas fotos vão em uma única requisição. Ver README sobre a cota. */
export const TAMANHO_LOTE_PADRAO = 6

export function getModelo() {
  return process.env.GEMINI_MODEL?.trim() || MODELO_PADRAO
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

/** Reexportado para as rotas importarem tudo de um lugar só. */
export { parseJsonDaIA, RespostaInvalidaError }
