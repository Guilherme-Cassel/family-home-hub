import { Alert } from '@/components/Alert'
import { EstoqueClient } from '@/components/estoque/EstoqueClient'
import { getDiasAvisoValidade } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Estoque · Casa em Ordem' }

export default async function EstoquePage() {
  const supabase = await createClient()

  const [{ data: itens, error }, diasAvisoValidade] = await Promise.all([
    supabase.from('stock_items').select('*').order('name'),
    getDiasAvisoValidade(),
  ])

  if (error) {
    return (
      <Alert>
        Não foi possível carregar o estoque: {error.message}. Verifique a conexão
        e recarregue a página.
      </Alert>
    )
  }

  return (
    <EstoqueClient itens={itens ?? []} diasAvisoValidade={diasAvisoValidade} />
  )
}
