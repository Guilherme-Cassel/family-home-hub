'use client'

import { useActionState } from 'react'
import { signIn, type AuthState } from '@/app/(auth)/actions'
import { Alert } from '@/components/Alert'
import { Field, Input } from '@/components/Field'
import { SubmitButton } from '@/components/SubmitButton'

const ESTADO_INICIAL: AuthState = {}

export function LoginForm({ redirecionar }: { redirecionar: string }) {
  const [state, formAction] = useActionState(signIn, ESTADO_INICIAL)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirecionar" value={redirecionar} />

      <Field label="E-mail" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="voce@exemplo.com"
        />
      </Field>

      <Field label="Senha" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {state.error ? <Alert>{state.error}</Alert> : null}

      <SubmitButton size="lg" className="w-full" pendingLabel="Entrando…">
        Entrar
      </SubmitButton>

      {/* Sem link de cadastro: as contas da casa são criadas à mão no painel
          do Supabase, e não pela internet aberta. */}
      <p className="text-center text-xs text-ink-2">
        O acesso é criado por quem administra o app.
      </p>
    </form>
  )
}
