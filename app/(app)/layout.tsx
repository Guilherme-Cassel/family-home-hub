import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { getNomeDoUsuario } from '@/lib/queries'
import { requireUser } from '@/lib/supabase/auth'

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireUser()

  // Passa pelo perfil, não pelos metadados do usuário: além de ser o mesmo
  // nome que aparece em "feito por Fulano", é aqui que o perfil é criado caso
  // ainda não exista. Sem perfil, qualquer tentativa de gravar falharia na
  // chave estrangeira de created_by.
  const nome = await getNomeDoUsuario(
    user.id,
    user.email?.split('@')[0] ?? 'você',
  )

  return (
    <div className="min-h-dvh">
      <AppHeader nome={nome} />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-nav">{children}</main>
      <BottomNav />
    </div>
  )
}
