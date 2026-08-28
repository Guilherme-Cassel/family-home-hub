import Link from 'next/link'
import { Alert } from '@/components/Alert'
import { ButtonLink } from '@/components/Button'
import { CardGroup, SectionLabel, Squircle } from '@/components/Card'
import { LogoutButton } from '@/components/LogoutButton'
import { NowBar, type AtividadeAgora } from '@/components/NowBar'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import {
  IconBox,
  IconCamera,
  IconCart,
  IconChef,
  IconChevronRight,
  IconList,
  IconWrench,
} from '@/components/icons'
import { CATEGORIA_ALIMENTO } from '@/lib/constants'
import { FUSO_DA_CASA, hojeIso, somarDias } from '@/lib/datas'
import { formatarData } from '@/lib/formatters'
import { getDiasAvisoValidade, getNomeDoUsuario } from '@/lib/queries'
import { rotuloStatusManutencao } from '@/lib/status'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/auth'

export const metadata = { title: 'Início · Casa em Ordem' }

/** Quantos itens críticos listar por bloco antes de virar só um número. */
const LIMITE_DESTAQUE = 3

/** "Quinta-feira, 27 de agosto" */
function saudacaoDoDia() {
  const texto = new Date().toLocaleDateString('pt-BR', {
    timeZone: FUSO_DA_CASA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { user } = await requireUser()

  const [nome, diasAviso] = await Promise.all([
    getNomeDoUsuario(user.id, user.email?.split('@')[0] ?? 'você'),
    getDiasAvisoValidade(),
  ])

  const hoje = hojeIso()
  const limiteValidade = somarDias(hoje, diasAviso)

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
      .lte('expiration_date', limiteValidade)
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
      <>
        <PageHeader titulo="Início" acao={<LogoutButton />} />
        <Alert>
          Não foi possível carregar o resumo da casa: {erro.message}. Verifique a
          conexão e recarregue a página.
        </Alert>
      </>
    )
  }

  const totalFaltando = faltando.count ?? 0
  const totalPerecendo = perecendo.count ?? 0
  const totalAvulsos = avulsos.count ?? 0
  const atrasadas = manutencoes.data ?? []
  const proximoAVencer = perecendo.data?.[0]

  // A Now Bar só carrega o que é urgente de verdade, na ordem em que importa.
  const atividades: AtividadeAgora[] = []

  if (atrasadas.length > 0) {
    atividades.push({
      id: 'manutencao',
      titulo:
        atrasadas.length === 1
          ? '1 manutenção atrasada'
          : `${atrasadas.length} manutenções atrasadas`,
      detalhe: rotuloStatusManutencao(atrasadas[0]).texto.toLowerCase(),
      href: '/manutencao',
      acao: 'Ver',
      tom: 'critico',
      icone: 'manutencao',
    })
  }

  if (proximoAVencer) {
    atividades.push({
      id: 'validade',
      titulo: `${proximoAVencer.name} vence em ${formatarData(proximoAVencer.expiration_date)}`,
      detalhe:
        totalPerecendo === 1
          ? 'único alimento perto da validade'
          : `mais ${totalPerecendo - 1} ${totalPerecendo === 2 ? 'alimento' : 'alimentos'} nos próximos ${diasAviso} dias`,
      href: '/receitas',
      acao: 'Usar',
      tom: 'alerta',
      icone: 'estoque',
    })
  }

  return (
    <>
      <PageHeader
        titulo="Início"
        subtitulo={`${saudacaoDoDia()} · Olá, ${nome}`}
        acao={<LogoutButton />}
      />

      {/* Espaço extra embaixo porque a Now Bar flutua sobre o conteúdo. */}
      <div className={atividades.length > 0 ? 'space-y-7 pb-16' : 'space-y-7'}>
        {/* ---------------------------------------------------------------- */}
        {/* Números da casa                                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            href="/compras"
            rotulo={totalFaltando === 1 ? 'Item acabando' : 'Itens acabando'}
            valor={totalFaltando}
            tom={totalFaltando > 0 ? 'critico' : 'ok'}
            icone={<IconCart width={17} height={17} />}
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
            icone={<IconWrench width={17} height={17} />}
            detalhe="passaram do prazo"
          />

          <StatCard
            href="/estoque"
            rotulo={totalPerecendo === 1 ? 'Alimento vencendo' : 'Alimentos vencendo'}
            valor={totalPerecendo}
            tom={totalPerecendo > 0 ? 'alerta' : 'ok'}
            icone={<IconChef width={17} height={17} />}
            detalhe={`nos próximos ${diasAviso} dias`}
          />

          <StatCard
            href="/estoque"
            rotulo={totalEstoque.count === 1 ? 'Item cadastrado' : 'Itens cadastrados'}
            valor={totalEstoque.count ?? 0}
            tom="neutro"
            icone={<IconBox width={17} height={17} />}
            detalhe="ver estoque completo"
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* O que precisa de atenção agora                                    */}
        {/* ---------------------------------------------------------------- */}
        {atrasadas.length > 0 ? (
          <section>
            <SectionLabel>Precisa de atenção</SectionLabel>
            <CardGroup>
              <ul>
                {atrasadas.slice(0, LIMITE_DESTAQUE).map((item) => {
                  const selo = rotuloStatusManutencao(item)
                  return (
                    <li key={item.id} className="border-b border-line last:border-0">
                      <LinhaResumo
                        href={`/manutencao/${item.id}`}
                        titulo={item.name}
                        sub={selo.texto}
                        fundo="bg-danger-soft"
                        tinta="text-danger"
                        icone={<IconWrench width={20} height={20} />}
                      />
                    </li>
                  )
                })}
              </ul>
            </CardGroup>

            {atrasadas.length > LIMITE_DESTAQUE ? (
              <Link
                href="/manutencao"
                className="mt-3 inline-block px-1.5 text-sm font-semibold text-accent"
              >
                Ver todas as {atrasadas.length}
              </Link>
            ) : null}
          </section>
        ) : null}

        {totalPerecendo > 0 ? (
          <section>
            <SectionLabel>Usar logo</SectionLabel>
            <CardGroup>
              <ul>
                {(perecendo.data ?? []).map((item) => (
                  <li key={item.id} className="border-b border-line last:border-0">
                    <LinhaResumo
                      href={`/estoque/${item.id}`}
                      titulo={item.name}
                      meta={formatarData(item.expiration_date)}
                      fundo="bg-warn-soft"
                      tinta="text-warn"
                      icone={<IconBox width={20} height={20} />}
                    />
                  </li>
                ))}
              </ul>
            </CardGroup>
          </section>
        ) : null}

        {totalFaltando > 0 ? (
          <section>
            <SectionLabel>Acabando</SectionLabel>
            <CardGroup>
              <ul>
                {(faltando.data ?? []).map((item) => (
                  <li key={item.id} className="border-b border-line last:border-0">
                    <LinhaResumo
                      href={`/estoque/${item.id}`}
                      titulo={item.name}
                      meta={`${item.current_quantity} de ${item.minimum_quantity} ${item.unit}`}
                      fundo="bg-ok-soft"
                      tinta="text-ok"
                      icone={<IconCart width={20} height={20} />}
                    />
                  </li>
                ))}
              </ul>
            </CardGroup>
          </section>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Atalhos                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <SectionLabel>Atalhos</SectionLabel>
          <CardGroup>
            <ul>
              <li className="border-b border-line">
                <LinhaResumo
                  href="/entrada"
                  titulo="Adicionar itens do mercado"
                  sub="Foto da nota ou das sacolas"
                  fundo="bg-accent"
                  icone={<IconCamera width={20} height={20} />}
                />
              </li>
              <li className="border-b border-line">
                <LinhaResumo
                  href="/compras"
                  titulo="Lista de compras"
                  sub={
                    totalFaltando + totalAvulsos === 0
                      ? 'nada pendente'
                      : `${totalFaltando + totalAvulsos} ${totalFaltando + totalAvulsos === 1 ? 'item pendente' : 'itens pendentes'}`
                  }
                  fundo="bg-violet"
                  icone={<IconList width={20} height={20} />}
                />
              </li>
              <li>
                <LinhaResumo
                  href="/receitas"
                  titulo="O que posso cozinhar?"
                  sub="Sugestões com o que tem em casa"
                  fundo="bg-ok"
                  icone={<IconChef width={20} height={20} />}
                />
              </li>
            </ul>
          </CardGroup>

          <div className="mt-4">
            <ButtonLink href="/entrada" size="lg" className="w-full">
              <IconCamera width={19} height={19} />
              Adicionar itens agora
            </ButtonLink>
          </div>
        </section>
      </div>

      <NowBar atividades={atividades} />
    </>
  )
}

/* -------------------------------------------------------------------------- */

type LinhaProps = {
  href: string
  titulo: string
  sub?: string
  meta?: string
  fundo: string
  tinta?: string
  icone: React.ReactNode
}

/** Linha de lista no padrão dos Ajustes do Galaxy. */
function LinhaResumo({
  href,
  titulo,
  sub,
  meta,
  fundo,
  tinta,
  icone,
}: LinhaProps) {
  return (
    <Link
      href={href}
      className="press flex w-full items-center gap-3.5 px-[18px] py-3.5 transition-colors hover:bg-surface-2"
    >
      <Squircle cor={fundo} tinta={tinta}>
        {icone}
      </Squircle>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold tracking-[-0.01em] text-ink">
          {titulo}
        </span>
        {sub ? (
          <span className="mt-0.5 block truncate text-[13.5px] text-ink-2">
            {sub}
          </span>
        ) : null}
      </span>

      {meta ? (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-2">
          {meta}
        </span>
      ) : (
        <IconChevronRight width={18} height={18} className="shrink-0 text-ink-3" />
      )}
    </Link>
  )
}

