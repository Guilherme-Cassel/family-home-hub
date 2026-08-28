import { notFound } from 'next/navigation'
import { excluirManutencao } from '../actions'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmSubmit } from '@/components/ConfirmSubmit'
import { MaintenanceItemForm } from '@/components/manutencao/MaintenanceItemForm'
import { formatarData } from '@/lib/formatters'
import { rotuloStatusManutencao } from '@/lib/status'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Manutenção · Casa em Ordem' }

export default async function ManutencaoItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: item }, { data: historico, error: erroHistorico }] =
    await Promise.all([
      supabase.from('maintenance_items').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('maintenance_log')
        .select('*, autor:profiles!maintenance_log_done_by_fkey(display_name)')
        .eq('maintenance_item_id', id)
        .order('done_date', { ascending: false })
        .limit(50),
    ])

  if (!item) notFound()

  const selo = rotuloStatusManutencao(item)

  return (
    <>
      <PageHeader titulo={item.name} voltar="/manutencao" />

      <div className="space-y-7">
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={selo.tom}>{selo.texto}</Badge>
          <span className="text-sm text-ink-2">
            Próxima em {formatarData(item.next_due_date)}
          </span>
        </div>
      </div>

      <MaintenanceItemForm item={item} />

      <section className="space-y-3">
        <h2 className="text-[17px] font-bold tracking-[-0.01em] text-ink">Histórico</h2>

        {erroHistorico ? (
          <Alert>Não foi possível carregar o histórico: {erroHistorico.message}</Alert>
        ) : !historico || historico.length === 0 ? (
          <p className="text-sm text-ink-2">
            Nenhuma manutenção registrada ainda. Use o botão de check na listagem
            para marcar a primeira.
          </p>
        ) : (
          <ul className="space-y-2">
            {historico.map((registro) => (
              <li key={registro.id}>
                <Card className="rounded-item px-4 py-3.5">
                  <p className="font-medium text-ink">
                    {formatarData(registro.done_date)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-2">
                    {registro.autor
                      ? `Feito por ${registro.autor.display_name}`
                      : 'Autor não registrado'}
                  </p>
                  {registro.notes ? (
                    <p className="mt-2 text-sm text-ink-2">{registro.notes}</p>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[17px] font-bold tracking-[-0.01em] text-ink">Excluir item</h2>
        <p className="text-sm text-ink-2">
          Apaga o item e todo o histórico de manutenções dele. Não dá para
          desfazer.
        </p>
        <form action={excluirManutencao}>
          <input type="hidden" name="id" value={item.id} />
          <ConfirmSubmit
            variant="danger"
            confirmacao={`Excluir "${item.name}" e todo o histórico?`}
          >
            Excluir item
          </ConfirmSubmit>
        </form>
      </section>
      </div>
    </>
  )
}
