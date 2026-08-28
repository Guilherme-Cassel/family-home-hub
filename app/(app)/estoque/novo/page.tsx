import { StockItemForm } from '@/components/estoque/StockItemForm'
import { PageHeader } from '@/components/PageHeader'

export const metadata = { title: 'Novo item · Casa em Ordem' }

export default function NovoItemPage() {
  return (
    <>
      <PageHeader titulo="Novo item" voltar="/estoque" />
      <StockItemForm />
    </>
  )
}
