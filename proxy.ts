import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Tudo, exceto arquivos estáticos e imagens. As rotas /api ficam incluídas
     * de propósito: elas falam com o Gemini e precisam da sessão renovada.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
