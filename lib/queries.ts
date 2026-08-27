import { DIAS_AVISO_VALIDADE_PADRAO } from './constants'
import { createClient } from './supabase/server'

/**
 * Nome de exibição do usuário logado, criando o perfil se ele ainda não existir.
 *
 * A criação normalmente acontece no trigger de `auth.users`, mas nem todo
 * usuário nasce pelo formulário do app: quem é criado pelo painel do Supabase,
 * pela admin API, ou já existia antes das migrations, chega aqui sem perfil.
 * E sem perfil nada pode ser gravado, porque `created_by` referencia a tabela.
 *
 * Chamar isto no layout da área logada garante que o perfil exista antes de
 * qualquer tela oferecer um botão que escreve no banco.
 */
export async function getNomeDoUsuario(
  userId: string,
  fallback: string,
): Promise<string> {
  const supabase = await createClient()

  // O filtro por id é obrigatório: a política de leitura expõe os perfis de
  // toda a casa, então sem ele isto quebraria assim que a segunda pessoa
  // criasse conta.
  const { data: perfil } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle()

  if (perfil?.display_name) return perfil.display_name

  const { data: criado } = await supabase.rpc('ensure_profile')
  return criado?.display_name ?? fallback
}

/**
 * Janela de "perto da validade", compartilhada pela casa.
 *
 * Se a linha de configuração ainda não existir (banco recém-criado), cai no
 * padrão em vez de quebrar a tela.
 */
export async function getDiasAvisoValidade(): Promise<number> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('app_settings')
    .select('expiry_warning_days')
    .maybeSingle()

  return data?.expiry_warning_days ?? DIAS_AVISO_VALIDADE_PADRAO
}
