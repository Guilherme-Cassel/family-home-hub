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
     *
     * As rotas "apple-icon" e "icon" precisam estar aqui por extenso: o Next
     * serve esses ícones em endereços sem extensão de arquivo, então o filtro
     * por extensão não os pega e o proxy redirecionava o pedido do ícone para
     * o login — o iOS nunca conseguiria buscar o ícone da tela de início.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|apple-icon|icon|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
