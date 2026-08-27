import { notFound } from 'next/navigation'
import { excluirManutencao } from '../actions'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{item.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone={selo.tom}>{selo.texto}</Badge>
          <span className="text-sm text-slate-500">
            Próxima em {formatarData(item.next_due_date)}
          </span>
        </div>
      </div>

      <MaintenanceItemForm item={item} />

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Histórico</h2>

        {erroHistorico ? (
          <Alert>Não foi possível carregar o histórico: {erroHistorico.message}</Alert>
        ) : !historico || historico.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma manutenção registrada ainda. Use o botão de check na listagem
            para marcar a primeira.
          </p>
        ) : (
          <ul className="space-y-2">
            {historico.map((registro) => (
              <li key={registro.id}>
                <Card className="p-3">
                  <p className="font-medium text-slate-900">
                    {formatarData(registro.done_date)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {registro.autor
                      ? `Feito por ${registro.autor.display_name}`
                      : 'Autor não registrado'}
                  </p>
                  {registro.notes ? (
                    <p className="mt-2 text-sm text-slate-600">{registro.notes}</p>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 border-t border-slate-200 pt-6">
        <h2 className="text-base font-semibold text-slate-900">Excluir item</h2>
        <p className="text-sm text-slate-500">
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
  )
}
