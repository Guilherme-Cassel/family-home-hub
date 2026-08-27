'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { adicionarFaltantes } from '@/app/(app)/compras/actions'
import { iniciarReceita } from '@/app/(app)/receitas/actions'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { IconCheck, IconChef, IconChevronRight, IconPlus } from '@/components/icons'
import { formatarQuantidade } from '@/lib/formatters'
import { sugerirReceitas } from '@/lib/geminiClient'
import type { ReceitaEmAndamento } from '@/types/domain'
import type { IngredienteIA, ReceitaIA } from '@/types/ia'

type Estado = 'inicial' | 'carregando' | 'pronto'

/** O mínimo que a listagem precisa saber de uma receita em andamento. */
export type ResumoEmAndamento = Pick<
  ReceitaEmAndamento,
  'id' | 'name' | 'done_steps'
> & { total_steps: number }

type Props = {
  totalAlimentos: number
  emAndamento: ResumoEmAndamento[]
}

/** "0,4 kg de Manteiga" */
function descreverIngrediente(i: IngredienteIA): string {
  if (!i.quantidade) return i.nome
  return `${formatarQuantidade(i.quantidade)} ${i.unidade} de ${i.nome}`
}

export function ReceitasClient({ totalAlimentos, emAndamento }: Props) {
  const [estado, setEstado] = useState<Estado>('inicial')
  const [receitas, setReceitas] = useState<ReceitaIA[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [adicionadas, setAdicionadas] = useState<Set<string>>(new Set())
  const [pendente, startTransition] = useTransition()

  async function buscar() {
    setEstado('carregando')
    setErro(null)
    setAviso(null)

    try {
      // Só acontece neste clique: nunca em carregamento de tela nem em fundo,
      // para não queimar a cota diária sem o usuário pedir.
      const resposta = await sugerirReceitas()
      setReceitas(resposta.receitas)
      setAviso(resposta.aviso ?? null)
      setEstado('pronto')
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'A IA não conseguiu responder.')
      setEstado('inicial')
    }
  }

  function adicionarNaLista(receita: ReceitaIA) {
    startTransition(async () => {
      setErro(null)
      const resultado = await adicionarFaltantes(
        receita.ingredientes_faltando.map((i) => ({
          nome: i.nome,
          quantidade: i.quantidade,
          unidade: i.unidade,
        })),
      )

      if (resultado.error) {
        setErro(resultado.error)
        return
      }

      setAdicionadas((atuais) => new Set(atuais).add(receita.nome_receita))
    })
  }

  function comecar(receita: ReceitaIA) {
    startTransition(async () => {
      setErro(null)
      const resultado = await iniciarReceita(receita)
      if (resultado?.error) setErro(resultado.error)
    })
  }

  const completas = receitas.filter((r) => r.ingredientes_faltando.length === 0)
  const quaseLa = receitas.filter(
    (r) => r.ingredientes_faltando.length > 0 && r.ingredientes_faltando.length <= 2,
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">O que posso cozinhar?</h1>
        <p className="mt-1 text-sm text-slate-500">
          A partir dos {totalAlimentos}{' '}
          {totalAlimentos === 1 ? 'alimento cadastrado' : 'alimentos cadastrados'},
          priorizando o que está perto de vencer.
        </p>
      </div>

      {erro ? <Alert>{erro}</Alert> : null}
      {aviso ? <Alert tone="info">{aviso}</Alert> : null}

      {/* ------------------------------------------------------------------ */}
      {/* Receitas já em andamento, para retomar de onde parou               */}
      {/* ------------------------------------------------------------------ */}
      {emAndamento.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Na cozinha agora
          </h2>
          {emAndamento.map((sessao) => (
            <Link key={sessao.id} href={`/receitas/${sessao.id}`}>
              <Card className="flex items-center gap-3 border-l-4 border-l-brand-500 p-3 transition-colors hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{sessao.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {sessao.done_steps.length} de {sessao.total_steps} passos
                  </p>
                </div>
                <IconChevronRight className="shrink-0 text-slate-400" />
              </Card>
            </Link>
          ))}
        </section>
      ) : null}

      <Button
        size="lg"
        className="w-full"
        onClick={buscar}
        disabled={estado === 'carregando'}
      >
        <IconChef width={20} height={20} />
        {estado === 'carregando'
          ? 'Pensando…'
          : estado === 'pronto'
            ? 'Sugerir outras receitas'
            : 'Sugerir receitas'}
      </Button>

      {estado === 'inicial' && receitas.length === 0 ? (
        <EmptyState
          title="Nenhuma sugestão ainda"
          description="Toque no botão acima. A consulta à IA só acontece quando você pede."
        />
      ) : null}

      {estado === 'pronto' && receitas.length === 0 && !aviso ? (
        <EmptyState
          title="A IA não sugeriu nada desta vez"
          description="Tente de novo, ou cadastre mais alimentos no estoque."
        />
      ) : null}

      {completas.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Dá para fazer agora
          </h2>
          {completas.map((receita) => (
            <ReceitaCard
              key={receita.nome_receita}
              receita={receita}
              pendente={pendente}
              onIniciar={() => comecar(receita)}
            />
          ))}
        </section>
      ) : null}

      {quaseLa.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Faltando pouco
          </h2>
          {quaseLa.map((receita) => (
            <ReceitaCard
              key={receita.nome_receita}
              receita={receita}
              pendente={pendente}
              jaAdicionada={adicionadas.has(receita.nome_receita)}
              onAdicionar={() => adicionarNaLista(receita)}
              onIniciar={() => comecar(receita)}
            />
          ))}
        </section>
      ) : null}

      {receitas.length > 0 ? (
        <p className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          Sugestões e quantidades geradas por IA. Podem conter imprecisões — não é
          fonte validada de culinária. Confira antes de seguir, principalmente em
          receitas com carne, ovo ou conservas.
        </p>
      ) : null}
    </div>
  )
}

