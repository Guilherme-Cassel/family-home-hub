'use client'

import { useRouter } from 'next/navigation'
import { useId, useRef, useState, useTransition } from 'react'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Input, Select, inputClasses } from '@/components/Field'
import { cn } from '@/lib/cn'
import { IconPlus, IconTrash } from '@/components/icons'
import { salvarEntradas } from '@/lib/actions/entradas'
import { CATEGORIAS_ESTOQUE, UNIDADES } from '@/lib/constants'
import { normalizar } from '@/lib/texto'
import type { StockEntry, StockItem } from '@/types/domain'

/** Só o que a tela precisa saber de cada item já cadastrado. */
export type ItemConhecido = Pick<
  StockItem,
  'id' | 'name' | 'unit' | 'category' | 'minimum_quantity'
>

type Linha = {
  chave: number
  nome: string
  quantidade: string
  unidade: string
  categoria: string
}

function linhaVazia(chave: number): Linha {
  return { chave, nome: '', quantidade: '1', unidade: 'un', categoria: 'outros' }
}

export function EntradaRapidaClient({ itens }: { itens: ItemConhecido[] }) {
  const router = useRouter()
  const listaId = useId()
  const [linhas, setLinhas] = useState<Linha[]>([linhaVazia(0), linhaVazia(1), linhaVazia(2)])
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()
  const proximaChave = useRef(3)

  /** Casamento exato por nome normalizado — a sugestão nativa cuida do resto. */
  function itemPorNome(nome: string): ItemConhecido | undefined {
    const alvo = normalizar(nome)
    if (!alvo) return undefined
    return itens.find((item) => normalizar(item.name) === alvo)
  }

  function atualizar(chave: number, mudanca: Partial<Linha>) {
    setLinhas((atuais) =>
      atuais.map((linha) => {
        if (linha.chave !== chave) return linha

        const atualizada = { ...linha, ...mudanca }

        // Ao reconhecer um item já cadastrado, a unidade dele passa a valer.
        if (mudanca.nome !== undefined) {
          const conhecido = itemPorNome(mudanca.nome)
          if (conhecido) {
            atualizada.unidade = conhecido.unit
            atualizada.categoria = conhecido.category
          }
        }

        return atualizada
      }),
    )
  }

  function adicionarLinha() {
    const chave = proximaChave.current++
    setLinhas((atuais) => [...atuais, linhaVazia(chave)])
    return chave
  }

  function removerLinha(chave: number) {
    setLinhas((atuais) =>
      atuais.length === 1 ? [linhaVazia(proximaChave.current++)] : atuais.filter((l) => l.chave !== chave),
    )
  }

  /**
   * Enter no fim de uma linha emenda a próxima, para dar para descarregar a
   * sacola inteira sem tirar a mão do teclado.
   */
  function aoTeclar(evento: React.KeyboardEvent, indice: number) {
    if (evento.key !== 'Enter') return
    evento.preventDefault()

    const ehUltima = indice === linhas.length - 1
    const chave = ehUltima ? adicionarLinha() : linhas[indice + 1].chave

    // O foco só pode ir para o campo depois que o React pintar a nova linha.
    requestAnimationFrame(() => {
      document.getElementById(`nome-${chave}`)?.focus()
    })
  }

  const preenchidas = linhas.filter((linha) => linha.nome.trim() !== '')

  function salvar() {
    setErro(null)

    if (preenchidas.length === 0) {
      setErro('Preencha pelo menos uma linha antes de salvar.')
      return
    }

    const entradas: StockEntry[] = []

    for (const linha of preenchidas) {
      const quantidade = Number(linha.quantidade.replace(',', '.'))
      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        setErro(`Quantidade inválida em "${linha.nome}".`)
        return
      }

      const conhecido = itemPorNome(linha.nome)

      entradas.push({
        stock_item_id: conhecido?.id ?? null,
        new_item: conhecido
          ? undefined
          : {
              name: linha.nome.trim(),
              category: linha.categoria,
              unit: linha.unidade,
              minimum_quantity: 0,
            },
        quantity_change: quantidade,
        reason: 'compra',
      })
    }

    startTransition(async () => {
      const resultado = await salvarEntradas(entradas)

      if (resultado.error) {
        setErro(resultado.error)
        return
      }

      router.push('/estoque')
    })
  }

  const novos = preenchidas.filter((linha) => !itemPorNome(linha.nome)).length

  return (
    <>
      <PageHeader
        titulo="Digitar itens"
        subtitulo="Comece a digitar e o app sugere o que já está cadastrado. Enter pula para a próxima linha."
        voltar="/entrada"
      />

      <div className="space-y-4">

      {/* Lista compartilhada por todas as linhas: o navegador cuida da sugestão. */}
      <datalist id={listaId}>
        {itens.map((item) => (
          <option key={item.id} value={item.name} />
        ))}
      </datalist>

      {erro ? <Alert>{erro}</Alert> : null}

      <ul className="space-y-2">
        {linhas.map((linha, indice) => {
          const conhecido = itemPorNome(linha.nome)
          const ehNovo = linha.nome.trim() !== '' && !conhecido

          return (
            <li key={linha.chave}>
              <Card className="space-y-2 rounded-item px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <input
                    id={`nome-${linha.chave}`}
                    list={listaId}
                    value={linha.nome}
                    onChange={(e) => atualizar(linha.chave, { nome: e.target.value })}
                    onKeyDown={(e) => aoTeclar(e, indice)}
                    placeholder={`Item ${indice + 1}`}
                    aria-label={`Nome do item da linha ${indice + 1}`}
                    className={cn(inputClasses, 'flex-1')}
                    autoComplete="off"
                  />

                  <Input
                    value={linha.quantidade}
                    onChange={(e) =>
                      atualizar(linha.chave, { quantidade: e.target.value })
                    }
                    onKeyDown={(e) => aoTeclar(e, indice)}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    aria-label={`Quantidade da linha ${indice + 1}`}
                    className="w-20 shrink-0"
                  />

                  <button
                    type="button"
                    onClick={() => removerLinha(linha.chave)}
                    aria-label={`Remover linha ${indice + 1}`}
                    className="press-sm flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger"
                  >
                    <IconTrash />
                  </button>
                </div>

                {conhecido ? (
                  <div className="flex items-center gap-2">
                    <Badge tone="success">Já cadastrado</Badge>
                    <span className="text-xs text-ink-2">
                      Tem {conhecido.name} · unidade {conhecido.unit}
                    </span>
                  </div>
                ) : ehNovo ? (
                  <div className="space-y-2">
                    <Badge tone="info">Item novo — será criado agora</Badge>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={linha.categoria}
                        onChange={(e) =>
                          atualizar(linha.chave, { categoria: e.target.value })
                        }
                        aria-label={`Categoria do item novo da linha ${indice + 1}`}
                      >
                        {CATEGORIAS_ESTOQUE.map((c) => (
                          <option key={c.valor} value={c.valor}>
                            {c.rotulo}
                          </option>
                        ))}
                      </Select>

                      <Select
                        value={linha.unidade}
                        onChange={(e) =>
                          atualizar(linha.chave, { unidade: e.target.value })
                        }
                        aria-label={`Unidade do item novo da linha ${indice + 1}`}
                      >
                        {UNIDADES.map((u) => (
                          <option key={u.valor} value={u.valor}>
                            {u.rotulo}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ) : null}
              </Card>
            </li>
          )
        })}
      </ul>

      <Button variant="secondary" onClick={adicionarLinha} className="w-full">
        <IconPlus width={18} height={18} />
        Adicionar linha
      </Button>

      <div className="safe-bottom sticky bottom-nav z-20 -mx-4 border-t border-line glass px-4 py-3 backdrop-blur">
        <p className="mb-2 text-xs text-ink-2">
          {preenchidas.length === 0
            ? 'Nenhuma linha preenchida.'
            : `${preenchidas.length} ${preenchidas.length === 1 ? 'linha' : 'linhas'}` +
              (novos > 0 ? ` · ${novos} ${novos === 1 ? 'item novo' : 'itens novos'}` : '')}
        </p>
        <Button
          size="lg"
          className="w-full"
          onClick={salvar}
          disabled={pendente || preenchidas.length === 0}
        >
          {pendente ? 'Salvando…' : 'Salvar tudo'}
        </Button>
      </div>
      </div>
    </>
  )
}
