import { Type } from '@google/genai'
import { NextResponse } from 'next/server'
import { CATEGORIA_ALIMENTO } from '@/lib/constants'
import { diasAte } from '@/lib/datas'
import {
  GeminiError,
  gerarComResiliencia,
  parseJsonDaIA,
  traduzirErroGemini,
} from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'
import type { IngredienteIA, ReceitaIA } from '@/types/ia'

export const runtime = 'nodejs'

// Mesmo motivo da rota de fotos: o modelo pode demorar dezenas de segundos.
export const maxDuration = 60

/** Quantas receitas pedir por chamada. */
const QUANTIDADE_RECEITAS = 6

/** Alimento disponível, do jeito que entra no prompt. */
type Disponivel = {
  indice: number
  id: string
  nome: string
  unidade: string
  quantidade: number
  urgente: boolean
  validade: string
}

const SCHEMA_INGREDIENTE = {
  type: Type.OBJECT,
  properties: {
    nome: { type: Type.STRING },
    quantidade: { type: Type.NUMBER },
    unidade: { type: Type.STRING },
    indice_cadastro: { type: Type.INTEGER },
  },
  required: ['nome', 'quantidade', 'unidade', 'indice_cadastro'],
}

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      nome_receita: { type: Type.STRING },
      tempo_preparo_minutos: { type: Type.INTEGER },
      porcoes: { type: Type.INTEGER },
      ingredientes_disponiveis: { type: Type.ARRAY, items: SCHEMA_INGREDIENTE },
      ingredientes_faltando: { type: Type.ARRAY, items: SCHEMA_INGREDIENTE },
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

function montarPrompt(disponiveis: Disponivel[]): string {
  const lista = disponiveis
    .map(
      (i) =>
        `[${i.indice}] ${i.nome} — tem ${i.quantidade} ${i.unidade}${i.validade}`,
    )
    .join('\n')

  const urgentes = disponiveis.filter((i) => i.urgente)

  return `Você é um cozinheiro prático ajudando uma família a aproveitar o que já tem em casa.

Itens disponíveis na despensa, com o índice entre colchetes, o quanto há e a
unidade em que cada um é medido:

${lista}

${
  urgentes.length > 0
    ? `PRIORIDADE: estes estão perto do vencimento e devem aparecer no maior número possível de receitas:
${urgentes.map((i) => `- ${i.nome}`).join('\n')}
`
    : ''
}
Sugira até ${QUANTIDADE_RECEITAS} receitas caseiras brasileiras, em português do Brasil, seguindo estas regras:

1. Priorize receitas que usem SOMENTE os itens listados. Pelo menos metade das
   sugestões deve ser assim.
2. As demais podem faltar no máximo 2 ingredientes, e só ingredientes comuns e
   baratos de comprar.
3. Considere que sal, açúcar, óleo, água, temperos secos e alho existem em
   qualquer cozinha: não os liste como faltando.
4. Nunca proponha usar mais de um item do que existe na despensa.

Sobre as quantidades, que é a parte mais importante:

- Em "ingredientes_disponiveis", coloque cada item da lista que a receita usa.
  Preencha "indice_cadastro" com o número entre colchetes, e "quantidade" com
  o quanto a receita consome **na mesma unidade indicada na lista acima**.
  Exemplo: se a lista diz "Manteiga — tem 0.2 kg" e a receita leva 400 gramas,
  responda quantidade 0.4 e unidade "kg". Não converta para gramas.
- Em "ingredientes_faltando", coloque o que precisa ser comprado, com
  "indice_cadastro" igual a -1 e a quantidade na unidade que fizer sentido
  para comprar (kg, L, un).
- "quantidade" é sempre um número. Nada de "a gosto" ou "o suficiente": se for
  algo a gosto, use uma estimativa pequena e razoável.
- "modo_preparo" é um passo por item do array, curto e direto, na ordem.
- Nada de receitas que exijam equipamento incomum.`
}

/** Descarta o que veio fora do contrato em vez de derrubar a resposta toda. */
function sanitizarIngredientes(
  bruto: unknown,
  disponiveis: Disponivel[],
  exigeVinculo: boolean,
): IngredienteIA[] {
  if (!Array.isArray(bruto)) return []

  const resultado: IngredienteIA[] = []

  for (const linha of bruto) {
    if (typeof linha !== 'object' || linha === null) continue

    const registro = linha as Record<string, unknown>
    const nome = String(registro.nome ?? '').trim()
    if (!nome) continue

    // O índice é resolvido aqui, contra a lista real enviada no prompt: um
    // número inventado vira ingrediente sem vínculo em vez de apontar para o
    // item errado e dar baixa no que não foi usado.
    const indice = Number(registro.indice_cadastro)
    const item =
      Number.isInteger(indice) && indice >= 0 && indice < disponiveis.length
        ? disponiveis[indice]
        : null

    // Um "disponível" sem vínculo não tem como virar baixa no estoque.
    if (exigeVinculo && !item) continue

    const quantidade = Number(registro.quantidade)

    resultado.push({
      nome: item?.nome ?? nome,
      quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 0,
      // Para vinculados, a unidade do cadastro manda: é nela que a baixa
      // acontece, independentemente do que a IA escreveu.
      unidade: item?.unidade ?? String(registro.unidade ?? 'un').trim(),
      stock_item_id: item?.id ?? null,
    })
  }

  return resultado
}

function sanitizar(bruto: unknown, disponiveis: Disponivel[]): ReceitaIA[] {
  if (!Array.isArray(bruto)) return []

  const receitas: ReceitaIA[] = []

  for (const linha of bruto) {
    if (typeof linha !== 'object' || linha === null) continue

    const registro = linha as Record<string, unknown>
    const nome = String(registro.nome_receita ?? '').trim()
    const preparo = Array.isArray(registro.modo_preparo)
      ? registro.modo_preparo.map((v) => String(v).trim()).filter(Boolean)
      : []

    // Sem nome ou sem preparo a receita é inútil na tela.
    if (!nome || preparo.length === 0) continue

    receitas.push({
      nome_receita: nome,
      tempo_preparo_minutos: Number(registro.tempo_preparo_minutos) || 0,
      porcoes: Number(registro.porcoes) || 0,
      ingredientes_disponiveis: sanitizarIngredientes(
        registro.ingredientes_disponiveis,
        disponiveis,
        true,
      ),
      ingredientes_faltando: sanitizarIngredientes(
        registro.ingredientes_faltando,
        disponiveis,
        false,
      ),
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
    .select('id, name, current_quantity, unit, expiration_date')
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

  const disponiveis: Disponivel[] = alimentos.map((item, indice) => {
    const dias = item.expiration_date ? diasAte(item.expiration_date) : null

    const validade =
      dias === null
        ? ''
        : dias < 0
          ? ' (VENCIDO)'
          : dias === 0
            ? ' (vence hoje)'
            : ` (vence em ${dias} dias)`

    return {
      indice,
      id: item.id,
      nome: item.name,
      unidade: item.unit,
      quantidade: item.current_quantity,
      urgente: dias !== null && dias <= 7,
      validade,
    }
  })

  try {
    const { response } = await gerarComResiliencia({
      contents: montarPrompt(disponiveis),
      config: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: 0.7,
      },
    })

    const receitas = sanitizar(parseJsonDaIA<unknown>(response.text), disponiveis)

    return NextResponse.json({ receitas })
  } catch (erro) {
    const traduzido = erro instanceof GeminiError ? erro : traduzirErroGemini(erro)
    return NextResponse.json({ error: traduzido.message }, { status: traduzido.status })
  }
}
