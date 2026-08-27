import { ReceitasClient } from '@/components/receitas/ReceitasClient'
import { CATEGORIA_ALIMENTO } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Receitas · Casa em Ordem' }

export default async function ReceitasPage() {
  const supabase = await createClient()

  // Só o total: os ingredientes em si são lidos pela rota de IA no momento do
  // clique, para a sugestão refletir o estoque daquele instante.
  const { count } = await supabase
    .from('stock_items')
    .select('id', { count: 'exact', head: true })
    .eq('category', CATEGORIA_ALIMENTO)
    .gt('current_quantity', 0)

  return <ReceitasClient totalAlimentos={count ?? 0} />
}
