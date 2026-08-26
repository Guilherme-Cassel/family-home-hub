import { Card } from '@/components/Card'

export const metadata = { title: 'Início · Casa em Ordem' }

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Início</h1>
      <Card>
        <p className="text-sm text-slate-600">
          O resumo da casa aparece aqui assim que o estoque e as manutenções
          estiverem cadastrados.
        </p>
      </Card>
    </div>
  )
}
