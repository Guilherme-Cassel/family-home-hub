import { MaintenanceItemForm } from '@/components/manutencao/MaintenanceItemForm'
import { PageHeader } from '@/components/PageHeader'

export const metadata = { title: 'Nova manutenção · Casa em Ordem' }

export default function NovaManutencaoPage() {
  return (
    <>
      <PageHeader titulo="Novo item de manutenção" voltar="/manutencao" />
      <MaintenanceItemForm />
    </>
  )
}
