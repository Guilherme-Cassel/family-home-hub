import { signOut } from '@/app/(auth)/actions'
import { IconLogout } from '@/components/icons'

export function AppHeader({ nome }: { nome: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            Casa em Ordem
          </p>
          <p className="truncate text-xs text-slate-500">Olá, {nome}</p>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            title="Sair"
            aria-label="Sair da conta"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <IconLogout />
          </button>
        </form>
      </div>
    </header>
  )
}
