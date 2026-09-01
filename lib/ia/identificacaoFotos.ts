import { itemPorIndice } from '@/lib/ia/catalogo'
import { normalizarUnidade } from '@/lib/medidas'
import type { IdentificacaoIA } from '@/types/ia'

/**
 * Higienizacao da resposta da IA para a entrada por foto.
 *
 * Fora da rota para poder ser testada sem subir servidor nem gastar cota: e
 * aqui que mora a regra que impede um indice inventado pelo modelo de virar
 * vinculo com o item errado.
 *
 * Descarta o que veio fora do contrato sem derrubar o lote todo: uma linha
 * estranha nao pode custar as outras cinco fotos.
 */
export function sanitizarIdentificacoes(
  bruto: unknown,
  totalFotos: number,
  catalogo: { id: string }[],
): IdentificacaoIA[] {
  if (!Array.isArray(bruto)) return []

  const confiancasValidas = new Set(['alta', 'media', 'baixa'])
  const vistos = new Set<number>()
  const resultados: IdentificacaoIA[] = []

  for (const linha of bruto) {
    if (typeof linha !== 'object' || linha === null) continue

    const registro = linha as Record<string, unknown>
    const indice = Number(registro.indice)

    if (!Number.isInteger(indice) || indice < 0 || indice >= totalFotos) continue
    if (vistos.has(indice)) continue
    vistos.add(indice)

    const confianca = String(registro.confianca ?? '').toLowerCase()

    // O índice do cadastro é resolvido aqui, contra a lista real que foi
    // enviada no prompt. Um índice inventado ou fora da faixa simplesmente
    // não vira vínculo, em vez de apontar para o item errado.
    const item = itemPorIndice(registro.indice_cadastro, catalogo)

    // Só passa adiante o rótulo que dá para usar: quantidade positiva e
    // unidade conhecida pelo app. Qualquer outra coisa vira null, e a revisão
    // entra com 1 como sempre entrou.
    const quantidadeEmbalagem = Number(registro.quantidade_embalagem)
    const unidadeEmbalagem = normalizarUnidade(String(registro.unidade_embalagem ?? ''))
    const embalagem =
      Number.isFinite(quantidadeEmbalagem) &&
      quantidadeEmbalagem > 0 &&
      unidadeEmbalagem !== null
        ? { quantidade: quantidadeEmbalagem, unidade: unidadeEmbalagem }
        : null

    resultados.push({
      indice,
      nome_identificado: String(registro.nome_identificado ?? '').trim(),
      categoria_sugerida: String(registro.categoria_sugerida ?? 'outros').trim(),
      confianca: confiancasValidas.has(confianca)
        ? (confianca as IdentificacaoIA['confianca'])
        : 'baixa',
      stock_item_id: item?.id ?? null,
      embalagem,
    })
  }

  return resultados
}
