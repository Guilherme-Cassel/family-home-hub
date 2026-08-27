import { formatarMoeda, formatarQuantidade } from './formatters'
import type { ShoppingExtra, StockItem } from '@/types/domain'

/** Uma linha da lista de compras, já pronta para exibir, somar ou copiar. */
export type LinhaCompra = {
  nome: string
  quantidade: number | null
  unidade: string | null
  /** Preço unitário conhecido, ou null quando nunca foi registrado. */
  precoUnitario: number | null
}

/**
 * Quanto falta para o item voltar ao mínimo.
 *
 * É essa diferença que interessa na lista, não a quantidade mínima inteira:
 * se o mínimo é 3 e ainda há 2 em casa, o que precisa entrar no carrinho é 1.
 */
export function faltaComprar(item: StockItem): number {
  return Math.max(0, item.minimum_quantity - item.current_quantity)
}

export function linhaDoEstoque(item: StockItem): LinhaCompra {
  return {
    nome: item.name,
    quantidade: faltaComprar(item),
    unidade: item.unit,
    precoUnitario: item.last_price,
  }
}

export function linhaDoAvulso(item: ShoppingExtra): LinhaCompra {
  return {
    nome: item.name,
    quantidade: item.quantity,
    unidade: item.unit,
    // Itens avulsos não guardam preço: são compras pontuais, sem histórico.
    precoUnitario: null,
  }
}

export type Estimativa = {
  total: number
  /** Quantas linhas entraram na conta. */
  comPreco: number
  /** Quantas ficaram de fora por não ter preço conhecido. */
  semPreco: number
}

/**
 * Soma o que dá para somar.
 *
 * O preço vem do `last_price`, que é o valor unitário da última compra
 * registrada — então isto é estimativa, não orçamento. Contar quantas linhas
 * ficaram de fora importa tanto quanto o total: um "R$ 30" que ignora metade
 * da lista em silêncio é pior do que número nenhum.
 */
export function calcularEstimativa(linhas: LinhaCompra[]): Estimativa {
  let total = 0
  let comPreco = 0
  let semPreco = 0

  for (const linha of linhas) {
    if (linha.precoUnitario === null || linha.precoUnitario <= 0) {
      semPreco++
      continue
    }

    // Sem quantidade declarada (caso dos avulsos), assume-se uma unidade.
    total += linha.precoUnitario * (linha.quantidade ?? 1)
    comPreco++
  }

  return { total, comPreco, semPreco }
}

/** "2 un - Arroz branco", ou só "Arroz branco" quando não há quantidade. */
export function formatarLinha(linha: LinhaCompra): string {
  if (linha.quantidade === null || linha.quantidade <= 0) return linha.nome

  const unidade = linha.unidade ? ` ${linha.unidade}` : ''
  return `${formatarQuantidade(linha.quantidade)}${unidade} - ${linha.nome}`
}

/**
 * Monta o texto que vai para a área de transferência.
 *
 * Formato pensado para colar no WhatsApp: sem markdown, sem tabela, sem
 * emoji — só linhas curtas que sobrevivem a qualquer app de mensagem.
 */
export function montarTextoDaLista(
  linhas: LinhaCompra[],
  estimativa: Estimativa,
): string {
  if (linhas.length === 0) return 'Lista de compras vazia.'

  const partes = ['Lista de compras', '', ...linhas.map(formatarLinha)]

  if (estimativa.comPreco > 0) {
    partes.push('', `Estimativa: ${formatarMoeda(estimativa.total)}`)

    if (estimativa.semPreco > 0) {
      partes.push(
        `(${estimativa.semPreco} ${estimativa.semPreco === 1 ? 'item sem preço' : 'itens sem preço'} de referência)`,
      )
    }
  }

  return partes.join('\n')
}
