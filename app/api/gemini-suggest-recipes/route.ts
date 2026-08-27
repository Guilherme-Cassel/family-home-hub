import { Type } from '@google/genai'
import { NextResponse } from 'next/server'
import { CATEGORIA_ALIMENTO } from '@/lib/constants'
import { diasAte } from '@/lib/datas'
import {
  GeminiError,
  getGeminiClient,
  getModelo,
  parseJsonDaIA,
  traduzirErroGemini,
} from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'
import type { ReceitaIA } from '@/types/ia'

export const runtime = 'nodejs'

/** Quantas receitas pedir por chamada. */
const QUANTIDADE_RECEITAS = 6

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      nome_receita: { type: Type.STRING },
      tempo_preparo_minutos: { type: Type.INTEGER },
      porcoes: { type: Type.INTEGER },
      ingredientes_disponiveis: { type: Type.ARRAY, items: { type: Type.STRING } },
      ingredientes_faltando: { type: Type.ARRAY, items: { type: Type.STRING } },
      modo_preparo: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: [
      'nome_receita',
      'tempo_preparo_minutos',
      'porcoes',
      'ingredientes_disponiveis',
      'ingredientes_faltando',
      'modo_preparo',
    ],
  },
}

function montarPrompt(
  ingredientes: { linha: string; urgente: boolean }[],
): string {
  const urgentes = ingredientes.filter((i) => i.urgente).map((i) => i.linha)

  return `Você é um cozinheiro prático ajudando uma família a aproveitar o que já tem em casa.

Ingredientes disponíveis na despensa:
${ingredientes.map((i) => `- ${i.linha}`).join('\n')}

${
  urgentes.length > 0
    ? `PRIORIDADE: estes estão perto do vencimento e devem aparecer no maior número possível de receitas:\n${urgentes.map((linha) => `- ${linha}`).join('\n')}\n`
    : ''
}
Sugira até ${QUANTIDADE_RECEITAS} receitas caseiras brasileiras, em português do Brasil, seguindo estas regras:

1. Priorize receitas que usem SOMENTE os ingredientes listados. Pelo menos
   metade das sugestões deve ser assim.
2. As demais podem faltar no máximo 2 ingredientes, e só ingredientes comuns e
   baratos de comprar.
3. Considere que sal, açúcar, óleo, água, temperos secos e alho existem em
   qualquer cozinha: não os liste como faltando.
4. "ingredientes_disponiveis" deve conter apenas nomes que aparecem na lista
   acima, escritos do mesmo jeito.
5. "ingredientes_faltando" deve conter só o que precisa ser comprado.
6. "modo_preparo" é um passo por item do array, curto e direto.
7. Nada de receitas que exijam equipamento incomum.`
}

/** Descarta receitas fora do contrato em vez de derrubar a resposta inteira. */
function sanitizar(bruto: unknown): ReceitaIA[] {
  if (!Array.isArray(bruto)) return []

  const textos = (valor: unknown): string[] =>
    Array.isArray(valor)
      ? valor.map((v) => String(v).trim()).filter(Boolean)
      : []

  const receitas: ReceitaIA[] = []

  for (const linha of bruto) {
    if (typeof linha !== 'object' || linha === null) continue

    const registro = linha as Record<string, unknown>
    const nome = String(registro.nome_receita ?? '').trim()
    const preparo = textos(registro.modo_preparo)

    // Sem nome ou sem preparo a receita é inútil na tela.
    if (!nome || preparo.length === 0) continue

    receitas.push({
      nome_receita: nome,
      tempo_preparo_minutos: Number(registro.tempo_preparo_minutos) || 0,
      porcoes: Number(registro.porcoes) || 0,
      ingredientes_disponiveis: textos(registro.ingredientes_disponiveis),
      ingredientes_faltando: textos(registro.ingredientes_faltando),
      modo_preparo: preparo,
    })
  }

  return receitas
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sessão expirada. Entre de novo.' }, { status: 401 })
  }

  // O estoque é lido aqui, no servidor, em vez de vir no corpo da requisição:
  // é a mesma informação, com menos dados trafegando e sem depender do que o
  // cliente resolveu mandar.
  const { data: alimentos, error } = await supabase
    .from('stock_items')
    .select('name, current_quantity, unit, expiration_date')
    .eq('category', CATEGORIA_ALIMENTO)
    .gt('current_quantity', 0)
    .order('expiration_date', { nullsFirst: false })

  if (error) {
    return NextResponse.json(
      { error: `Não foi possível ler o estoque: ${error.message}` },
      { status: 500 },
    )
  }

  if (!alimentos || alimentos.length === 0) {
    return NextResponse.json({
      receitas: [],
      aviso:
        'Não há alimentos com quantidade em estoque. Cadastre itens na categoria ' +
        '"alimento" para receber sugestões.',
    })
  }

  const ingredientes = alimentos.map((item) => {
    const dias = item.expiration_date ? diasAte(item.expiration_date) : null
    const urgente = dias !== null && dias <= 7

    const validade =
      dias === null
        ? ''
        : dias < 0
          ? ' (VENCIDO)'
          : dias === 0
            ? ' (vence hoje)'
            : ` (vence em ${dias} dias)`

    return {
      linha: `${item.name}: ${item.current_quantity} ${item.unit}${validade}`,
      urgente,
    }
  })

  try {
    const ai = getGeminiClient()

    const response = await ai.models.generateContent({
      model: getModelo(),
      contents: montarPrompt(ingredientes),
      config: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: 0.7,
      },
    })

    const receitas = sanitizar(parseJsonDaIA<unknown>(response.text))

    return NextResponse.json({ receitas })
  } catch (erro) {
    const traduzido = erro instanceof GeminiError ? erro : traduzirErroGemini(erro)
    return NextResponse.json({ error: traduzido.message }, { status: traduzido.status })
  }
}
