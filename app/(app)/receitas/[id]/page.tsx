import { notFound } from 'next/navigation'
import { descartarReceita } from '../actions'
import { ConfirmSubmit } from '@/components/ConfirmSubmit'
import { ReceitaEmAndamentoClient } from '@/components/receitas/ReceitaEmAndamentoClient'
import { createClient } from '@/lib/supabase/server'
import type { IngredienteSalvo, ReceitaEmAndamento } from '@/types/domain'

export const metadata = { title: 'Receita em andamento · Casa em Ordem' }

/** Converte os campos jsonb uma vez, aqui, em vez de espalhar checagem. */
function normalizarSessao(bruto: {
  steps: unknown
  ingredients: unknown
}): { steps: string[]; ingredients: IngredienteSalvo[] } {
  const steps = Array.isArray(bruto.steps)
    ? bruto.steps.map((p) => String(p)).filter(Boolean)
    : []

  const ingredients = Array.isArray(bruto.ingredients)
    ? bruto.ingredients.flatMap((item): IngredienteSalvo[] => {
        if (typeof item !== 'object' || item === null) return []

        const registro = item as Record<string, unknown>
        const nome = String(registro.nome ?? '').trim()
        if (!nome) return []

        const id = registro.stock_item_id
        const quantidade = Number(registro.quantidade)

        return [
          {
            stock_item_id: typeof id === 'string' && id ? id : null,
            nome,
            quantidade: Number.isFinite(quantidade) ? quantidade : 0,
            unidade: String(registro.unidade ?? 'un'),
          },
        ]
      })
    : []

  return { steps, ingredients }
}

export default async function ReceitaEmAndamentoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('recipe_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!data) notFound()

  const sessao: ReceitaEmAndamento = { ...data, ...normalizarSessao(data) }

  return (
    <div className="space-y-6">
      <ReceitaEmAndamentoClient sessao={sessao} />

      <section className="space-y-2 border-t border-slate-200 pt-6">
        <h2 className="text-base font-semibold text-slate-900">Desistir</h2>
        <p className="text-sm text-slate-500">
          Encerra a receita sem tirar nada do estoque.
        </p>
        <form action={descartarReceita}>
          <input type="hidden" name="id" value={sessao.id} />
          <ConfirmSubmit
            variant="secondary"
            pendingLabel="Descartando…"
            confirmacao={`Descartar "${sessao.name}" sem dar baixa no estoque?`}
          >
            Descartar receita
          </ConfirmSubmit>
        </form>
      </section>
    </div>
  )
}
