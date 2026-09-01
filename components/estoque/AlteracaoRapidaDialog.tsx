'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Textarea } from '@/components/Field'
import {
  BotaoDescartar,
  CampoQuantidade,
  CamposDeItemNovo,
} from '@/components/CamposDeRevisao'
import { salvarAlteracoes, type AlteracaoRevisada } from '@/app/(app)/estoque/actions'
import { cn } from '@/lib/cn'
import { interpretarAlteracao } from '@/lib/geminiClient'
import type { StockItem } from '@/types/domain'

type Etapa = 'texto' | 'pensando' | 'revisao'

type Linha = {
  id: string
  /** null quando o produto ainda não existe no cadastro. */
  stockItemId: string | null
  nome: string
  unidade: string
  categoria: string
  quantidade: string
  tipo: 'entrada' | 'saida'
  /** Saldo do item antes da alteração, para mostrar no que vai dar. */
  saldo: number
  /** Como a medida foi dita, quando diferente da unidade do item. */
  falado: string | null
  /** A medida falada não converte para a unidade do item: confira. */
  duvidoso: boolean
}

type Props = {
  itens: StockItem[]
  aoFechar: () => void
}

/**
 * Alterar o estoque escrevendo ou ditando uma frase, para os dois lados.
 *
 * "Usei dois ovos" tira; "comprei dois litros de leite" põe. Uma frase só pode
 * ter os dois, que é o caso de voltar do mercado tendo cozinhado antes.
 *
 * A ditadura por voz é a do próprio teclado do celular: o campo é de texto
 * comum, e o microfone do teclado transcreve nele. Isso evita depender de API
 * de reconhecimento de fala do navegador, que muda de comportamento entre
 * Android e iOS, e funciona igual nos dois.
 *
 * Nada é gravado direto: a frase vira uma lista que o usuário confere, com o
 * sinal de cada linha invertível num toque. Transcrição de voz erra, e estoque
 * errado só aparece quando falta comida na hora de cozinhar.
 */
