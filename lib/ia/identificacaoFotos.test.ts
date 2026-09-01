import { describe, expect, it } from 'vitest'
import { sanitizarIdentificacoes } from './identificacaoFotos'

const CATALOGO = [{ id: 'leite' }, { id: 'arroz' }]

/** Uma resposta da IA no formato do contrato, para variar campo a campo. */
const resposta = (partes: Record<string, unknown>) => ({
  indice: 0,
  nome_identificado: 'Leite integral',
  categoria_sugerida: 'bebida',
  confianca: 'alta',
  quantidade_embalagem: 1,
  unidade_embalagem: 'L',
  indice_cadastro: 0,
  ...partes,
})

describe('sanitizarIdentificacoes: o rótulo lido na foto', () => {
  it('entrega a medida como está escrita na embalagem', () => {
    // Cru, na unidade do rótulo: a conversão para a unidade do item acontece
    // depois, na tela, com a tabela de medidas.
    const [linha] = sanitizarIdentificacoes([resposta({})], 1, CATALOGO)

    expect(linha.embalagem).toEqual({ quantidade: 1, unidade: 'L' })
  })

  it('normaliza a unidade do rótulo', () => {
    const [linha] = sanitizarIdentificacoes(
      [resposta({ quantidade_embalagem: 500, unidade_embalagem: 'gr' })],
      1,
      CATALOGO,
    )

    expect(linha.embalagem).toEqual({ quantidade: 500, unidade: 'g' })
  })

  it('descarta o rótulo ilegível em vez de estimar', () => {
    // Sem embalagem, a revisão entra com 1, como sempre entrou.
    const [linha] = sanitizarIdentificacoes(
      [resposta({ quantidade_embalagem: 0, unidade_embalagem: '' })],
      1,
      CATALOGO,
    )

    expect(linha.embalagem).toBeNull()
  })

  it('descarta medida negativa ou unidade que o app não conhece', () => {
    const casos = [
      { quantidade_embalagem: -1, unidade_embalagem: 'L' },
      { quantidade_embalagem: 'meio', unidade_embalagem: 'L' },
      { quantidade_embalagem: 6, unidade_embalagem: 'dúzia' },
    ]

    for (const caso of casos) {
      const [linha] = sanitizarIdentificacoes([resposta(caso)], 1, CATALOGO)
      expect(linha.embalagem).toBeNull()
    }
  })
})

describe('sanitizarIdentificacoes: vínculo com o cadastro', () => {
  it('resolve o índice contra a lista real', () => {
    const [linha] = sanitizarIdentificacoes(
      [resposta({ indice_cadastro: 1 })],
      1,
      CATALOGO,
    )

    expect(linha.stock_item_id).toBe('arroz')
  })

  it('não vira vínculo quando o índice está fora da lista', () => {
    // Um vínculo errado credita a compra no item errado e passa despercebido.
    for (const indice of [-1, 2, 99, 1.5, 'um', null]) {
      const [linha] = sanitizarIdentificacoes(
        [resposta({ indice_cadastro: indice })],
        1,
        CATALOGO,
      )

      expect(linha.stock_item_id).toBeNull()
    }
  })

  it('não vira vínculo quando não há cadastro nenhum', () => {
    const [linha] = sanitizarIdentificacoes([resposta({})], 1, [])

    expect(linha.stock_item_id).toBeNull()
  })
})

describe('sanitizarIdentificacoes: uma linha por foto', () => {
  it('descarta índice de foto que não foi enviada', () => {
    // Duas fotos enviadas, a IA respondeu sobre uma terceira.
    const linhas = sanitizarIdentificacoes(
      [resposta({ indice: 0 }), resposta({ indice: 5 })],
      2,
      CATALOGO,
    )

    expect(linhas.map((l) => l.indice)).toEqual([0])
  })

  it('fica com a primeira resposta quando a IA repete o índice', () => {
    const linhas = sanitizarIdentificacoes(
      [
        resposta({ indice: 0, nome_identificado: 'Leite integral' }),
        resposta({ indice: 0, nome_identificado: 'Outra coisa' }),
      ],
      1,
      CATALOGO,
    )

    expect(linhas).toHaveLength(1)
    expect(linhas[0].nome_identificado).toBe('Leite integral')
  })
})

describe('sanitizarIdentificacoes: resposta malformada', () => {
  it('devolve lista vazia quando não é array', () => {
    for (const bruto of [null, undefined, {}, 'texto']) {
      expect(sanitizarIdentificacoes(bruto, 1, CATALOGO)).toEqual([])
    }
  })

  it('cai para confiança baixa quando o valor não é do contrato', () => {
    // Confiança inventada não pode virar vínculo automático na tela.
    for (const confianca of ['altíssima', '', null, 3]) {
      const [linha] = sanitizarIdentificacoes([resposta({ confianca })], 1, CATALOGO)
      expect(linha.confianca).toBe('baixa')
    }
  })

  it('aceita a confiança em qualquer caixa', () => {
    const [linha] = sanitizarIdentificacoes([resposta({ confianca: 'MEDIA' })], 1, CATALOGO)

    expect(linha.confianca).toBe('media')
  })

  it('não derruba o lote por causa de uma linha estranha', () => {
    // Cinco fotos processadas não podem se perder por uma resposta torta.
    const linhas = sanitizarIdentificacoes(
      [null, resposta({ indice: 0 }), 'lixo', resposta({ indice: 1 })],
      2,
      CATALOGO,
    )

    expect(linhas).toHaveLength(2)
  })
})
