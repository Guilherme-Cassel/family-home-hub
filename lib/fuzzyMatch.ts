import { normalizar } from './texto'

/**
 * Casamento aproximado de nomes de produto, sem dependência externa.
 *
 * O problema concreto: a IA devolve "Arroz branco tipo 1" e no cadastro está
 * "Arroz branco". Comparação exata falha, Levenshtein puro pune o texto extra
 * demais, e coeficiente de Dice sozinho ignora erro de digitação. A pontuação
 * final combina os três sinais e fica com o maior.
 */

/** Distância de Levenshtein com duas linhas em vez da matriz inteira. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i)
  let atual = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i++) {
    atual[0] = i

    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1
      atual[j] = Math.min(
        atual[j - 1] + 1, // inserção
        anterior[j] + 1, // remoção
        anterior[j - 1] + custo, // substituição
      )
    }

    ;[anterior, atual] = [atual, anterior]
  }

  return anterior[b.length]
}

/** Levenshtein normalizado para 0..1, onde 1 é idêntico. */
function similaridadeLevenshtein(a: string, b: string): number {
  const maior = Math.max(a.length, b.length)
  if (maior === 0) return 1
  return 1 - levenshtein(a, b) / maior
}

/** Coeficiente de Dice sobre bigramas — bom para ordem de palavras trocada. */
function similaridadeDice(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const bigramas = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i++) {
    const par = a.slice(i, i + 2)
    bigramas.set(par, (bigramas.get(par) ?? 0) + 1)
  }

  let intersecao = 0
  for (let i = 0; i < b.length - 1; i++) {
    const par = b.slice(i, i + 2)
    const contagem = bigramas.get(par) ?? 0
    if (contagem > 0) {
      bigramas.set(par, contagem - 1)
      intersecao++
    }
  }

  return (2 * intersecao) / (a.length - 1 + (b.length - 1))
}

/**
 * Quanto das palavras do texto mais curto aparece no mais longo.
 *
 * É o sinal que resolve "Arroz branco tipo 1" contra "Arroz branco": um é
 * prefixo em palavras do outro, e isso deveria pontuar alto mesmo com muito
 * texto sobrando.
 */
function coberturaDePalavras(a: string, b: string): number {
  const palavrasA = a.split(' ').filter(Boolean)
  const palavrasB = b.split(' ').filter(Boolean)
  if (palavrasA.length === 0 || palavrasB.length === 0) return 0

  const [curto, longo] =
    palavrasA.length <= palavrasB.length ? [palavrasA, palavrasB] : [palavrasB, palavrasA]

  const conjuntoLongo = new Set(longo)
  const encontradas = curto.filter((palavra) => conjuntoLongo.has(palavra)).length

  return encontradas / curto.length
}

/** Similaridade entre dois nomes, de 0 a 1. */
export function similaridade(a: string, b: string): number {
  const normA = normalizar(a)
  const normB = normalizar(b)

  if (!normA || !normB) return 0
  if (normA === normB) return 1

  return Math.max(
    similaridadeLevenshtein(normA, normB),
    similaridadeDice(normA, normB),
    coberturaDePalavras(normA, normB),
  )
}

export type Candidato = { id: string; name: string }

export type Correspondencia<T extends Candidato> = {
  item: T
  pontuacao: number
}

/** Melhor candidato para um nome, ou null se a lista estiver vazia. */
export function melhorCorrespondencia<T extends Candidato>(
  nome: string,
  candidatos: T[],
): Correspondencia<T> | null {
  let melhor: Correspondencia<T> | null = null

  for (const item of candidatos) {
    const pontuacao = similaridade(nome, item.name)
    if (!melhor || pontuacao > melhor.pontuacao) {
      melhor = { item, pontuacao }
    }
  }

  return melhor
}

/**
 * Limiar para aceitar o vínculo sem intervenção humana.
 *
 * Conservador de propósito: um falso positivo credita a compra no item errado
 * e só é descoberto quando a despensa não bate. Um falso negativo custa dois
 * toques na tela de revisão.
 */
export const LIMIAR_MATCH_AUTOMATICO = 0.8
