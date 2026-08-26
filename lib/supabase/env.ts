/**
 * Leitura centralizada das variáveis públicas do Supabase.
 *
 * As referências a `process.env.NEXT_PUBLIC_*` precisam ser literais para o
 * Next conseguir substituí-las no bundle do navegador — por isso as duas
 * variantes da chave aparecem escritas por extenso em vez de um lookup dinâmico.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase não configurado. Copie .env.example para .env.local e preencha ' +
        'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  return { url, key }
}
