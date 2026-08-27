'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Não existe ação de cadastro aqui, e é de propósito.
 *
 * As contas são criadas à mão no painel do Supabase (Authentication > Users >
 * Add user). Um app doméstico exposto na internet com auto-cadastro aberto
 * deixaria qualquer um criar conta, mexer nos dados da casa e gastar a cota
 * da API do Gemini.
 *
 * Só remover esta tela não bastaria: o endpoint de signup do Supabase
 * continua acessível com a chave pública, que por natureza vai no bundle do
 * navegador. O bloqueio de verdade é desligar "Allow new users to sign up" no
 * painel do Supabase — está documentado no README.
 */
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

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/login')
}
