import { DIAS_AVISO_VALIDADE_PADRAO } from './constants'
import { createClient } from './supabase/server'

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
