'use client'

import { cn } from '@/lib/cn'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  marcarComoFeito,
  type FormState,
} from '@/app/(app)/manutencao/actions'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Button, ButtonLink } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { IconCheck, IconChevronRight, IconPlus } from '@/components/icons'
import { rotuloCategoriaManutencao } from '@/lib/constants'
import { formatarData } from '@/lib/formatters'
import { rotuloStatusManutencao, statusDaManutencao } from '@/lib/status'
import type { MaintenanceItem, MaintenanceStatus } from '@/types/domain'

/** Faixa colorida na lateral do card — o semáforo da tela. */
const FAIXA: Record<MaintenanceStatus, string> = {
  atrasado: 'border-l-4 border-l-red-500',
  perto_do_vencimento: 'border-l-4 border-l-amber-400',
  em_dia: 'border-l-4 border-l-emerald-500',
}

export function ManutencaoClient({ itens }: { itens: MaintenanceItem[] }) {
  const [erro, setErro] = useState<string | null>(null)
  const [emAndamento, setEmAndamento] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function concluir(item: MaintenanceItem) {
    startTransition(async () => {
      setErro(null)
      setEmAndamento(item.id)

      const resultado: FormState = await marcarComoFeito(item.id)
      if (resultado.error) setErro(resultado.error)

      setEmAndamento(null)
    })
  }

  const atrasados = itens.filter((i) => statusDaManutencao(i) === 'atrasado').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Manutenção</h1>
        <ButtonLink href="/manutencao/novo">
          <IconPlus width={18} height={18} />
          Novo
        </ButtonLink>
      </div>

      {atrasados > 0 ? (
        <Alert tone="warning">
          {atrasados === 1
            ? '1 manutenção atrasada.'
            : `${atrasados} manutenções atrasadas.`}
        </Alert>
      ) : null}

      {erro ? <Alert>{erro}</Alert> : null}

      {itens.length === 0 ? (
        <EmptyState
          title="Nenhum item de manutenção"
          description="Cadastre o que precisa de cuidado periódico: filtro do ar, extintor, troca de óleo, limpeza da caixa d'água."
          action={<ButtonLink href="/manutencao/novo">Cadastrar primeiro item</ButtonLink>}
        />
      ) : (
        <ul className="space-y-2">
          {itens.map((item) => {
            const status = statusDaManutencao(item)
            const selo = rotuloStatusManutencao(item)
            const categoria = rotuloCategoriaManutencao(item.category)

            return (
              <li key={item.id}>
                <Card className={cn('p-0', FAIXA[status])}>
                  <div className="flex items-center gap-3 p-3">
                    <Link
                      href={`/manutencao/${item.id}`}
                      className="min-w-0 flex-1 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-slate-900">
                          {item.name}
                        </span>
                        <IconChevronRight
                          width={16}
                          height={16}
                          className="shrink-0 text-slate-400"
                        />
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone={selo.tom}>{selo.texto}</Badge>
                        {categoria ? <Badge>{categoria}</Badge> : null}
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        A cada {item.frequency_days} dias · última vez em{' '}
                        {formatarData(item.last_done_date)}
                      </p>
                    </Link>

                    <Button
                      variant={status === 'em_dia' ? 'secondary' : 'primary'}
                      size="icon"
                      onClick={() => concluir(item)}
                      disabled={emAndamento === item.id}
                      title="Marcar como feito hoje"
                      aria-label={`Marcar ${item.name} como feito hoje`}
                    >
                      <IconCheck />
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
