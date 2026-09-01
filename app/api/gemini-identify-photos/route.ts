import { Type } from '@google/genai'
import { NextResponse } from 'next/server'
import {
  GeminiError,
  gerarComResiliencia,
  parseJsonDaIA,
  traduzirErroGemini,
} from '@/lib/gemini'
import { normalizarUnidade } from '@/lib/medidas'
import { createClient } from '@/lib/supabase/server'
import type { FotoEnviada, IdentificacaoIA } from '@/types/ia'

export const runtime = 'nodejs'

// A chamada com 6 fotos leva de 5s a 35s conforme o modelo e a fila do
// Google. O padrao da Vercel e curto demais para isso, e a funcao morreria no
// meio devolvendo algo que nem e JSON.
export const maxDuration = 60

/** Teto de segurança por requisição, independente do lote pedido pelo cliente. */
const MAX_FOTOS_POR_REQUISICAO = 16

/** Teto de itens do cadastro enviados no prompt, para não inflar o payload. */
const MAX_ITENS_NO_PROMPT = 300

function montarPrompt(catalogo: { name: string }[]): string {
  const lista = catalogo
    .map((item, indice) => `[${indice}] ${item.name}`)
    .join('\n')

  return `Você recebe fotos de produtos de supermercado, na ordem em que aparecem.

Para CADA imagem, identifique o produto e devolva um objeto com:
- "indice": a posição da imagem, começando em 0, na ordem em que foram enviadas.
- "nome_identificado": o nome genérico do produto em português do Brasil, sem
  marca e sem peso. Exemplos: "Arroz branco", "Leite integral", "Detergente".
  Se não der para identificar, use string vazia.
- "categoria_sugerida": uma entre alimento, bebida, limpeza, higiene, pet,
  farmacia, outros.
- "confianca": "alta" se você reconhece o produto com clareza, "media" se tem
  dúvida sobre o tipo exato, "baixa" se a foto está ruim, cortada ou ambígua.
- "quantidade_embalagem" e "unidade_embalagem": o conteúdo declarado no rótulo,
  exatamente na medida em que ele está escrito. Uma caixinha de leite de 1 L é
  quantidade 1 e unidade "L", não 1000 e "ml". Um pacote de 500 g é 500 e "g".
  A unidade tem que ser uma destas: "un", "kg", "g", "L", "ml", "pct", "cx".
  Se a embalagem trouxer várias porções (por exemplo "6 x 90 g"), some o total
  e devolva 540 e "g". Se o rótulo não estiver legível na foto, devolva
  quantidade 0 e unidade "" — não estime pelo tamanho aparente do produto.
- "indice_cadastro": explicado abaixo.

${
  catalogo.length > 0
    ? `Esta família já tem estes itens cadastrados na despensa:

${lista}

Em "indice_cadastro", devolva o número entre colchetes do item que for o MESMO
produto da foto, mesmo que o nome esteja escrito de um jeito bem diferente.
Por exemplo: uma foto de caixa de leite integral corresponde a "Caixinha de
Leite 1L", e um pacote de café corresponde a "Café Pilão 500g" — é o mesmo
produto, só nomeado de outro jeito.

Use -1 quando o produto da foto não estiver na lista. Na dúvida entre dois
itens, ou se não tiver certeza de que é o mesmo produto, use -1: quem revisa
corrige em dois toques, mas um vínculo errado credita a compra no item errado
e passa despercebido.`
    : 'Não há itens cadastrados ainda, então use -1 em "indice_cadastro".'
}

Devolva exatamente um objeto por imagem recebida, na ordem dos índices.
Não invente produtos que não estão nas fotos: prefira confiança "baixa" e nome
vazio a chutar.`
}

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      indice: { type: Type.INTEGER },
      nome_identificado: { type: Type.STRING },
      categoria_sugerida: { type: Type.STRING },
      confianca: { type: Type.STRING, enum: ['alta', 'media', 'baixa'] },
      quantidade_embalagem: { type: Type.NUMBER },
      unidade_embalagem: { type: Type.STRING },
      indice_cadastro: { type: Type.INTEGER },
    },
    required: [
      'indice',
      'nome_identificado',
      'categoria_sugerida',
      'confianca',
      'quantidade_embalagem',
      'unidade_embalagem',
      'indice_cadastro',
    ],
  },
}

/** Descarta o que a IA devolveu fora do contrato, sem derrubar o lote todo. */
function sanitizar(
  bruto: unknown,
  totalFotos: number,
  catalogo: { id: string }[],
): IdentificacaoIA[] {
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

    // O índice do cadastro é resolvido aqui, contra a lista real que foi
    // enviada no prompt. Um índice inventado ou fora da faixa simplesmente
    // não vira vínculo, em vez de apontar para o item errado.
    const indiceCadastro = Number(registro.indice_cadastro)
    const item =
      Number.isInteger(indiceCadastro) &&
      indiceCadastro >= 0 &&
      indiceCadastro < catalogo.length
        ? catalogo[indiceCadastro]
        : null

    // Só passa adiante o rótulo que dá para usar: quantidade positiva e
    // unidade conhecida pelo app. Qualquer outra coisa vira null, e a revisão
    // entra com 1 como sempre entrou.
    const quantidadeEmbalagem = Number(registro.quantidade_embalagem)
    const unidadeEmbalagem = normalizarUnidade(String(registro.unidade_embalagem ?? ''))
    const embalagem =
      Number.isFinite(quantidadeEmbalagem) &&
      quantidadeEmbalagem > 0 &&
      unidadeEmbalagem !== null
        ? { quantidade: quantidadeEmbalagem, unidade: unidadeEmbalagem }
        : null

    resultados.push({
      indice,
      nome_identificado: String(registro.nome_identificado ?? '').trim(),
      categoria_sugerida: String(registro.categoria_sugerida ?? 'outros').trim(),
      confianca: confiancasValidas.has(confianca)
        ? (confianca as IdentificacaoIA['confianca'])
        : 'baixa',
      stock_item_id: item?.id ?? null,
      embalagem,
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

  // O cadastro é lido aqui, no servidor, e não recebido do cliente: assim o
  // índice devolvido pela IA é resolvido contra a lista de verdade, e não
  // contra algo que veio no corpo da requisição.
  const { data: catalogo } = await supabase
    .from('stock_items')
    .select('id, name')
    .order('name')
    .limit(MAX_ITENS_NO_PROMPT)

  const itens = catalogo ?? []

  try {
    // Todas as imagens do lote vao numa chamada so. Com a cota diaria gratuita
    // em poucas dezenas de requisicoes, uma foto por requisicao inviabilizaria
    // uma ida ao mercado inteira.
    const { response } = await gerarComResiliencia({
      contents: [
        {
          role: 'user',
          parts: [
            { text: montarPrompt(itens) },
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
    const resultados = sanitizar(bruto, fotos.length, itens)

    return NextResponse.json({ resultados })
  } catch (erro) {
    const traduzido = erro instanceof GeminiError ? erro : traduzirErroGemini(erro)
    return NextResponse.json({ error: traduzido.message }, { status: traduzido.status })
  }
}
