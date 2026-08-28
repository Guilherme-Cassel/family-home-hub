'use client'

import { useActionState, useState } from 'react'
import {
  atualizarManutencao,
  criarManutencao,
  type FormState,
} from '@/app/(app)/manutencao/actions'
import { Alert } from '@/components/Alert'
import { ButtonLink } from '@/components/Button'
import { Field, Input, Select, Textarea } from '@/components/Field'
import { SubmitButton } from '@/components/SubmitButton'
import { CATEGORIAS_MANUTENCAO } from '@/lib/constants'
import { hojeIso } from '@/lib/datas'
import type { MaintenanceItem } from '@/types/domain'

const ESTADO_INICIAL: FormState = {}

/** Atalhos para as frequências mais comuns de manutenção doméstica. */
const FREQUENCIAS_SUGERIDAS = [
  { dias: 30, rotulo: 'Mensal' },
  { dias: 90, rotulo: 'Trimestral' },
  { dias: 180, rotulo: 'Semestral' },
  { dias: 365, rotulo: 'Anual' },
]

export function MaintenanceItemForm({ item }: { item?: MaintenanceItem }) {
  const editando = Boolean(item)
  const [frequencia, setFrequencia] = useState(String(item?.frequency_days ?? 90))
  const [state, formAction] = useActionState(
    editando ? atualizarManutencao : criarManutencao,
    ESTADO_INICIAL,
  )

  return (
    <form action={formAction} className="space-y-4">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <Field label="O que precisa de manutenção?" htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          defaultValue={item?.name}
          placeholder="Filtro do ar-condicionado"
          autoFocus={!editando}
        />
      </Field>

      <Field label="Categoria" htmlFor="category">
        <Select id="category" name="category" defaultValue={item?.category ?? ''}>
          <option value="">Sem categoria</option>
          {CATEGORIAS_MANUTENCAO.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.rotulo}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="A cada quantos dias?"
        htmlFor="frequency_days"
        hint={
          <span className="flex flex-wrap gap-1.5">
            {FREQUENCIAS_SUGERIDAS.map((f) => (
              <button
                key={f.dias}
                type="button"
                onClick={() => setFrequencia(String(f.dias))}
                aria-pressed={frequencia === String(f.dias)}
                className={
                  frequencia === String(f.dias)
                    ? 'rounded-full bg-accent-soft px-2 py-1 text-xs font-medium text-accent'
                    : 'rounded-full bg-surface-2 px-2 py-1 text-xs font-medium text-ink-2 hover:brightness-95'
                }
              >
                {f.rotulo}
              </button>
            ))}
          </span>
        }
      >
        <Input
          id="frequency_days"
          name="frequency_days"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          required
          value={frequencia}
          onChange={(e) => setFrequencia(e.target.value)}
        />
      </Field>

      <Field
        label="Feita pela última vez em"
        htmlFor="last_done_date"
        hint="É a partir daqui que o próximo vencimento é calculado."
      >
        <Input
          id="last_done_date"
          name="last_done_date"
          type="date"
          defaultValue={item?.last_done_date ?? hojeIso()}
        />
      </Field>

      <Field label="Observações" htmlFor="notes" hint="Opcional.">
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={item?.notes ?? ''}
          placeholder="Modelo do filtro, onde comprar, quem costuma fazer…"
        />
      </Field>

      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex gap-3 pt-1">
        <ButtonLink href="/manutencao" variant="secondary" size="lg" className="flex-1">
          Cancelar
        </ButtonLink>
        <SubmitButton size="lg" className="flex-1">
          {editando ? 'Salvar' : 'Cadastrar'}
        </SubmitButton>
      </div>
    </form>
  )
}
