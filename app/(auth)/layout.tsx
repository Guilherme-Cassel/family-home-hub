export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Casa em Ordem</h1>
          <p className="mt-1 text-sm text-slate-500">
            Despensa e manutenções da casa, em um lugar só.
          </p>
        </header>
        {children}
      </div>
    </main>
  )
}
