import { describe, expect, it } from 'vitest'
import { agruparEntradas } from './entradas'
import type { StockEntry } from '@/types/domain'

const entrada = (partes: Partial<StockEntry>): StockEntry => ({
  stock_item_id: null,
  quantity_change: 1,
  reason: 'compra',
  ...partes,
})

const novo = (name: string, unit = 'un') => ({
  name,
  category: 'alimento',
  unit,
  minimum_quantity: 0,
})

describe('agruparEntradas', () => {
  it('junta as fotos do mesmo produto novo numa entrada só', () => {
    // O bug que originou esta função: cinco fotos de cinco pacotes de pipoca
    // viravam cinco cadastros com 1 un cada.
    const agrupadas = agruparEntradas([
      entrada({ new_item: novo('Milho para pipoca') }),
      entrada({ new_item: novo('Milho para pipoca') }),
      entrada({ new_item: novo('Milho para pipoca') }),
    ])

    expect(agrupadas).toHaveLength(1)
    expect(agrupadas[0].quantity_change).toBe(3)
  })

  it('ignora acento, caixa e espaço duplicado ao comparar o nome', () => {
    const agrupadas = agruparEntradas([
      entrada({ new_item: novo('Milho para pipoca') }),
      entrada({ new_item: novo('milho  PARA Pipóca') }),
    ])

    expect(agrupadas).toHaveLength(1)
    expect(agrupadas[0].quantity_change).toBe(2)
    // Vale o nome da primeira linha, que é a que o cadastro vai receber.
    expect(agrupadas[0].new_item?.name).toBe('Milho para pipoca')
  })

  it('junta itens já cadastrados pelo id', () => {
    const agrupadas = agruparEntradas([
      entrada({ stock_item_id: 'leite', quantity_change: 1000 }),
      entrada({ stock_item_id: 'leite', quantity_change: 500 }),
    ])

    expect(agrupadas).toHaveLength(1)
    expect(agrupadas[0].quantity_change).toBe(1500)
  })

  it('não mistura produtos diferentes', () => {
    const agrupadas = agruparEntradas([
      entrada({ stock_item_id: 'leite' }),
      entrada({ new_item: novo('Arroz') }),
      entrada({ stock_item_id: 'ovo' }),
    ])

    expect(agrupadas).toHaveLength(3)
  })

  it('não mistura entrada com saída do mesmo item', () => {
    // "Usei os dois últimos ovos e comprei uma dúzia" tem de continuar sendo
    // duas movimentações: somar daria uma compra de 10 e apagaria o consumo
    // do histórico.
    const agrupadas = agruparEntradas([
      entrada({ stock_item_id: 'ovo', quantity_change: -2, reason: 'consumo' }),
      entrada({ stock_item_id: 'ovo', quantity_change: 12, reason: 'compra' }),
    ])

    expect(agrupadas).toHaveLength(2)
    expect(agrupadas.map((e) => e.quantity_change)).toEqual([-2, 12])
  })

  it('soma as saídas do mesmo item', () => {
    const agrupadas = agruparEntradas([
      entrada({ stock_item_id: 'ovo', quantity_change: -1, reason: 'consumo' }),
      entrada({ stock_item_id: 'ovo', quantity_change: -1, reason: 'consumo' }),
    ])

    expect(agrupadas).toHaveLength(1)
    expect(agrupadas[0].quantity_change).toBe(-2)
  })

  it('deixa linhas com preço de fora', () => {
    // Somar a quantidade mantendo o preço de uma delas distorceria o
    // histórico de quanto custou.
    const agrupadas = agruparEntradas([
      entrada({ stock_item_id: 'leite', price_at_time: 4.5 }),
      entrada({ stock_item_id: 'leite', price_at_time: 4.5 }),
    ])

    expect(agrupadas).toHaveLength(2)
  })

  it('não altera as entradas que recebeu', () => {
    // O agrupamento roda dentro de uma Server Action sobre dados que vieram
    // do cliente; mutar o argumento esconderia o que foi realmente enviado.
    const originais = [
      entrada({ stock_item_id: 'leite' }),
      entrada({ stock_item_id: 'leite' }),
    ]

    agruparEntradas(originais)

    expect(originais.map((e) => e.quantity_change)).toEqual([1, 1])
  })

  it('devolve lista vazia sem entradas', () => {
    expect(agruparEntradas([])).toEqual([])
  })
})
