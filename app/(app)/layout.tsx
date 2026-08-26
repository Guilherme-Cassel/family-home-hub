import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { requireUser } from '@/lib/supabase/auth'

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireUser()

  const nome =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'você'

  return (
    <div className="min-h-dvh">
      <AppHeader nome={nome} />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-nav">{children}</main>
      <BottomNav />
    </div>
  )
}
