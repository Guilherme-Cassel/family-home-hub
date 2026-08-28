'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  marcarComoFeito,
  type FormState,
} from '@/app/(app)/manutencao/actions'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Button, ButtonLink, IconButtonLink } from '@/components/Button'
import { CardGroup, Squircle } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import {
  IconCheck,
  IconChevronRight,
  IconPlus,
  IconWrench,
} from '@/components/icons'
import { rotuloCategoriaManutencao } from '@/lib/constants'
import { formatarData } from '@/lib/formatters'
import { rotuloStatusManutencao, statusDaManutencao } from '@/lib/status'
import type { MaintenanceItem, MaintenanceStatus } from '@/types/domain'

/** Cor do ícone por estado — o semáforo da tela. */
const SEMAFORO: Record<MaintenanceStatus, { fundo: string; tinta: string }> = {
  atrasado: { fundo: 'bg-danger-soft', tinta: 'text-danger' },
  perto_do_vencimento: { fundo: 'bg-warn-soft', tinta: 'text-warn' },
  em_dia: { fundo: 'bg-ok-soft', tinta: 'text-ok' },
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
    <>
      <PageHeader
        titulo="Manutenção"
        subtitulo={
          atrasados > 0
            ? `${atrasados} ${atrasados === 1 ? 'atrasada' : 'atrasadas'} de ${itens.length}`
            : `${itens.length} ${itens.length === 1 ? 'item acompanhado' : 'itens acompanhados'}`
        }
        acao={
          <IconButtonLink
            href="/manutencao/novo"
            aria-label="Cadastrar nova manutenção"
          >
            <IconPlus />
          </IconButtonLink>
        }
      />

      <div className="space-y-4">
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
        <CardGroup>
          <ul>
            {itens.map((item) => {
              const status = statusDaManutencao(item)
              const selo = rotuloStatusManutencao(item)
              const categoria = rotuloCategoriaManutencao(item.category)

              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3.5 border-b border-line px-4 py-3.5 last:border-0"
                >
                  {/* O semáforo da tela: em vez da faixa lateral, o ícone
                      carrega a cor do estado — é como a One UI sinaliza. */}
                  <Squircle cor={SEMAFORO[status].fundo} tinta={SEMAFORO[status].tinta}>
                    <IconWrench width={20} height={20} />
                  </Squircle>

                  <Link
                    href={`/manutencao/${item.id}`}
                    className="min-w-0 flex-1 rounded-item"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold tracking-[-0.01em] text-ink">
                        {item.name}
                      </span>
                      <IconChevronRight
                        width={16}
                        height={16}
                        className="shrink-0 text-ink-3"
                      />
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={selo.tom}>{selo.texto}</Badge>
                      {categoria ? <Badge>{categoria}</Badge> : null}
                    </div>

                    <p className="mt-1.5 text-xs text-ink-2">
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
                </li>
              )
            })}
          </ul>
        </CardGroup>
      )}
      </div>
    </>
  )
}
