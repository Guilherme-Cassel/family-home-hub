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
     *
     * "api/cron" fica de fora pelo mesmo motivo: quem chama é o agendador da
     * Vercel, que não tem sessão. Sem esta exceção o ping seria redirecionado
     * para o login e nunca encostaria no banco — falhando em silêncio até o
     * projeto ser pausado. Essa rota tem a própria autenticação, por
     * CRON_SECRET.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|apple-icon|icon|opengraph-image|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
