import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './env'
import type { Database } from '@/types/database'

/** Cliente Supabase para uso em Client Components. */
export function createClient() {
  const { url, key } = getSupabaseEnv()
  return createBrowserClient<Database>(url, key)
}
