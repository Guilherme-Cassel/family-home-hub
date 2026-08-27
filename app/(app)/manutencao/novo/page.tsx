import { MaintenanceItemForm } from '@/components/manutencao/MaintenanceItemForm'

export const metadata = { title: 'Nova manutenção · Casa em Ordem' }

export default function NovaManutencaoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Novo item de manutenção</h1>
      <MaintenanceItemForm />
    </div>
  )
}
