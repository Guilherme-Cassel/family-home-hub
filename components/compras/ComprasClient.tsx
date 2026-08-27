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
import { IconCamera, IconTrash } from '@/components/icons'
import { rotuloCategoriaEstoque } from '@/lib/constants'
import { formatarQuantidade } from '@/lib/formatters'
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

  const totalPendente =
    faltando.length + avulsos.filter((item) => !item.is_done).length
  const temConcluidos = avulsos.some((item) => item.is_done)

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
                      </span>
                    </div>
                  </Link>
                  <Badge tone="danger">Repor</Badge>
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
