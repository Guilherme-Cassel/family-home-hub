import { Type } from '@google/genai'
import { NextResponse } from 'next/server'
import {
  GeminiError,
  getGeminiClient,
  getModelo,
  parseJsonDaIA,
  traduzirErroGemini,
} from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'
import type { FotoEnviada, IdentificacaoIA } from '@/types/ia'

export const runtime = 'nodejs'

/** Teto de segurança por requisição, independente do lote pedido pelo cliente. */
const MAX_FOTOS_POR_REQUISICAO = 16

const PROMPT = `Você recebe fotos de produtos de supermercado, na ordem em que aparecem.

Para CADA imagem, identifique o produto e devolve um objeto com:
- "indice": a posição da imagem, começando em 0, na ordem em que foram enviadas.
- "nome_identificado": o nome genérico do produto em português do Brasil, sem
  marca e sem peso. Exemplos: "Arroz branco", "Leite integral", "Detergente".
  Se não der para identificar, use string vazia.
- "categoria_sugerida": uma entre alimento, bebida, limpeza, higiene, pet,
  farmacia, outros.
- "confianca": "alta" se você reconhece o produto com clareza, "media" se tem
  dúvida sobre o tipo exato, "baixa" se a foto está ruim, cortada ou ambígua.

Devolva exatamente um objeto por imagem recebida, na ordem dos índices.
Não invente produtos que não estão nas fotos: prefira confiança "baixa" e nome
vazio a chutar.`

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      indice: { type: Type.INTEGER },
      nome_identificado: { type: Type.STRING },
      categoria_sugerida: { type: Type.STRING },
      confianca: { type: Type.STRING, enum: ['alta', 'media', 'baixa'] },
    },
    required: ['indice', 'nome_identificado', 'categoria_sugerida', 'confianca'],
  },
}

/** Descarta o que a IA devolveu fora do contrato, sem derrubar o lote todo. */
function sanitizar(bruto: unknown, totalFotos: number): IdentificacaoIA[] {
  if (!Array.isArray(bruto)) return []

  const confiancasValidas = new Set(['alta', 'media', 'baixa'])
  const vistos = new Set<number>()
  const resultados: IdentificacaoIA[] = []

  for (const linha of bruto) {
    if (typeof linha !== 'object' || linha === null) continue

    const registro = linha as Record<string, unknown>
    const indice = Number(registro.indice)

    if (!Number.isInteger(indice) || indice < 0 || indice >= totalFotos) continue
    if (vistos.has(indice)) continue
    vistos.add(indice)

    const confianca = String(registro.confianca ?? '').toLowerCase()

    resultados.push({
      indice,
      nome_identificado: String(registro.nome_identificado ?? '').trim(),
      categoria_sugerida: String(registro.categoria_sugerida ?? 'outros').trim(),
      confianca: confiancasValidas.has(confianca)
        ? (confianca as IdentificacaoIA['confianca'])
        : 'baixa',
    })
  }

  return resultados
}

export async function POST(request: Request) {
  // A rota fala com uma API paga por cota: só para quem está autenticado.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sessão expirada. Entre de novo.' }, { status: 401 })
  }

  let fotos: FotoEnviada[]
  try {
    const corpo = (await request.json()) as { fotos?: FotoEnviada[] }
    fotos = corpo.fotos ?? []
  } catch {
    return NextResponse.json({ error: 'Requisição malformada.' }, { status: 400 })
  }

  if (fotos.length === 0) {
    return NextResponse.json({ error: 'Nenhuma foto enviada.' }, { status: 400 })
  }

  if (fotos.length > MAX_FOTOS_POR_REQUISICAO) {
    return NextResponse.json(
      { error: `Envie no máximo ${MAX_FOTOS_POR_REQUISICAO} fotos por vez.` },
      { status: 400 },
    )
  }

  try {
    const ai = getGeminiClient()

    // Todas as imagens do lote vão numa chamada só. Com a cota diária gratuita
    // em poucas dezenas de requisições, uma foto por requisição inviabilizaria
    // uma ida ao mercado inteira.
    const response = await ai.models.generateContent({
      model: getModelo(),
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            ...fotos.map((foto) => ({
              inlineData: { mimeType: foto.mimeType, data: foto.data },
            })),
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: 0,
      },
    })

    const bruto = parseJsonDaIA<unknown>(response.text)
    const resultados = sanitizar(bruto, fotos.length)

    return NextResponse.json({ resultados })
  } catch (erro) {
    const traduzido = erro instanceof GeminiError ? erro : traduzirErroGemini(erro)
    return NextResponse.json({ error: traduzido.message }, { status: traduzido.status })
  }
}
