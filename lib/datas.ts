/**
 * Utilitários de data.
 *
 * O Postgres devolve colunas `date` como "AAAA-MM-DD". Passar essa string
 * direto para `new Date()` faz o JavaScript interpretar como UTC, o que no
 * Brasil joga a data um dia para trás. Por isso todas as conversões aqui
 * quebram a string manualmente e montam a data no fuso local.
 *
 * Sobre fuso: há duas noções de tempo no app, e elas não se misturam.
 *
 * - Um **instante** (colunas `timestamptz`, tipo `created_at`) é absoluto.
 *   Vale o mesmo no mundo inteiro e deve ser exibido no relógio de quem
 *   está lendo. Isso é assunto de `formatters.ts`.
 * - Um **dia do calendário** (colunas `date`, tipo `done_date`) pertence à
 *   casa. Se alguém marcar uma manutenção estando em outro país, a data
 *   certa é a da casa — a manutenção é do imóvel, não de quem registrou.
 *   Por isso "hoje" é sempre calculado no fuso declarado abaixo.
 *
 * Sem isso, "hoje" saía do fuso do processo — UTC na Vercel — e depois das
 * 21h de Brasília o app gravava a data de amanhã.
 */

/** Onde a casa fica. Manutenções e validades seguem este calendário. */
export const FUSO_DA_CASA = 'America/Sao_Paulo'

const PARTES_DA_DATA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_DA_CASA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Converte "AAAA-MM-DD" em um Date local à meia-noite. */
export function dataDeIso(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

/** Converte um Date para "AAAA-MM-DD" no fuso local. */
export function isoDeData(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}

/**
 * Data de hoje como "AAAA-MM-DD" no fuso da casa.
 *
 * Monta a string a partir das partes formatadas em vez de usar o Date direto:
 * é o único jeito de obter o dia em um fuso específico sem depender do fuso
 * em que o processo por acaso está rodando.
 */
export function hojeIso(): string {
  const partes = PARTES_DA_DATA.formatToParts(new Date())
  const pegar = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? ''

  return `${pegar('year')}-${pegar('month')}-${pegar('day')}`
}

/**
 * Soma dias a uma data ISO, devolvendo outra data ISO.
 *
 * A conta é feita em UTC de propósito: são datas de calendário puras, e usar
 * UTC evita que uma virada de horário de verão coma ou repita um dia.
 */
export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const alvo = new Date(Date.UTC(ano, mes - 1, dia) + dias * 24 * 60 * 60 * 1000)

  const mesAlvo = String(alvo.getUTCMonth() + 1).padStart(2, '0')
  const diaAlvo = String(alvo.getUTCDate()).padStart(2, '0')
  return `${alvo.getUTCFullYear()}-${mesAlvo}-${diaAlvo}`
}

/**
 * Diferença em dias inteiros entre duas datas ISO (destino - origem).
 * Positivo = destino no futuro.
 */
export function diasEntre(origemIso: string, destinoIso: string): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000
  const origem = dataDeIso(origemIso).getTime()
  const destino = dataDeIso(destinoIso).getTime()
  return Math.round((destino - origem) / MS_POR_DIA)
}

/** Dias até a data informada, contando a partir de hoje. Negativo = passou. */
export function diasAte(iso: string): number {
  return diasEntre(hojeIso(), iso)
}
