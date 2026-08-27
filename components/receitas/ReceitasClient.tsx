'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { adicionarFaltantes } from '@/app/(app)/compras/actions'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { IconChef, IconCheck, IconPlus } from '@/components/icons'
import { sugerirReceitas } from '@/lib/geminiClient'
import type { ReceitaIA } from '@/types/ia'

type Estado = 'inicial' | 'carregando' | 'pronto'

export function ReceitasClient({ totalAlimentos }: { totalAlimentos: number }) {
  const [estado, setEstado] = useState<Estado>('inicial')
  const [receitas, setReceitas] = useState<ReceitaIA[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [adicionadas, setAdicionadas] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

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
      const resultado = await adicionarFaltantes(receita.ingredientes_faltando)

      if (resultado.error) {
        setErro(resultado.error)
        return
      }

      setAdicionadas((atuais) => new Set(atuais).add(receita.nome_receita))
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
            <ReceitaCard key={receita.nome_receita} receita={receita} />
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
              jaAdicionada={adicionadas.has(receita.nome_receita)}
              onAdicionar={() => adicionarNaLista(receita)}
            />
          ))}
        </section>
      ) : null}

      {receitas.length > 0 ? (
        <p className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          Sugestões geradas por IA. Podem conter imprecisões de quantidade, tempo
          ou modo de preparo — não é fonte validada de culinária. Confira antes de
          seguir, principalmente em receitas com carne, ovo ou conservas.
        </p>
      ) : null}
    </div>
  )
}

function ReceitaCard({
  receita,
  jaAdicionada,
  onAdicionar,
}: {
  receita: ReceitaIA
  jaAdicionada?: boolean
  onAdicionar?: () => void
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
            Falta comprar: {receita.ingredientes_faltando.join(', ')}.
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
            <Button variant="secondary" onClick={onAdicionar}>
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
              <p className="mt-1 text-sm text-slate-600">
                {receita.ingredientes_disponiveis.join(', ')}
              </p>
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
    </Card>
  )
}
