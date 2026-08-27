/**
 * Utilitários de data.
 *
 * O Postgres devolve colunas `date` como "AAAA-MM-DD". Passar essa string
 * direto para `new Date()` faz o JavaScript interpretar como UTC, o que no
 * Brasil joga a data um dia para trás. Por isso todas as conversões aqui
 * quebram a string manualmente e montam a data no fuso local.
 */

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

/** Data de hoje como "AAAA-MM-DD" no fuso local. */
export function hojeIso(): string {
  return isoDeData(new Date())
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
