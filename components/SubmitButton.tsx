'use client'

import { useFormStatus } from 'react-dom'
import { Button } from './Button'
import type { ComponentProps } from 'react'

type Props = ComponentProps<typeof Button> & {
  /** Texto exibido enquanto o formulário está sendo enviado. */
  pendingLabel?: string
}

/** Botão de envio que se desabilita sozinho enquanto a action roda. */
export function SubmitButton({
  children,
  pendingLabel = 'Salvando…',
  ...props
}: Props) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" {...props} disabled={pending || props.disabled}>
      {pending ? pendingLabel : children}
    </Button>
  )
}
