/**
 * Normaliza texto para comparação: sem acentos, sem caixa, sem espaço
 * duplicado. Usado tanto na busca do estoque quanto no casamento aproximado
 * de nomes vindos da IA.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
