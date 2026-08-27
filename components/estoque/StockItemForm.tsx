'use client'

import { useActionState } from 'react'
import {
  atualizarItem,
  criarItem,
  type FormState,
} from '@/app/(app)/estoque/actions'
import { Alert } from '@/components/Alert'
import { ButtonLink } from '@/components/Button'
import { Field, Input, Select, Textarea } from '@/components/Field'
import { SubmitButton } from '@/components/SubmitButton'
import { CATEGORIAS_ESTOQUE, UNIDADES } from '@/lib/constants'
import type { StockItem } from '@/types/domain'

const ESTADO_INICIAL: FormState = {}

/** Formulário compartilhado entre criar e editar item de estoque. */
export function StockItemForm({ item }: { item?: StockItem }) {
  const editando = Boolean(item)
  const [state, formAction] = useActionState(
    editando ? atualizarItem : criarItem,
    ESTADO_INICIAL,
  )

  return (
    <form action={formAction} className="space-y-4">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <Field label="Nome" htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          defaultValue={item?.name}
          placeholder="Arroz branco"
          autoFocus={!editando}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria" htmlFor="category">
          <Select id="category" name="category" defaultValue={item?.category ?? 'outros'}>
            {CATEGORIAS_ESTOQUE.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Unidade" htmlFor="unit">
          <Select id="unit" name="unit" defaultValue={item?.unit ?? 'un'}>
            {UNIDADES.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.rotulo}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade atual" htmlFor="current_quantity">
          <Input
            id="current_quantity"
            name="current_quantity"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            defaultValue={item?.current_quantity ?? 0}
          />
        </Field>

        <Field
          label="Quantidade mínima"
          htmlFor="minimum_quantity"
          hint="Abaixo disso, entra na lista de compras."
        >
          <Input
            id="minimum_quantity"
            name="minimum_quantity"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            defaultValue={item?.minimum_quantity ?? 0}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Validade" htmlFor="expiration_date" hint="Opcional.">
          <Input
            id="expiration_date"
            name="expiration_date"
            type="date"
            defaultValue={item?.expiration_date ?? ''}
          />
        </Field>

        <Field label="Último preço" htmlFor="last_price" hint="Opcional, em R$.">
          <Input
            id="last_price"
            name="last_price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={item?.last_price ?? ''}
          />
        </Field>
      </div>

      <Field label="Observações" htmlFor="notes" hint="Opcional.">
        <Textarea id="notes" name="notes" rows={3} defaultValue={item?.notes ?? ''} />
      </Field>

      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex gap-3 pt-1">
        <ButtonLink href="/estoque" variant="secondary" size="lg" className="flex-1">
          Cancelar
        </ButtonLink>
        <SubmitButton size="lg" className="flex-1">
          {editando ? 'Salvar' : 'Cadastrar'}
        </SubmitButton>
      </div>
    </form>
  )
}
