import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Ping diário para o projeto do Supabase não ser pausado por inatividade.
 *
 * O plano gratuito do Supabase pausa o projeto após 7 dias sem uso, e aí o
 * login para de funcionar até alguém reativar pelo painel. Uma consulta por
 * dia reinicia essa contagem.
 *
 * A consulta é anônima de propósito: sem sessão, a RLS devolve zero linhas —
 * mas a requisição atravessa o PostgREST até o Postgres do mesmo jeito, que é
 * o que conta como atividade. Não precisamos ler dado nenhum, só encostar no
 * banco.
 *
 * Roda uma vez por dia, e não uma vez por semana, porque o Hobby da Vercel
 * tem precisão de ±59 minutos: agendar semanalmente encostaria no limite de 7
 * dias sem margem nenhuma. Diário custa uma invocação trivial e dá folga.
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET

  if (segredo) {
    const autorizacao = request.headers.get('authorization')
    if (autorizacao !== `Bearer ${segredo}`) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('app_settings')
    .select('id', { count: 'exact', head: true })

  if (error) {
    // Devolver 500 faz a falha aparecer no painel de crons da Vercel em vez
    // de o ping fingir sucesso enquanto o projeto adormece.
    return NextResponse.json(
      { ok: false, erro: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    // Sem o segredo, o endpoint fica aberto. É inofensivo (só encosta no
    // banco), mas o aviso evita que isso passe despercebido para sempre.
    aviso: segredo
      ? undefined
      : 'CRON_SECRET não está configurada: este endpoint está aberto.',
  })
}
