import { Alert } from '@/components/Alert'
import { EntradaRapidaClient } from '@/components/entrada/EntradaRapidaClient'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Digitar itens · Casa em Ordem' }

export default async function EntradaRapidaPage() {
  const supabase = await createClient()

  const { data: itens, error } = await supabase
    .from('stock_items')
    .select('id, name, unit, category, minimum_quantity')
    .order('name')

  if (error) {
    return (
      <Alert>
        Não foi possível carregar os itens cadastrados: {error.message}. Verifique
        a conexão e recarregue a página.
      </Alert>
    )
  }

  return <EntradaRapidaClient itens={itens ?? []} />
}
