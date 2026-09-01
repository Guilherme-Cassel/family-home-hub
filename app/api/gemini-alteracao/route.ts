import { Type } from '@google/genai'
import { NextResponse } from 'next/server'
import {
  GeminiError,
  gerarComResiliencia,
  parseJsonDaIA,
  traduzirErroGemini,
} from '@/lib/gemini'
import { sanitizarAlteracoes, type ItemCatalogo } from '@/lib/ia/alteracaoEstoque'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Só texto, sem imagem: responde em poucos segundos. O teto existe para o
// caso de a fila do Google engasgar, não porque a chamada seja pesada.
export const maxDuration = 30

/** Frase ditada; o teto evita mandar um texto colado por engano. */
const MAX_CARACTERES = 500

/** Teto de itens do cadastro enviados no prompt, para não inflar o payload. */
const MAX_ITENS_NO_PROMPT = 300

function montarPrompt(catalogo: ItemCatalogo[], texto: string): string {
  const lista = catalogo
    .map(
      (item, indice) =>
        `[${indice}] ${item.name} — medido em ${item.unit}, tem ${item.current_quantity}`,
    )
    .join('\n')

  return `Alguém da casa acabou de contar o que mexeu na despensa. A frase foi:

"${texto}"

Estes são os itens cadastrados:

${lista}

Devolva um objeto para CADA item que a frase mencionar, com:
- "tipo": "saida" quando a frase fala de gastar, usar, comer, acabar ou tirar
  da despensa. "entrada" quando fala de comprar, trazer do mercado, repor ou
  ganhar. Uma frase só pode ter os dois: "usei os dois últimos ovos e comprei
  uma dúzia" é uma saída de 2 e uma entrada de 12.
- "indice_cadastro": o número entre colchetes do item correspondente. Use -1
  quando a frase citar algo que não está na lista.
- "nome_falado": como a pessoa se referiu ao item, com as palavras dela.
- "quantidade": quanto, como número positivo, sempre. O sinal quem dá é o
  "tipo". "meio" é 0.5, "uma dúzia" é 12. Se a pessoa não disser quantidade
  ("usei ovo"), devolva 1.
- "unidade": a medida em que a pessoa falou, uma entre "un", "kg", "g", "L",
  "ml", "pct", "cx". Se ela não disser medida ("usei dois ovos"), devolva a
  unidade em que o item está cadastrado. Para item que não está na lista, a
  unidade em que esse produto costuma ser vendido: arroz em kg, leite em L,
  sabão em pó em g, ovo em un.
- "categoria_sugerida": só interessa quando "indice_cadastro" é -1, porque aí o
  item vai precisar ser cadastrado. Uma entre alimento, bebida, limpeza,
  higiene, pet, farmacia, outros. Para item que já está na lista, devolva
  string vazia.
- "nome_cadastro": também só para "indice_cadastro" -1. O nome genérico do
  produto em português, sem marca e sem peso, do jeito que ele entraria numa
  despensa: "Sabão em pó", "Arroz branco". Para item que já está na lista,
  devolva string vazia.

Exemplos, supondo leite cadastrado em ml e ovo em un:
  "usei um ovo" → saida, 1, "un"
  "tomei meio litro de leite" → saida, 0.5, "L"
  "comprei 2 litros de leite no mercado" → entrada, 2, "L"
  "fui no mercado, trouxe 1 kg de arroz e 6 ovos" → duas entradas

Regras:
- Na dúvida entre entrada e saída, use "saida": é o caso mais comum no dia a
  dia, e quem revisa inverte num toque.
- Não invente itens que a frase não mencionou. Prefira devolver uma lista
  vazia a chutar.
- A fala vem de transcrição de voz e pode ter erro de grafia: "leiti" é leite.`
}

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      tipo: { type: Type.STRING, enum: ['entrada', 'saida'] },
      indice_cadastro: { type: Type.INTEGER },
      nome_falado: { type: Type.STRING },
      nome_cadastro: { type: Type.STRING },
      categoria_sugerida: { type: Type.STRING },
      quantidade: { type: Type.NUMBER },
      unidade: { type: Type.STRING },
    },
    required: [
      'tipo',
      'indice_cadastro',
      'nome_falado',
      'nome_cadastro',
      'categoria_sugerida',
      'quantidade',
      'unidade',
    ],
  },
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sessão expirada. Entre de novo.' }, { status: 401 })
  }

  let texto: string
  try {
    const corpo = (await request.json()) as { texto?: string }
    texto = String(corpo.texto ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Requisição malformada.' }, { status: 400 })
  }

  if (!texto) {
    return NextResponse.json({ error: 'Escreva o que mudou no estoque.' }, { status: 400 })
  }

  if (texto.length > MAX_CARACTERES) {
    return NextResponse.json(
      { error: `Texto muito longo (máximo ${MAX_CARACTERES} caracteres).` },
      { status: 400 },
    )
  }

  // O cadastro é lido no servidor, e não recebido do cliente: o índice
  // devolvido pela IA é resolvido contra a lista de verdade.
  const { data: catalogo } = await supabase
    .from('stock_items')
    .select('id, name, unit, current_quantity')
    .order('name')
    .limit(MAX_ITENS_NO_PROMPT)

  const itens = catalogo ?? []

  if (itens.length === 0) {
    return NextResponse.json(
      { error: 'Não há itens cadastrados no estoque ainda.' },
      { status: 400 },
    )
  }

  try {
    const { response } = await gerarComResiliencia({
      contents: [{ role: 'user', parts: [{ text: montarPrompt(itens, texto) }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: 0,
      },
    })

    const bruto = parseJsonDaIA<unknown>(response.text)

    return NextResponse.json({ alteracoes: sanitizarAlteracoes(bruto, itens) })
  } catch (erro) {
    const traduzido = erro instanceof GeminiError ? erro : traduzirErroGemini(erro)
    return NextResponse.json({ error: traduzido.message }, { status: traduzido.status })
  }
}
