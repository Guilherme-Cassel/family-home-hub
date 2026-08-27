import {
  ReceitasClient,
  type ResumoEmAndamento,
} from '@/components/receitas/ReceitasClient'
import { CATEGORIA_ALIMENTO } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Receitas · Casa em Ordem' }

export default async function ReceitasPage() {
  const supabase = await createClient()

  const [{ count }, { data: sessoes }] = await Promise.all([
    // Só o total: os ingredientes em si são lidos pela rota de IA no momento
    // do clique, para a sugestão refletir o estoque daquele instante.
    supabase
      .from('stock_items')
      .select('id', { count: 'exact', head: true })
      .eq('category', CATEGORIA_ALIMENTO)
      .gt('current_quantity', 0),

    supabase
      .from('recipe_sessions')
      .select('id, name, done_steps, steps')
      .order('created_at', { ascending: false }),
  ])

  const emAndamento: ResumoEmAndamento[] = (sessoes ?? []).map((sessao) => ({
    id: sessao.id,
    name: sessao.name,
    done_steps: sessao.done_steps ?? [],
    total_steps: Array.isArray(sessao.steps) ? sessao.steps.length : 0,
  }))

  return <ReceitasClient totalAlimentos={count ?? 0} emAndamento={emAndamento} />
}
