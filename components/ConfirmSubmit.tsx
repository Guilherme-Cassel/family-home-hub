'use client'

import type { ComponentProps } from 'react'
import { SubmitButton } from './SubmitButton'

type Props = ComponentProps<typeof SubmitButton> & {
  /** Pergunta mostrada antes de deixar a ação seguir. */
  confirmacao: string
}

/**
 * Botão de envio que pede confirmação antes de disparar a action.
 *
 * Usa `confirm()` do navegador de propósito: é nativo, acessível e no celular
 * aparece como diálogo do sistema — nada a manter e nada a estilizar.
 */
export function ConfirmSubmit({ confirmacao, ...props }: Props) {
  return (
    <SubmitButton
      {...props}
      pendingLabel={props.pendingLabel ?? 'Excluindo…'}
      onClick={(event) => {
        if (!window.confirm(confirmacao)) {
          event.preventDefault()
        }
      }}
    />
  )
}
