import { describe, expect, it } from 'vitest'
import { sanitizarAlteracoes, type ItemCatalogo } from './alteracaoEstoque'

const CATALOGO: ItemCatalogo[] = [
  { id: 'leite', name: 'Leite integral', unit: 'ml', current_quantity: 3000 },
  { id: 'ovo', name: 'Ovo', unit: 'un', current_quantity: 12 },
  { id: 'arroz', name: 'Arroz branco', unit: 'kg', current_quantity: 5 },
]

/** Uma resposta da IA no formato do contrato, para variar campo a campo. */
const resposta = (partes: Record<string, unknown>) => ({
  tipo: 'saida',
  indice_cadastro: 1,
  nome_falado: 'ovo',
  nome_cadastro: '',
  categoria_sugerida: '',
  quantidade: 1,
  unidade: 'un',
  ...partes,
})

describe('sanitizarAlteracoes: item já cadastrado', () => {
  it('converte a medida falada para a unidade do item', () => {
    const [linha] = sanitizarAlteracoes(
      [resposta({ indice_cadastro: 0, quantidade: 0.5, unidade: 'L' })],
      CATALOGO,
    )

    expect(linha.stock_item_id).toBe('leite')
    expect(linha.quantidade).toBe(500)
    expect(linha.unidade).toBe('ml')
    expect(linha.convertido).toBe(true)
    // Guarda o que foi dito para a revisão mostrar de onde veio o número.
    expect(linha.falado).toBe('0.5 L')
  })

  it('não marca "você disse" quando a medida já é a do cadastro', () => {
    const [linha] = sanitizarAlteracoes([resposta({ quantidade: 2 })], CATALOGO)

    expect(linha.quantidade).toBe(2)
    expect(linha.falado).toBeNull()
  })

  it('passa o número como foi dito quando não dá para converter', () => {
    // "Dois pacotes" de algo medido em kg: cair para 1 seria pior, a pessoa
    // disse 2. A linha vai marcada para conferência.
    const [linha] = sanitizarAlteracoes(
      [resposta({ indice_cadastro: 2, quantidade: 2, unidade: 'pct' })],
      CATALOGO,
    )

    expect(linha.quantidade).toBe(2)
    expect(linha.unidade).toBe('kg')
    expect(linha.convertido).toBe(false)
  })

  it('usa o nome do cadastro, não o que a pessoa falou', () => {
    const [linha] = sanitizarAlteracoes(
      [resposta({ indice_cadastro: 0, nome_falado: 'leiti' })],
      CATALOGO,
    )

    expect(linha.nome).toBe('Leite integral')
  })
})

describe('sanitizarAlteracoes: índice inventado pela IA', () => {
  it('não vira vínculo quando aponta para fora da lista', () => {
    // A regra que impede creditar a compra no item errado — o tipo de erro
    // que só aparece quando falta comida.
    const linhas = sanitizarAlteracoes(
      [resposta({ tipo: 'entrada', indice_cadastro: 99, nome_cadastro: 'Feijão' })],
      CATALOGO,
    )

    expect(linhas[0].stock_item_id).toBeNull()
  })

  it('trata índice quebrado como item não encontrado', () => {
    for (const indice of [-1, 1.5, 'dois', null, undefined]) {
      const linhas = sanitizarAlteracoes(
        [resposta({ tipo: 'entrada', indice_cadastro: indice, nome_cadastro: 'Feijão' })],
        CATALOGO,
      )

      expect(linhas[0].stock_item_id).toBeNull()
    }
  })
})

describe('sanitizarAlteracoes: item novo', () => {
  it('devolve o que o cadastro precisa, com a categoria sugerida', () => {
    const [linha] = sanitizarAlteracoes(
      [
        resposta({
          tipo: 'entrada',
          indice_cadastro: -1,
          nome_falado: 'sabão em pó',
          nome_cadastro: 'Sabão em pó',
          categoria_sugerida: 'limpeza',
          quantidade: 800,
          unidade: 'g',
        }),
      ],
      CATALOGO,
    )

    expect(linha.stock_item_id).toBeNull()
    expect(linha.nome).toBe('Sabão em pó')
    expect(linha.categoria).toBe('limpeza')
    expect(linha.unidade).toBe('g')
    expect(linha.quantidade).toBe(800)
  })

  it('cai para "outros" quando a IA inventa uma categoria', () => {
    // A tela só sabe mostrar as sete categorias do app.
    const [linha] = sanitizarAlteracoes(
      [
        resposta({
          indice_cadastro: -1,
          nome_cadastro: 'Vela perfumada',
          categoria_sugerida: 'decoração',
        }),
      ],
      CATALOGO,
    )

    expect(linha.categoria).toBe('outros')
  })

  it('cai para "un" quando a unidade não é do app', () => {
    const [linha] = sanitizarAlteracoes(
      [
        resposta({
          indice_cadastro: -1,
          nome_cadastro: 'Ovo',
          unidade: 'dúzia',
        }),
      ],
      CATALOGO,
    )

    expect(linha.unidade).toBe('un')
  })

  it('usa o nome falado quando a IA não sugere nome de cadastro', () => {
    const [linha] = sanitizarAlteracoes(
      [resposta({ indice_cadastro: -1, nome_falado: 'sabão', nome_cadastro: '' })],
      CATALOGO,
    )

    expect(linha.nome).toBe('sabão')
  })

  it('descarta a linha sem nome nenhum', () => {
    const linhas = sanitizarAlteracoes(
      [resposta({ indice_cadastro: -1, nome_falado: '', nome_cadastro: '  ' })],
      CATALOGO,
    )

    expect(linhas).toEqual([])
  })
})

describe('sanitizarAlteracoes: o lado da alteração', () => {
  it('respeita entrada e saída', () => {
    const linhas = sanitizarAlteracoes(
      [resposta({ tipo: 'entrada' }), resposta({ tipo: 'saida' })],
      CATALOGO,
    )

    expect(linhas.map((l) => l.tipo)).toEqual(['entrada', 'saida'])
  })

  it('cai para saída quando o tipo vem fora do contrato', () => {
    // Saída é o lado que não inventa estoque que não existe; a revisão mostra
    // o sinal e deixa inverter.
    for (const tipo of ['compra', '', null, 42]) {
      const [linha] = sanitizarAlteracoes([resposta({ tipo })], CATALOGO)
      expect(linha.tipo).toBe('saida')
    }
  })
})

describe('sanitizarAlteracoes: resposta malformada', () => {
  it('devolve lista vazia quando não é array', () => {
    for (const bruto of [null, undefined, {}, 'texto', 42]) {
      expect(sanitizarAlteracoes(bruto, CATALOGO)).toEqual([])
    }
  })

  it('pula linha que não é objeto sem derrubar as outras', () => {
    const linhas = sanitizarAlteracoes([null, 'lixo', resposta({})], CATALOGO)

    expect(linhas).toHaveLength(1)
  })

  it('descarta quantidade zero, negativa ou não numérica', () => {
    for (const quantidade of [0, -3, NaN, 'muito', null]) {
      expect(sanitizarAlteracoes([resposta({ quantidade })], CATALOGO)).toEqual([])
    }
  })
})
