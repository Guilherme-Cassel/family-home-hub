import { notFound } from 'next/navigation'
import { excluirItem } from '../actions'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { StockItemForm } from '@/components/estoque/StockItemForm'
import { ConfirmSubmit } from '@/components/ConfirmSubmit'
import { DataHora } from '@/components/DataHora'
import { formatarMoeda, formatarQuantidade } from '@/lib/formatters'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Editar item · Casa em Ordem' }

const ROTULO_MOTIVO: Record<string, string> = {
  consumo: 'Consumo',
  reposicao: 'Reposição',
  compra: 'Compra',
  ajuste: 'Ajuste',
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: item }, { data: movimentacoes, error: erroHistorico }] =
    await Promise.all([
      supabase.from('stock_items').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('stock_movements')
        .select(
          '*, autor:profiles!stock_movements_created_by_fkey(display_name)',
        )
        .eq('stock_item_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

  if (!item) notFound()

  return (
    <>
      <PageHeader titulo={item.name} voltar="/estoque" />

      <div className="space-y-7">
      <StockItemForm item={item} />

      <section className="space-y-3">
        <h2 className="text-[17px] font-bold tracking-[-0.01em] text-ink">
          Últimas movimentações
        </h2>

        {erroHistorico ? (
          <Alert>Não foi possível carregar o histórico: {erroHistorico.message}</Alert>
        ) : !movimentacoes || movimentacoes.length === 0 ? (
          <p className="text-sm text-ink-2">
            Nenhuma movimentação registrada ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {movimentacoes.map((mov) => (
              <li key={mov.id}>
                <Card className="flex items-center justify-between gap-3 rounded-item px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          mov.quantity_change > 0
                            ? 'font-semibold tabular-nums text-ok-ink'
                            : 'font-semibold tabular-nums text-danger-ink'
                        }
                      >
                        {mov.quantity_change > 0 ? '+' : '−'}
                        {formatarQuantidade(Math.abs(mov.quantity_change))} {item.unit}
                      </span>
                      <Badge>{ROTULO_MOTIVO[mov.reason] ?? mov.reason}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-2">
                      <DataHora iso={mov.created_at} />
                      {mov.autor ? ` · ${mov.autor.display_name}` : ''}
                    </p>
                  </div>

                  {mov.price_at_time !== null ? (
                    <span className="shrink-0 text-sm text-ink-2">
                      {formatarMoeda(mov.price_at_time)}
                    </span>
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
          Apaga o item e todo o histórico de movimentações dele. Não dá para
          desfazer.
        </p>
        <form action={excluirItem}>
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
