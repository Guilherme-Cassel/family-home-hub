import { Alert } from '@/components/Alert'
import { ManutencaoClient } from '@/components/manutencao/ManutencaoClient'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Manutenção · Casa em Ordem' }

export default async function ManutencaoPage() {
  const supabase = await createClient()

  // next_due_date é coluna gerada, então "mais atrasado primeiro" é só um
  // order by — sem cálculo no cliente nem view.
  const { data: itens, error } = await supabase
    .from('maintenance_items')
    .select('*')
    .order('next_due_date')

  if (error) {
    return (
      <Alert>
        Não foi possível carregar as manutenções: {error.message}. Verifique a
        conexão e recarregue a página.
      </Alert>
    )
  }

  return <ManutencaoClient itens={itens ?? []} />
}
