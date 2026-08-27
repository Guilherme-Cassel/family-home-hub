'use client'

import { useState, useTransition } from 'react'
import {
  alternarPasso,
  concluirReceita,
  type Consumo,
  type FormState,
} from '@/app/(app)/receitas/actions'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Field'
import { IconCheck } from '@/components/icons'
import { formatarQuantidade } from '@/lib/formatters'
import type { ReceitaEmAndamento } from '@/types/domain'

type Props = { sessao: ReceitaEmAndamento }

export function ReceitaEmAndamentoClient({ sessao }: Props) {
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()
  const [conferindo, setConferindo] = useState(false)

  // Só ingredientes vinculados ao estoque podem virar baixa. O que foi
  // comprado na hora e nunca cadastrado não tem de onde sair.
  const doEstoque = sessao.ingredients.filter((i) => i.stock_item_id)
  const deFora = sessao.ingredients.filter((i) => !i.stock_item_id)

  const [quantidades, setQuantidades] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      doEstoque.map((i) => [i.stock_item_id as string, String(i.quantidade)]),
    ),
  )

  const feitos = new Set(sessao.done_steps)
  const totalPassos = sessao.steps.length
  const concluidos = sessao.steps.filter((_, i) => feitos.has(i)).length

  function executar(acao: () => Promise<FormState>) {
    startTransition(async () => {
      setErro(null)
      const resultado = await acao()
      if (resultado?.error) setErro(resultado.error)
    })
  }

  function confirmar() {
    const consumos: Consumo[] = doEstoque.map((i) => ({
      stock_item_id: i.stock_item_id,
      quantidade: Number((quantidades[i.stock_item_id as string] ?? '0').replace(',', '.')),
    }))

    if (consumos.some((c) => !Number.isFinite(c.quantidade) || c.quantidade < 0)) {
      setErro('Há quantidades inválidas. Use números, sem letras.')
      return
    }

    executar(() => concluirReceita(sessao.id, consumos))
  }

  // -------------------------------------------------------------------------
  // Conferência antes da baixa
  // -------------------------------------------------------------------------
  if (conferindo) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Conferir o que saiu</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ajuste o que você realmente usou. Nada sai do estoque até confirmar.
          </p>
        </div>

        {erro ? <Alert>{erro}</Alert> : null}

        {doEstoque.length === 0 ? (
          <Alert tone="info">
            Nenhum ingrediente desta receita está vinculado ao seu estoque, então
            não há baixa a fazer. Concluir apenas encerra a receita.
          </Alert>
        ) : (
          <ul className="space-y-2">
            {doEstoque.map((ingrediente) => (
              <li key={ingrediente.stock_item_id}>
                <Card className="flex items-center gap-3 p-3">
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-900">
                    {ingrediente.nome}
                  </span>

                  <Input
                    value={quantidades[ingrediente.stock_item_id as string] ?? ''}
                    onChange={(e) =>
                      setQuantidades((atuais) => ({
                        ...atuais,
                        [ingrediente.stock_item_id as string]: e.target.value,
                      }))
                    }
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    aria-label={`Quantidade usada de ${ingrediente.nome}`}
                    className="w-24 shrink-0"
                  />
                  <span className="w-8 shrink-0 text-sm text-slate-500">
                    {ingrediente.unidade}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {deFora.length > 0 ? (
          <p className="text-xs text-slate-500">
            Não entram na baixa por não estarem no estoque:{' '}
            {deFora.map((i) => i.nome).join(', ')}.
          </p>
        ) : null}

        <p className="text-xs text-slate-500">
          As quantidades foram estimadas por IA — vale conferir antes de tirar do
          estoque.
        </p>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => setConferindo(false)}
            disabled={pendente}
          >
            Voltar
          </Button>
          <Button size="lg" className="flex-1" onClick={confirmar} disabled={pendente}>
            {pendente ? 'Concluindo…' : 'Confirmar e dar baixa'}
          </Button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Passo a passo
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{sessao.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {sessao.prep_minutes ? <Badge>{sessao.prep_minutes} min</Badge> : null}
          {sessao.servings ? (
            <Badge>
              {sessao.servings} {sessao.servings === 1 ? 'porção' : 'porções'}
            </Badge>
          ) : null}
          <Badge tone={concluidos === totalPassos ? 'success' : 'info'}>
            {concluidos} de {totalPassos} passos
          </Badge>
        </div>
      </div>

      {erro ? <Alert>{erro}</Alert> : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Ingredientes
        </h2>
        <Card className="p-3">
          <ul className="space-y-1 text-sm text-slate-700">
            {sessao.ingredients.map((ingrediente, indice) => (
              <li key={`${ingrediente.nome}-${indice}`} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{ingrediente.nome}</span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {formatarQuantidade(ingrediente.quantidade)} {ingrediente.unidade}
                  {ingrediente.stock_item_id ? '' : ' (comprar)'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Preparo
        </h2>

        <ul className="space-y-2">
          {sessao.steps.map((passo, indice) => {
            const feito = feitos.has(indice)

            return (
              <li key={indice}>
                {/* O passo inteiro é o alvo de toque: com a mão suja de massa,
                    acertar uma caixinha de 20px é pedir demais. */}
                <button
                  type="button"
                  onClick={() =>
                    executar(() => alternarPasso(sessao.id, indice, !feito))
                  }
                  disabled={pendente}
                  aria-pressed={feito}
                  className="w-full text-left"
                >
                  <Card
                    className={
                      feito
                        ? 'flex items-start gap-3 border-l-4 border-l-emerald-500 bg-emerald-50/40 p-3'
                        : 'flex items-start gap-3 border-l-4 border-l-slate-200 p-3'
                    }
                  >
                    <span
                      className={
                        feito
                          ? 'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white'
                          : 'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600'
                      }
                    >
                      {feito ? <IconCheck width={14} height={14} /> : indice + 1}
                    </span>
                    <span
                      className={
                        feito ? 'text-sm text-slate-400 line-through' : 'text-sm text-slate-700'
                      }
                    >
                      {passo}
                    </span>
                  </Card>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="safe-bottom sticky bottom-nav z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        {concluidos < totalPassos ? (
          <p className="mb-2 text-xs text-slate-500">
            Faltam {totalPassos - concluidos} passos — dá para concluir assim mesmo.
          </p>
        ) : null}
        <Button size="lg" className="w-full" onClick={() => setConferindo(true)}>
          Concluir receita
        </Button>
      </div>
    </div>
  )
}
