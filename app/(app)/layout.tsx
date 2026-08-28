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
  //
  // A tela de início chama de novo para saudar pelo nome; as duas funções são
  // memoizadas por requisição, então isso não custa uma segunda consulta.
  await getNomeDoUsuario(user.id, user.email?.split('@')[0] ?? 'você')

  // O cabeçalho passou a ser de cada tela — é ele que carrega o título grande
  // que recolhe. Aqui fica só a coluna de conteúdo e a navegação flutuante.
  return (
    <div className="min-h-dvh">
      <main className="mx-auto max-w-xl px-5 pb-nav">{children}</main>
      <BottomNav />
    </div>
  )
}
