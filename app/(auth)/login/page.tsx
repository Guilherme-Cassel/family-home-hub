import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = { title: 'Entrar · Casa em Ordem' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirecionar?: string }>
}) {
  const { redirecionar } = await searchParams

  return <LoginForm redirecionar={redirecionar ?? '/'} />
}
