/** Categorias sugeridas para itens de estoque. O campo aceita texto livre. */
export const CATEGORIAS_ESTOQUE = [
  { valor: 'alimento', rotulo: 'Alimento' },
  { valor: 'bebida', rotulo: 'Bebida' },
  { valor: 'limpeza', rotulo: 'Limpeza' },
  { valor: 'higiene', rotulo: 'Higiene' },
  { valor: 'pet', rotulo: 'Pet' },
  { valor: 'farmacia', rotulo: 'Farmácia' },
  { valor: 'outros', rotulo: 'Outros' },
] as const

/** Categoria usada pela sugestão de receitas para montar o payload. */
export const CATEGORIA_ALIMENTO = 'alimento'

/** Unidades de medida oferecidas nos formulários. */
export const UNIDADES = [
  { valor: 'un', rotulo: 'un' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'g', rotulo: 'g' },
  { valor: 'L', rotulo: 'L' },
  { valor: 'ml', rotulo: 'ml' },
  { valor: 'pct', rotulo: 'pacote' },
  { valor: 'cx', rotulo: 'caixa' },
] as const

/** Categorias sugeridas para itens de manutenção. */
export const CATEGORIAS_MANUTENCAO = [
  { valor: 'eletrodomestico', rotulo: 'Eletrodoméstico' },
  { valor: 'casa', rotulo: 'Casa' },
  { valor: 'carro', rotulo: 'Carro' },
  { valor: 'seguranca', rotulo: 'Segurança' },
  { valor: 'jardim', rotulo: 'Jardim' },
  { valor: 'outros', rotulo: 'Outros' },
] as const

/** Fallback caso a linha de app_settings ainda não exista. */
export const DIAS_AVISO_VALIDADE_PADRAO = 5

/**
 * Fração final do intervalo em que a manutenção passa a ser sinalizada como
 * "perto do vencimento" (amarelo). 0.15 = últimos 15% do prazo.
 */
export const FRACAO_ALERTA_MANUTENCAO = 0.15

export function rotuloCategoriaEstoque(valor: string) {
  return CATEGORIAS_ESTOQUE.find((c) => c.valor === valor)?.rotulo ?? valor
}

export function rotuloCategoriaManutencao(valor: string | null) {
  if (!valor) return null
  return CATEGORIAS_MANUTENCAO.find((c) => c.valor === valor)?.rotulo ?? valor
}