export function AlteracaoRapidaDialog({ itens, aoFechar }: Props) {
  const router = useRouter()
  const [etapa, setEtapa] = useState<Etapa>('texto')
  const [texto, setTexto] = useState('')
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [naoEncontrados, setNaoEncontrados] = useState<string[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, startTransition] = useTransition()

  const campoRef = useRef<HTMLTextAreaElement>(null)

  // Abrir já com o cursor no campo é o que faz o teclado subir sozinho — e é
  // do teclado que sai o microfone.
  useEffect(() => {
    campoRef.current?.focus()
  }, [])

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') aoFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  async function interpretar() {
    const frase = texto.trim()
    if (!frase) return

    setEtapa('pensando')
    setErro(null)

    try {
      const alteracoes = await interpretarAlteracao(frase)

      // Produto sem cadastro entra na revisão como item a criar — mas só do
      // lado da entrada. Dar baixa em algo que a casa nunca teve seria criar
      // um item para deixá-lo em zero, e aí é engano de fala ou de item.
      const utilizaveis = alteracoes.filter(
        (a) => a.stock_item_id !== null || a.tipo === 'entrada',
      )
      const perdidas = alteracoes.filter(
        (a) => a.stock_item_id === null && a.tipo !== 'entrada',
      )

      if (utilizaveis.length === 0) {
        setErro(
          perdidas.length > 0
            ? `Não achei no estoque: ${perdidas.map((a) => a.nome).join(', ')}.`
            : 'Não entendi nenhum item nessa frase. Tente algo como "usei dois ovos".',
        )
        setEtapa('texto')
        return
      }

      setLinhas(
        utilizaveis.map((alteracao, indice) => {
          const item = itens.find((i) => i.id === alteracao.stock_item_id)
          return {
            id: `${alteracao.stock_item_id}-${indice}`,
            stockItemId: alteracao.stock_item_id,
            nome: item?.name ?? alteracao.nome,
            unidade: item?.unit ?? alteracao.unidade,
            categoria: item?.category ?? alteracao.categoria,
            quantidade: String(alteracao.quantidade),
            tipo: alteracao.tipo,
            saldo: item?.current_quantity ?? 0,
            falado: alteracao.falado,
            duvidoso: !alteracao.convertido,
          }
        }),
      )
      setNaoEncontrados(perdidas.map((a) => a.nome))
      setEtapa('revisao')
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'A IA não conseguiu responder.')
      setEtapa('texto')
    }
  }

  function mudarLinha(id: string, mudanca: Partial<Linha>) {
    setLinhas((atuais) =>
      atuais.map((linha) => (linha.id === id ? { ...linha, ...mudanca } : linha)),
    )
  }

  function confirmar() {
    setErro(null)

    const revisadas: AlteracaoRevisada[] = []
    for (const linha of linhas) {
      const quantidade = Number(linha.quantidade.replace(',', '.'))
      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        setErro(`Quantidade inválida em "${linha.nome}".`)
        return
      }
      revisadas.push({
        stock_item_id: linha.stockItemId,
        novo_item: linha.stockItemId
          ? undefined
          : {
              name: linha.nome.trim(),
              category: linha.categoria,
              unit: linha.unidade,
            },
        quantidade,
        tipo: linha.tipo,
      })
    }

    startTransition(async () => {
      const resultado = await salvarAlteracoes(revisadas)

      if (resultado.error) {
        setErro(resultado.error)
        return
      }

      router.refresh()
      aoFechar()
    })
  }

  const saidas = linhas.filter((l) => l.tipo === 'saida').length
  const entradas = linhas.length - saidas

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar"
        className="absolute inset-0 bg-black/50"
      />

      {/* Folha de baixo: a mão já está embaixo, e o teclado sobe daí. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Alteração rápida"
        className="relative max-h-[85dvh] overflow-y-auto rounded-t-card bg-surface px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden="true" />

        <h2 className="text-[19px] font-bold tracking-[-0.01em] text-ink">
          Alteração rápida
        </h2>
        <p className="mt-1 mb-4 text-[15px] text-ink-2">
          {etapa === 'revisao'
            ? 'Confira os sinais e as quantidades. Nada foi gravado ainda.'
            : 'Escreva ou dite pelo microfone do teclado o que usou e o que comprou.'}
        </p>

        {erro ? (
          <div className="mb-3">
            <Alert>{erro}</Alert>
          </div>
        ) : null}

        {etapa === 'revisao' ? (
          <>
            {naoEncontrados.length > 0 ? (
              <p className="mb-3 text-sm text-ink-2">
                Fora do estoque, sem alteração: {naoEncontrados.join(', ')}.
              </p>
            ) : null}

            <ul className="space-y-2">
              {linhas.map((linha) => {
                const pedido = Number(linha.quantidade.replace(',', '.'))
                const entrada = linha.tipo === 'entrada'
                const sobra = Number.isFinite(pedido)
                  ? linha.saldo + (entrada ? pedido : -pedido)
                  : null

                const novo = linha.stockItemId === null

                return (
                  <li key={linha.id} className="rounded-item bg-surface-2 px-3 py-2.5">
                    {/* Item novo ganha a linha inteira para o nome: é campo de
                        texto, e espremido entre o sinal e a quantidade não
                        cabia nem "Arroz branco". */}
                    {novo ? (
                      <input
                        value={linha.nome}
                        onChange={(e) => mudarLinha(linha.id, { nome: e.target.value })}
                        aria-label="Nome do item novo"
                        placeholder="Nome do item"
                        className="mb-2 w-full rounded-field bg-surface px-3 py-2 font-semibold text-ink ring-1 ring-line placeholder:text-ink-3 focus:ring-2 focus:ring-accent focus:outline-none"
                      />
                    ) : null}

                    <div className="flex items-center gap-2">
                      {/* O sinal é o que decide se o item sobe ou desce, então
                          é ele que precisa estar a um toque de ser corrigido.
                          Item novo não inverte: baixa de algo que não existe
                          criaria um cadastro só para deixá-lo em zero. */}
                      <button
                        type="button"
                        onClick={() =>
                          mudarLinha(linha.id, { tipo: entrada ? 'saida' : 'entrada' })
                        }
                        disabled={novo}
                        aria-label={
                          novo
                            ? `${linha.nome}: item novo, só entrada`
                            : `${linha.nome}: ${entrada ? 'entrada' : 'saída'}. Tocar para inverter`
                        }
                        className={cn(
                          'press-sm grid h-11 w-11 shrink-0 place-items-center rounded-full',
                          'text-xl font-bold disabled:opacity-60 disabled:active:scale-100',
                          entrada
                            ? 'bg-ok-soft text-ok-ink'
                            : 'bg-danger-soft text-danger-ink',
                        )}
                      >
                        {entrada ? '+' : '−'}
                      </button>

                      <div className="min-w-0 flex-1">
                        {novo ? null : (
                          <p className="truncate font-semibold text-ink">{linha.nome}</p>
                        )}
                        <p className={cn('text-xs text-ink-2', !novo && 'mt-0.5')}>
                          {novo
                            ? `entra com ${linha.quantidade || 0} ${linha.unidade}`
                            : `tem ${linha.saldo} ${linha.unidade}` +
                              (sobra !== null ? ` · fica ${Math.max(sobra, 0)}` : '') +
                              (sobra !== null && sobra < 0
                                ? ' (tira mais do que tem)'
                                : '')}
                        </p>
                      </div>

                      <CampoQuantidade
                        valor={linha.quantidade}
                        aoMudar={(quantidade) => mudarLinha(linha.id, { quantidade })}
                        unidade={linha.unidade}
                        rotulo={`Quantidade de ${linha.nome} em ${linha.unidade}`}
                        className="w-28 shrink-0"
                      />

                      <BotaoDescartar
                        aoClicar={() =>
                          setLinhas((atuais) => atuais.filter((l) => l.id !== linha.id))
                        }
                        rotulo={`Tirar ${linha.nome} da lista`}
                      />
                    </div>

                    {linha.falado || linha.duvidoso || novo ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {novo ? <Badge tone="info">Item novo</Badge> : null}
                        {linha.falado ? (
                          <Badge tone="neutral">Você disse: {linha.falado}</Badge>
                        ) : null}
                        {linha.duvidoso ? (
                          <Badge tone="warning">Confira a medida</Badge>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Categoria e unidade só aparecem para item novo: são os
                        campos que o cadastro precisa e que a fala não dá. */}
                    {novo ? (
                      <CamposDeItemNovo
                        categoria={linha.categoria}
                        unidade={linha.unidade}
                        aoMudarCategoria={(categoria) =>
                          mudarLinha(linha.id, { categoria })
                        }
                        aoMudarUnidade={(unidade) => mudarLinha(linha.id, { unidade })}
                        rotuloCategoria={`Categoria de ${linha.nome}`}
                        rotuloUnidade={`Unidade de ${linha.nome}`}
                        className="mt-2"
                      />
                    ) : null}
                  </li>
                )
              })}
            </ul>

            <p className="mt-3 text-xs text-ink-2">
              {entradas > 0 ? `${entradas} entrada${entradas > 1 ? 's' : ''}` : ''}
              {entradas > 0 && saidas > 0 ? ' · ' : ''}
              {saidas > 0 ? `${saidas} saída${saidas > 1 ? 's' : ''}` : ''}
            </p>

            <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
              <Button variant="neutral" onClick={() => setEtapa('texto')}>
                Voltar
              </Button>
              <Button onClick={confirmar} disabled={salvando || linhas.length === 0}>
                {salvando ? 'Gravando…' : 'Confirmar'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Textarea
              ref={campoRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              placeholder="Usei dois ovos e comprei dois litros de leite"
              aria-label="O que mudou no estoque"
              disabled={etapa === 'pensando'}
            />

            <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
              <Button variant="neutral" onClick={aoFechar}>
                Cancelar
              </Button>
              <Button
                onClick={interpretar}
                disabled={etapa === 'pensando' || texto.trim() === ''}
              >
                {etapa === 'pensando' ? 'Entendendo…' : 'Continuar'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
