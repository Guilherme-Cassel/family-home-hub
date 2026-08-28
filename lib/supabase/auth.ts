import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from './server'

/**
 * Garante que existe um usuário autenticado e o devolve.
 *
 * O proxy já bloqueia a navegação anônima, mas Server Actions são requisições
 * POST para a própria rota e podem escapar do matcher — por isso toda action
 * que escreve no banco chama esta função antes de qualquer coisa.
 */
export const requireUser = cache(async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return { supabase, user }
})
