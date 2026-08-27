import { Alert } from '@/components/Alert'
import { ComprasClient } from '@/components/compras/ComprasClient'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Lista de compras · Casa em Ordem' }

export default async function ComprasPage() {
  const supabase = await createClient()

  const [{ data: faltando, error: erroEstoque }, { data: avulsos, error: erroAvulsos }] =
    await Promise.all([
      // is_below_minimum é coluna gerada, então o filtro sai direto na query.
      supabase
        .from('stock_items')
        .select('*')
        .eq('is_below_minimum', true)
        .order('name'),
      supabase
        .from('shopping_list_extras')
        .select('*')
        .order('is_done')
        .order('created_at'),
    ])

  const erro = erroEstoque ?? erroAvulsos
  if (erro) {
    return (
      <Alert>
        Não foi possível carregar a lista de compras: {erro.message}. Verifique a
        conexão e recarregue a página.
      </Alert>
    )
  }

  return <ComprasClient faltando={faltando ?? []} avulsos={avulsos ?? []} />
}
