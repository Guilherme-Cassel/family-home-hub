import { describe, expect, it } from 'vitest'
import { converterMedida, normalizarUnidade } from './medidas'

describe('converterMedida', () => {
  it('converte a caixinha de leite para o estoque medido em ml', () => {
    // O bug que originou esta função: 1 L entrava como 1 num item em ml, e o
    // estoque ia de 3000 para 3001 em vez de 4000.
    expect(converterMedida(1, 'L', 'ml')).toBe(1000)
  })

  it('converte nos dois sentidos e nas duas grandezas', () => {
    expect(converterMedida(1000, 'ml', 'L')).toBe(1)
    expect(converterMedida(500, 'g', 'kg')).toBe(0.5)
    expect(converterMedida(2, 'kg', 'g')).toBe(2000)
  })

  it('devolve a mesma quantidade quando a unidade não muda', () => {
    expect(converterMedida(3, 'un', 'un')).toBe(3)
    expect(converterMedida(0.5, 'L', 'L')).toBe(0.5)
  })

  it('aceita os apelidos que aparecem em rótulo e em transcrição de voz', () => {
    expect(converterMedida(1, 'litro', 'ml')).toBe(1000)
    expect(converterMedida(1, 'l', 'ML')).toBe(1000)
    expect(converterMedida(350, 'gr', 'kg')).toBe(0.35)
  })

  it('recusa converter entre grandezas diferentes', () => {
    // Massa não vira volume: 500 g de farinha não são 500 ml de farinha.
    expect(converterMedida(500, 'g', 'ml')).toBeNull()
  })

  it('recusa converter para unidades contáveis', () => {
    // Um pacote não tem relação fixa com grama nenhuma. Quem chama cai para 1
    // e deixa a revisão resolver, em vez de somar um número inventado.
    expect(converterMedida(1, 'L', 'un')).toBeNull()
    expect(converterMedida(1, 'L', 'pct')).toBeNull()
    expect(converterMedida(6, 'un', 'kg')).toBeNull()
  })

  it('recusa unidade desconhecida em vez de chutar', () => {
    expect(converterMedida(1, 'L', 'xícara')).toBeNull()
    expect(converterMedida(1, 'dúzia', 'un')).toBeNull()
  })

  it('recusa quantidade que não é número', () => {
    expect(converterMedida(NaN, 'L', 'ml')).toBeNull()
    expect(converterMedida(Infinity, 'L', 'ml')).toBeNull()
  })

  it('arredonda em 3 casas, que é o que a coluna do banco guarda', () => {
    // Sem arredondar, iria 333.33333333333337 para uma coluna numeric(12,3) e
    // voltaria diferente do que foi mandado.
    expect(converterMedida(1 / 3, 'kg', 'g')).toBe(333.333)
  })
})

describe('normalizarUnidade', () => {
  it('devolve a unidade no formato que o resto do app usa', () => {
    expect(normalizarUnidade('l')).toBe('L')
    expect(normalizarUnidade(' LT ')).toBe('L')
    expect(normalizarUnidade('Unidade')).toBe('un')
    expect(normalizarUnidade('caixa')).toBe('cx')
  })

  it('devolve null para o que a tela não sabe mostrar', () => {
    // A IA pode responder qualquer coisa; unidade fora da lista do app não
    // pode virar cadastro nem quantidade.
    expect(normalizarUnidade('xícara')).toBeNull()
    expect(normalizarUnidade('')).toBeNull()
  })
})
