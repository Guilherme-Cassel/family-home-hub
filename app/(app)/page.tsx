import Link from 'next/link'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { ButtonLink } from '@/components/Button'
import { Card } from '@/components/Card'
import { StatCard } from '@/components/StatCard'
import { IconCamera, IconChef, IconList } from '@/components/icons'
import { CATEGORIA_ALIMENTO } from '@/lib/constants'
import { hojeIso, isoDeData } from '@/lib/datas'
import { formatarData } from '@/lib/formatters'
import { getDiasAvisoValidade } from '@/lib/queries'
import { rotuloStatusManutencao } from '@/lib/status'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Início · Casa em Ordem' }

/** Quantos itens críticos listar por bloco antes de virar só um número. */
const LIMITE_DESTAQUE = 3

export default async function DashboardPage() {
  const supabase = await createClient()
  const diasAviso = await getDiasAvisoValidade()

  const hoje = hojeIso()
  const limiteValidade = new Date()
  limiteValidade.setDate(limiteValidade.getDate() + diasAviso)

  const [faltando, manutencoes, perecendo, avulsos, totalEstoque] = await Promise.all([
    supabase
      .from('stock_items')
      .select('id, name, unit, current_quantity, minimum_quantity', {
        count: 'exact',
      })
      .eq('is_below_minimum', true)
      .order('name')
      .limit(LIMITE_DESTAQUE),

    // Vencidas e as que vencem em breve, mais atrasada primeiro.
    supabase
      .from('maintenance_items')
      .select('*')
      .lte('next_due_date', hoje)
      .order('next_due_date'),

    supabase
      .from('stock_items')
      .select('id, name, expiration_date', { count: 'exact' })
      .eq('category', CATEGORIA_ALIMENTO)
      .not('expiration_date', 'is', null)
      .lte('expiration_date', isoDeData(limiteValidade))
      .order('expiration_date')
      .limit(LIMITE_DESTAQUE),

    supabase
      .from('shopping_list_extras')
      .select('id', { count: 'exact', head: true })
      .eq('is_done', false),

    supabase.from('stock_items').select('id', { count: 'exact', head: true }),
  ])

  const erro =
    faltando.error ??
    manutencoes.error ??
    perecendo.error ??
    avulsos.error ??
    totalEstoque.error

  if (erro) {
    return (
      <Alert>
        Não foi possível carregar o resumo da casa: {erro.message}. Verifique a
        conexão e recarregue a página.
      </Alert>
    )
  }

  const totalFaltando = faltando.count ?? 0
  const totalPerecendo = perecendo.count ?? 0
  const totalAvulsos = avulsos.count ?? 0
  const atrasadas = manutencoes.data ?? []

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Início</h1>

      {/* ------------------------------------------------------------------ */}
      {/* Números da casa                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          href="/compras"
          rotulo={totalFaltando === 1 ? 'Item acabando' : 'Itens acabando'}
          valor={totalFaltando}
          tom={totalFaltando > 0 ? 'critico' : 'ok'}
          detalhe={
            totalAvulsos > 0
              ? `+ ${totalAvulsos} avulso${totalAvulsos === 1 ? '' : 's'} na lista`
              : 'abaixo da quantidade mínima'
          }
        />

        <StatCard
          href="/manutencao"
          rotulo={atrasadas.length === 1 ? 'Manutenção atrasada' : 'Manutenções atrasadas'}
          valor={atrasadas.length}
          tom={atrasadas.length > 0 ? 'critico' : 'ok'}
          detalhe="passaram do prazo"
        />

        <StatCard
          href="/estoque"
          rotulo={totalPerecendo === 1 ? 'Alimento vencendo' : 'Alimentos vencendo'}
          valor={totalPerecendo}
          tom={totalPerecendo > 0 ? 'alerta' : 'ok'}
          detalhe={`nos próximos ${diasAviso} dias`}
        />

        <StatCard
          href="/estoque"
          rotulo={totalEstoque.count === 1 ? 'Item cadastrado' : 'Itens cadastrados'}
          valor={totalEstoque.count ?? 0}
          tom="neutro"
          detalhe="ver estoque completo"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* O que precisa de atenção agora                                      */}
      {/* ------------------------------------------------------------------ */}
      {atrasadas.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Manutenções mais críticas
          </h2>
          <ul className="space-y-2">
            {atrasadas.slice(0, LIMITE_DESTAQUE).map((item) => {
              const selo = rotuloStatusManutencao(item)
              return (
                <li key={item.id}>
                  <Link href={`/manutencao/${item.id}`}>
                    <Card className="flex items-center justify-between gap-3 border-l-4 border-l-red-500 p-3">
                      <span className="truncate font-medium text-slate-900">
                        {item.name}
                      </span>
                      <Badge tone={selo.tom}>{selo.texto}</Badge>
                    </Card>
                  </Link>
                </li>
              )
            })}
          </ul>
          {atrasadas.length > LIMITE_DESTAQUE ? (
            <Link href="/manutencao" className="text-sm font-medium text-brand-700 underline">
              Ver todas as {atrasadas.length}
            </Link>
          ) : null}
        </section>
      ) : null}

      {totalPerecendo > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Usar logo
          </h2>
          <ul className="space-y-2">
            {(perecendo.data ?? []).map((item) => (
              <li key={item.id}>
                <Link href={`/estoque/${item.id}`}>
                  <Card className="flex items-center justify-between gap-3 p-3">
                    <span className="truncate font-medium text-slate-900">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-sm text-slate-500">
                      {formatarData(item.expiration_date)}
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {totalFaltando > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Acabando
          </h2>
          <ul className="space-y-2">
            {(faltando.data ?? []).map((item) => (
              <li key={item.id}>
                <Link href={`/estoque/${item.id}`}>
                  <Card className="flex items-center justify-between gap-3 p-3">
                    <span className="truncate font-medium text-slate-900">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-sm text-slate-500">
                      {item.current_quantity} de {item.minimum_quantity} {item.unit}
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Atalhos                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-2 border-t border-slate-200 pt-5">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Atalhos
        </h2>

        <div className="space-y-2">
          <ButtonLink href="/entrada" size="lg" className="w-full">
            <IconCamera width={20} height={20} />
            Adicionar itens do mercado
          </ButtonLink>

          <ButtonLink href="/compras" variant="secondary" size="lg" className="w-full">
            <IconList width={20} height={20} />
            Ver lista de compras
          </ButtonLink>

          <ButtonLink href="/receitas" variant="secondary" size="lg" className="w-full">
            <IconChef width={20} height={20} />
            O que posso cozinhar?
          </ButtonLink>
        </div>
      </section>
    </div>
  )
}
