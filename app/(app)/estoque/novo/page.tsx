import { StockItemForm } from '@/components/estoque/StockItemForm'

export const metadata = { title: 'Novo item · Casa em Ordem' }

export default function NovoItemPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Novo item</h1>
      <StockItemForm />
    </div>
  )
}
