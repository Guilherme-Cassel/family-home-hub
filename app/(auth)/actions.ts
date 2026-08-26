'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error?: string; message?: string }

/** Só aceita caminhos internos, para o parâmetro de retorno não virar open redirect. */
function safeRedirectTarget(value: FormDataEntryValue | null) {
  const path = typeof value === 'string' ? value : ''
  return path.startsWith('/') && !path.startsWith('//') ? path : '/'
}

function traduzirErroAuth(mensagem: string) {
  const normalizada = mensagem.toLowerCase()

  if (normalizada.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.'
  }
  if (normalizada.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Verifique a caixa de entrada.'
  }
  if (normalizada.includes('user already registered')) {
    return 'Já existe uma conta com este e-mail. Tente entrar.'
  }
  if (normalizada.includes('password should be at least')) {
    return 'A senha precisa ter pelo menos 6 caracteres.'
  }
  if (normalizada.includes('rate limit') || normalizada.includes('too many')) {
    return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.'
  }
  return `Não foi possível concluir: ${mensagem}`
}

export async function signIn(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Preencha e-mail e senha.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: traduzirErroAuth(error.message) }
  }

  revalidatePath('/', 'layout')
  redirect(safeRedirectTarget(formData.get('redirecionar')))
}

export async function signUp(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const displayName = String(formData.get('display_name') ?? '').trim()

  if (!displayName) {
    return { error: 'Diga como podemos te chamar.' }
  }
  if (!email || !password) {
    return { error: 'Preencha e-mail e senha.' }
  }
  if (password.length < 6) {
    return { error: 'A senha precisa ter pelo menos 6 caracteres.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })

  if (error) {
    return { error: traduzirErroAuth(error.message) }
  }

  // Sem sessão significa que o projeto exige confirmação de e-mail.
  if (!data.session) {
    return {
      message:
        'Conta criada! Enviamos um link de confirmação para o seu e-mail. ' +
        'Confirme e depois volte para entrar.',
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/login')
}
