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
import { PageHeader } from '@/components/PageHeader'
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
      <>
        <PageHeader
          titulo="Conferir o que saiu"
          subtitulo="Ajuste o que você realmente usou. Nada sai do estoque até confirmar."
        />

        <div className="space-y-4">
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
                <Card className="flex items-center gap-3 rounded-item px-4 py-3.5">
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">
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
                  <span className="w-8 shrink-0 text-sm text-ink-2">
                    {ingrediente.unidade}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {deFora.length > 0 ? (
          <p className="text-xs text-ink-2">
            Não entram na baixa por não estarem no estoque:{' '}
            {deFora.map((i) => i.nome).join(', ')}.
          </p>
        ) : null}

        <p className="text-xs text-ink-2">
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
      </>
    )
  }

  // -------------------------------------------------------------------------
  // Passo a passo
  // -------------------------------------------------------------------------
  return (
    <>
      <PageHeader titulo={sessao.name} voltar="/receitas" />

      <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
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
        <h2 className="px-1.5 text-[13px] font-semibold text-accent">
          Ingredientes
        </h2>
        <Card className="rounded-item px-4 py-3.5">
          <ul className="space-y-1 text-sm text-ink">
            {sessao.ingredients.map((ingrediente, indice) => (
              <li key={`${ingrediente.nome}-${indice}`} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{ingrediente.nome}</span>
                <span className="shrink-0 tabular-nums text-ink-2">
                  {formatarQuantidade(ingrediente.quantidade)} {ingrediente.unidade}
                  {ingrediente.stock_item_id ? '' : ' (comprar)'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="px-1.5 text-[13px] font-semibold text-accent">
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
                        ? 'flex items-start gap-3 rounded-item bg-ok-soft px-4 py-3.5'
                        : 'flex items-start gap-3 rounded-item px-4 py-3.5'
                    }
                  >
                    <span
                      className={
                        feito
                          ? 'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok text-on-fill'
                          : 'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2'
                      }
                    >
                      {feito ? <IconCheck width={14} height={14} /> : indice + 1}
                    </span>
                    <span
                      className={
                        feito ? 'text-sm text-ink-3 line-through' : 'text-sm text-ink'
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

      {/* Fica colado acima da navegação: com a receita em andamento, concluir
          precisa estar sempre a um toque de distância. */}
      <div className="glass sticky bottom-nav z-20 -mx-5 rounded-card px-5 py-3">
        {concluidos < totalPassos ? (
          <p className="mb-2 px-1.5 text-xs text-ink-2">
            Faltam {totalPassos - concluidos} passos — dá para concluir assim mesmo.
          </p>
        ) : null}
        <Button size="lg" className="w-full" onClick={() => setConferindo(true)}>
          Concluir receita
        </Button>
      </div>
      </div>
    </>
  )
}