function ReceitaCard({
  receita,
  pendente,
  jaAdicionada,
  onAdicionar,
  onIniciar,
}: {
  receita: ReceitaIA
  pendente: boolean
  jaAdicionada?: boolean
  onAdicionar?: () => void
  onIniciar: () => void
}) {
  const [aberta, setAberta] = useState(false)

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h3 className="font-semibold text-slate-900">{receita.nome_receita}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {receita.tempo_preparo_minutos > 0 ? (
            <Badge>{receita.tempo_preparo_minutos} min</Badge>
          ) : null}
          {receita.porcoes > 0 ? (
            <Badge>
              {receita.porcoes} {receita.porcoes === 1 ? 'porção' : 'porções'}
            </Badge>
          ) : null}
          {receita.ingredientes_faltando.length === 0 ? (
            <Badge tone="success">Tem tudo</Badge>
          ) : (
            <Badge tone="warning">
              Falta{receita.ingredientes_faltando.length === 1 ? '' : 'm'}{' '}
              {receita.ingredientes_faltando.length}
            </Badge>
          )}
        </div>
      </div>

      {receita.ingredientes_faltando.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Falta comprar:{' '}
            {receita.ingredientes_faltando.map(descreverIngrediente).join(', ')}.
          </p>

          {jaAdicionada ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <IconCheck width={16} height={16} />
              Na lista de compras.{' '}
              <Link href="/compras" className="underline">
                Ver lista
              </Link>
            </p>
          ) : (
            <Button variant="secondary" onClick={onAdicionar} disabled={pendente}>
              <IconPlus width={18} height={18} />
              Adicionar à lista de compras
            </Button>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="text-sm font-medium text-brand-700 underline"
      >
        {aberta ? 'Esconder o preparo' : 'Ver o preparo'}
      </button>

      {aberta ? (
        <div className="space-y-3 border-t border-slate-200 pt-3">
          {receita.ingredientes_disponiveis.length > 0 ? (
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Usa do seu estoque
              </p>
              <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
                {receita.ingredientes_disponiveis.map((i, indice) => (
                  <li key={`${i.nome}-${indice}`}>{descreverIngrediente(i)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Modo de preparo
            </p>
            <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
              {receita.modo_preparo.map((passo, indice) => (
                <li key={indice}>{passo}</li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}

      <Button className="w-full" onClick={onIniciar} disabled={pendente}>
        <IconChef width={18} height={18} />
        Iniciar receita
      </Button>
    </Card>
  )
}
