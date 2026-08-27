import { Alert } from '@/components/Alert'
import { EntradaFotoClient } from '@/components/entrada/EntradaFotoClient'
import { getTamanhoLote } from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Entrada por foto · Casa em Ordem' }

export default async function EntradaFotoPage() {
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

  // O tamanho do lote vive numa env do servidor; o cliente precisa dele para
  // fatiar as fotos e mostrar quantas requisições a compra vai custar.
  return <EntradaFotoClient itens={itens ?? []} tamanhoLote={getTamanhoLote()} />
}
