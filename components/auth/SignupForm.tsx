'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signUp, type AuthState } from '@/app/(auth)/actions'
import { Alert } from '@/components/Alert'
import { Field, Input } from '@/components/Field'
import { SubmitButton } from '@/components/SubmitButton'

const ESTADO_INICIAL: AuthState = {}

export function SignupForm() {
  const [state, formAction] = useActionState(signUp, ESTADO_INICIAL)

  if (state.message) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.message}</Alert>
        <Link href="/login" className="block text-center text-sm font-medium text-brand-700 underline">
          Ir para a tela de entrada
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Como te chamamos?" htmlFor="display_name" hint="Aparece no histórico, tipo “feito por Ana”.">
        <Input
          id="display_name"
          name="display_name"
          autoComplete="name"
          required
          placeholder="Ana"
        />
      </Field>

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

      <Field label="Senha" htmlFor="password" hint="Mínimo de 6 caracteres.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </Field>

      {state.error ? <Alert>{state.error}</Alert> : null}

      <SubmitButton size="lg" className="w-full" pendingLabel="Criando conta…">
        Criar conta
      </SubmitButton>

      <p className="text-center text-sm text-slate-600">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-brand-700 underline">
          Entrar
        </Link>
      </p>
    </form>
  )
}
