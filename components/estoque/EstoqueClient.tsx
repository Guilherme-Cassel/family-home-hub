'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { ButtonLink } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Input, Select } from '@/components/Field'
import { IconChevronRight, IconPlus, IconSearch } from '@/components/icons'
import { QuantityStepper } from './QuantityStepper'
import { CATEGORIAS_ESTOQUE, rotuloCategoriaEstoque } from '@/lib/constants'
import { formatarData } from '@/lib/formatters'
import { rotuloStatusEstoque, statusDoItem } from '@/lib/status'
import { normalizar } from '@/lib/texto'
import type { StockItem } from '@/types/domain'

type Props = {
  itens: StockItem[]
  diasAvisoValidade: number
}

export function EstoqueClient({ itens, diasAvisoValidade }: Props) {
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  // A casa tem dezenas de itens, não milhares: filtrar no cliente evita um
  // round-trip por tecla digitada no celular.
  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim())

    return itens.filter((item) => {
      if (categoria && item.category !== categoria) return false
      if (!termo) return true
      return normalizar(item.name).includes(termo)
    })
  }, [itens, busca, categoria])

  const categoriasPresentes = useMemo(() => {
    const usadas = new Set(itens.map((item) => item.category))
    return CATEGORIAS_ESTOQUE.filter((c) => usadas.has(c.valor))
  }, [itens])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Estoque</h1>
        <ButtonLink href="/estoque/novo" size="md">
          <IconPlus width={18} height={18} />
          Novo item
        </ButtonLink>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <IconSearch
            width={18}
            height={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar item…"
            aria-label="Buscar item pelo nome"
            className="pl-10"
            type="search"
          />
        </div>

        {categoriasPresentes.length > 1 ? (
          <Select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categoriasPresentes.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {erro ? <Alert>{erro}</Alert> : null}

      {itens.length === 0 ? (
        <EmptyState
          title="Nenhum item cadastrado ainda"
          description="Cadastre o que costuma ter em casa para o app avisar quando estiver acabando."
          action={<ButtonLink href="/estoque/novo">Cadastrar primeiro item</ButtonLink>}
        />
      ) : filtrados.length === 0 ? (
        <EmptyState
          title="Nada encontrado"
          description="Tente outro termo de busca ou troque a categoria."
        />
      ) : (
        <ul className="space-y-2">
          {filtrados.map((item) => {
            const status = statusDoItem(item, diasAvisoValidade)
            const selo = rotuloStatusEstoque(item, status)

            return (
              <li key={item.id}>
                <Card className="flex items-center gap-3 p-3">
                  <Link
                    href={`/estoque/${item.id}`}
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
                      <Badge>{rotuloCategoriaEstoque(item.category)}</Badge>
                      {selo ? <Badge tone={selo.tom}>{selo.texto}</Badge> : null}
                      {item.expiration_date && status === 'ok' ? (
                        <span className="text-xs text-slate-500">
                          Val. {formatarData(item.expiration_date)}
                        </span>
                      ) : null}
                    </div>
                  </Link>

                  <QuantityStepper
                    itemId={item.id}
                    quantidade={item.current_quantity}
                    unidade={item.unit}
                    onErro={setErro}
                  />
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
