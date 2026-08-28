import { AppIcon } from '@/components/AppIcon'

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <header className="mb-10 text-center">
          <AppIcon className="mx-auto h-16 w-16" />
          <h1 className="mt-5 text-[28px] leading-tight font-bold tracking-[-0.025em] text-ink">
            Casa em Ordem
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-2">
            Despensa e manutenções da casa, em um lugar só.
          </p>
        </header>
        {children}
      </div>
    </main>
  )
}
