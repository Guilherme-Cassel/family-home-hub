import { Card } from '@/components/Card'

export const metadata = { title: 'Manutenção · Casa em Ordem' }

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Manutenção</h1>
      <Card>
        <p className="text-sm text-slate-600">Em construção.</p>
      </Card>
    </div>
  )
}
