'use client'

import Link from 'next/link'
import { useActionState, useRef, useState, useTransition } from 'react'
import {
  adicionarAvulso,
  alternarAvulso,
  limparAvulsosConcluidos,
  removerAvulso,
  type FormState,
} from '@/app/(app)/compras/actions'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Button, ButtonLink } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Field'
import { SubmitButton } from '@/components/SubmitButton'
import { IconCamera, IconCheck, IconCopy, IconTrash } from '@/components/icons'
import { copiarTexto } from '@/lib/clipboard'
import { rotuloCategoriaEstoque } from '@/lib/constants'
import { formatarMoeda, formatarQuantidade } from '@/lib/formatters'
import {
  calcularEstimativa,
  faltaComprar,
  linhaDoAvulso,
  linhaDoEstoque,
  montarTextoDaLista,
} from '@/lib/listaCompras'
import type { ShoppingExtra, StockItem } from '@/types/domain'

const ESTADO_INICIAL: FormState = {}

type Props = {
  faltando: StockItem[]
  avulsos: ShoppingExtra[]
}

export function ComprasClient({ faltando, avulsos }: Props) {
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  // Limpa os campos assim que o item entra, para dar para emendar o próximo
  // sem tirar a mão do teclado.
  const [estadoForm, formAction] = useActionState(
    async (anterior: FormState, formData: FormData) => {
      const resultado = await adicionarAvulso(anterior, formData)
      if (!resultado.error) formRef.current?.reset()
      return resultado
    },
    ESTADO_INICIAL,
  )

  function executar(acao: () => Promise<FormState>) {
    startTransition(async () => {
      setErro(null)
      const resultado = await acao()
      if (resultado.error) setErro(resultado.error)
    })
  }

  const pendentesAvulsos = avulsos.filter((item) => !item.is_done)
  const totalPendente = faltando.length + pendentesAvulsos.length
  const temConcluidos = avulsos.some((item) => item.is_done)

  // Só o que ainda falta comprar entra na conta e no texto copiado: item já
  // marcado no carrinho não deveria aparecer na mensagem mandada para alguém.
  //
  // Sem useMemo de propósito: são dezenas de itens, e memoizar aqui só
  // adicionaria lista de dependências para manter em dia.
  const linhas = [
    ...faltando.map(linhaDoEstoque),
    ...pendentesAvulsos.map(linhaDoAvulso),
  ]
  const estimativa = calcularEstimativa(linhas)

  const [copia, setCopia] = useState<'parado' | 'copiado' | 'falhou'>('parado')
  const [textoParaSelecionar, setTextoParaSelecionar] = useState<string | null>(null)

  async function copiar() {
    const texto = montarTextoDaLista(linhas, estimativa)
    const deuCerto = await copiarTexto(texto)

    if (deuCerto) {
      setCopia('copiado')
      setTextoParaSelecionar(null)
      window.setTimeout(() => setCopia('parado'), 2500)
      return
    }

    // Sem contexto seguro e sem execCommand, resta oferecer para copiar à mão
    // em vez de fingir que deu certo.
    setCopia('falhou')
    setTextoParaSelecionar(texto)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Lista de compras</h1>
        <p className="mt-1 text-sm text-slate-500">
          {totalPendente === 0
            ? 'Nada pendente por enquanto.'
            : `${totalPendente} ${totalPendente === 1 ? 'item pendente' : 'itens pendentes'}.`}
        </p>
      </div>

      {totalPendente > 0 ? (
        <Card className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Estimativa da compra
              </p>
              <p className="text-2xl font-semibold tabular-nums text-slate-900">
                {estimativa.comPreco > 0 ? formatarMoeda(estimativa.total) : '—'}
              </p>
            </div>

            <Button variant="secondary" onClick={copiar}>
              {copia === 'copiado' ? (
                <>
                  <IconCheck width={18} height={18} />
                  Copiado
                </>
              ) : (
                <>
                  <IconCopy width={18} height={18} />
                  Copiar
                </>
              )}
            </Button>
          </div>

          {/* O que a estimativa não cobre precisa ficar visível: um total que
              ignora metade da lista em silêncio engana mais do que ajuda. */}
          <p className="text-xs text-slate-500">
            {estimativa.comPreco === 0
              ? 'Nenhum item tem preço de referência ainda. O preço é aprendido quando você registra uma compra com valor.'
              : estimativa.semPreco > 0
                ? `Baseada em ${estimativa.comPreco} de ${linhas.length} itens — ${estimativa.semPreco} ainda ${estimativa.semPreco === 1 ? 'não tem preço' : 'não têm preço'} de referência.`
                : `Baseada no último preço pago de todos os ${linhas.length} itens.`}
          </p>

          {textoParaSelecionar ? (
            <div className="space-y-1">
              <p className="text-xs text-amber-700">
                Este navegador não deixou copiar sozinho. Selecione o texto abaixo:
              </p>
              <textarea
                readOnly
                value={textoParaSelecionar}
                rows={Math.min(12, linhas.length + 5)}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-xl bg-slate-50 p-2 font-mono text-xs text-slate-700 ring-1 ring-slate-300"
              />
            </div>
          ) : null}
        </Card>
      ) : null}

      {erro ? <Alert>{erro}</Alert> : null}

      {/* ------------------------------------------------------------------ */}
      {/* Itens do estoque que furaram o mínimo                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Acabando no estoque
        </h2>

        {faltando.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum item abaixo da quantidade mínima.
          </p>
        ) : (
          <ul className="space-y-2">
            {faltando.map((item) => (
              <li key={item.id}>
                <Card className="flex items-center justify-between gap-3 p-3">
                  <Link href={`/estoque/${item.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{item.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge>{rotuloCategoriaEstoque(item.category)}</Badge>
                      <span className="text-xs text-slate-500">
                        Tem {formatarQuantidade(item.current_quantity)} {item.unit} ·
                        mínimo {formatarQuantidade(item.minimum_quantity)} {item.unit}
                        {item.last_price
                          ? ` · ${formatarMoeda(item.last_price)}/${item.unit}`
                          : ''}
                      </span>
                    </div>
                  </Link>

                  {/* O que interessa no carrinho é a diferença, não o mínimo. */}
                  <Badge tone="danger">
                    Levar {formatarQuantidade(faltaComprar(item))} {item.unit}
                  </Badge>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Compras pontuais                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Itens avulsos
        </h2>

        <form ref={formRef} action={formAction} className="flex gap-2">
          <Input
            name="name"
            required
            placeholder="Ex.: pilha AA"
            aria-label="Nome do item avulso"
            className="flex-1"
          />
          <Input
            name="quantity"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="Qtd"
            aria-label="Quantidade"
            className="w-20"
          />
          <SubmitButton pendingLabel="…">Add</SubmitButton>
        </form>

        {estadoForm.error ? <Alert>{estadoForm.error}</Alert> : null}

        {avulsos.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nada avulso na lista. Use o campo acima para uma compra pontual.
          </p>
        ) : (
          <ul className="space-y-2">
            {avulsos.map((item) => (
              <li key={item.id}>
                <Card className="flex items-center gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={item.is_done}
                    disabled={pendente}
                    onChange={(e) =>
                      executar(() => alternarAvulso(item.id, e.target.checked))
                    }
                    aria-label={`Marcar ${item.name} como comprado`}
                    className="h-5 w-5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        item.is_done
                          ? 'truncate text-slate-400 line-through'
                          : 'truncate font-medium text-slate-900'
                      }
                    >
                      {item.name}
                    </p>
                    {item.quantity ? (
                      <p className="text-xs text-slate-500">
                        {formatarQuantidade(item.quantity)} {item.unit ?? 'un'}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => executar(() => removerAvulso(item.id))}
                    disabled={pendente}
                    aria-label={`Remover ${item.name} da lista`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    <IconTrash />
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {temConcluidos ? (
          <Button
            variant="ghost"
            onClick={() => executar(limparAvulsosConcluidos)}
            disabled={pendente}
          >
            Limpar itens já comprados
          </Button>
        ) : null}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Volta do mercado                                                    */}
      {/* ------------------------------------------------------------------ */}
      {totalPendente === 0 && avulsos.length === 0 && faltando.length === 0 ? (
        <EmptyState
          title="Lista vazia"
          description="Quando algum item do estoque ficar abaixo do mínimo, ele aparece aqui automaticamente."
        />
      ) : (
        <section className="border-t border-slate-200 pt-5">
          <p className="mb-2 text-sm text-slate-600">
            Voltou do mercado? Registre o que comprou de uma vez só.
          </p>
          <ButtonLink href="/entrada" size="lg" className="w-full">
            <IconCamera width={20} height={20} />
            Concluí a compra
          </ButtonLink>
        </section>
      )}
    </div>
  )
}
