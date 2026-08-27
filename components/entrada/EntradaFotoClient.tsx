'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Input, Select, inputClasses } from '@/components/Field'
import { IconCamera, IconPlus, IconTrash } from '@/components/icons'
import type { ItemConhecido } from './EntradaRapidaClient'
import { salvarEntradas } from '@/lib/actions/entradas'
import { CATEGORIAS_ESTOQUE, UNIDADES } from '@/lib/constants'
import { LIMIAR_MATCH_AUTOMATICO, melhorCorrespondencia } from '@/lib/fuzzyMatch'
import { identificarFotos } from '@/lib/geminiClient'
import { comprimirImagem, type FotoCapturada } from '@/lib/imagem'
import type { StockEntry } from '@/types/domain'
import type { NivelConfianca } from '@/types/ia'

type Etapa = 'captura' | 'processando' | 'revisao'

type Linha = {
  fotoId: string
  preview: string
  nome: string
  categoria: string
  unidade: string
  confianca: NivelConfianca
  /** null = criar item novo com o nome digitado. */
  vinculoId: string | null
  quantidade: string
  /** Se o vínculo veio de casamento automático, para sinalizar na tela. */
  automatico: boolean
}

type Props = {
  itens: ItemConhecido[]
  tamanhoLote: number
}

export function EntradaFotoClient({ itens, tamanhoLote }: Props) {
  const router = useRouter()
  const [etapa, setEtapa] = useState<Etapa>('captura')
  const [fotos, setFotos] = useState<FotoCapturada[]>([])
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [progresso, setProgresso] = useState({ de: 0, ate: 0, total: 0 })
  const [erro, setErro] = useState<string | null>(null)
  const [erroDeCota, setErroDeCota] = useState(false)
  const [salvando, startTransition] = useTransition()

  // As miniaturas são blob: URLs; sem revoke elas seguram memória até a aba
  // fechar, o que pesa num celular depois de uma compra grande.
  const fotosRef = useRef<FotoCapturada[]>([])
  useEffect(() => {
    fotosRef.current = fotos
  }, [fotos])
  useEffect(() => {
    return () => {
      for (const foto of fotosRef.current) URL.revokeObjectURL(foto.preview)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Etapa 1 — captura
  // -------------------------------------------------------------------------

  async function aoEscolherArquivos(event: React.ChangeEvent<HTMLInputElement>) {
    const entrada = event.target
    const arquivos = Array.from(entrada.files ?? [])
    if (arquivos.length === 0) return

    setErro(null)

    // allSettled, não all: com `all`, uma única foto problemática descartava
    // todas as outras do mesmo lote junto com ela.
    const resultados = await Promise.allSettled(arquivos.map((a) => comprimirImagem(a)))

    // Só limpa o input depois de ler os arquivos. Alguns navegadores de
    // celular invalidam o File assim que o input é resetado, e limpar antes
    // fazia a foto sumir sem erro nenhum.
    entrada.value = ''

    const prontas = resultados
      .filter((r): r is PromiseFulfilledResult<FotoCapturada> => r.status === 'fulfilled')
      .map((r) => r.value)

    if (prontas.length > 0) {
      setFotos((atuais) => [...atuais, ...prontas])
    }

    const falhas = resultados.filter((r) => r.status === 'rejected')
    if (falhas.length > 0) {
      const motivo =
        falhas[0].status === 'rejected' && falhas[0].reason instanceof Error
          ? falhas[0].reason.message
          : 'motivo desconhecido'

      setErro(
        falhas.length === arquivos.length
          ? `Não foi possível ler a foto: ${motivo}.`
          : `${falhas.length} de ${arquivos.length} fotos não puderam ser lidas (${motivo}). As demais estão abaixo.`,
      )
    }
  }

  function removerFoto(id: string) {
    setFotos((atuais) => {
      const alvo = atuais.find((foto) => foto.id === id)
      if (alvo) URL.revokeObjectURL(alvo.preview)
      return atuais.filter((foto) => foto.id !== id)
    })
  }

  // -------------------------------------------------------------------------
  // Etapa 2 — processamento
  // -------------------------------------------------------------------------

  /** Decide o que já vai vinculado, com dois sinais independentes. */
  function montarLinha(
    foto: FotoCapturada,
    nome: string,
    categoria: string,
    confianca: NivelConfianca,
    stockItemId: string | null,
  ): Linha {
    // Sinal 1, mais forte: a própria IA apontou um item do cadastro. Ela vê a
    // lista junto com as fotos e sabe que "Caixinha de Leite 1L" e uma caixa
    // de leite integral são o mesmo produto — coisa que comparar texto nunca
    // resolveria (essas duas pontuam 0.50, bem abaixo do limiar).
    const escolhidoPelaIA =
      stockItemId && confianca !== 'baixa'
        ? (itens.find((item) => item.id === stockItemId) ?? null)
        : null

    // Sinal 2, de reserva: similaridade de texto, para quando a IA não
    // apontou nada mas o nome bate quase exatamente.
    const correspondencia =
      !escolhidoPelaIA && nome ? melhorCorrespondencia(nome, itens) : null

    // Vínculo automático exige um dos dois sinais E a própria IA confiante.
    // Errar aqui credita a compra no item errado e só aparece quando a
    // despensa não bate — dois toques a mais na revisão saem mais barato.
    const porTexto =
      correspondencia !== null &&
      correspondencia.pontuacao >= LIMIAR_MATCH_AUTOMATICO &&
      confianca !== 'baixa'

    const automatico = escolhidoPelaIA !== null || porTexto
    const vinculado = escolhidoPelaIA ?? (porTexto ? correspondencia.item : null)

    return {
      fotoId: foto.id,
      preview: foto.preview,
      nome: vinculado?.name ?? nome,
      categoria: vinculado?.category ?? categoria,
      unidade: vinculado?.unit ?? 'un',
      confianca,
      vinculoId: vinculado?.id ?? null,
      quantidade: '1',
      automatico,
    }
  }

  async function processar() {
    if (fotos.length === 0) return

    setEtapa('processando')
    setErro(null)
    setErroDeCota(false)
    setProgresso({ de: 0, ate: 0, total: fotos.length })

    const montadas: Linha[] = []

    // Lotes em vez de uma requisição por foto: a cota diária gratuita do Flash
    // é de poucas dezenas de requisições, então uma compra inteira caberia mal.
    for (let inicio = 0; inicio < fotos.length; inicio += tamanhoLote) {
      const lote = fotos.slice(inicio, inicio + tamanhoLote)
      setProgresso({ de: inicio + 1, ate: inicio + lote.length, total: fotos.length })

      try {
        const resultados = await identificarFotos(lote.map((foto) => foto.enviavel))
        const porIndice = new Map(resultados.map((r) => [r.indice, r]))

        lote.forEach((foto, posicao) => {
          const resultado = porIndice.get(posicao)
          montadas.push(
            montarLinha(
              foto,
              resultado?.nome_identificado ?? '',
              resultado?.categoria_sugerida ?? 'outros',
              resultado?.confianca ?? 'baixa',
              resultado?.stock_item_id ?? null,
            ),
          )
        })
      } catch (falha) {
        const mensagem =
          falha instanceof Error ? falha.message : 'A IA não conseguiu responder.'

        // Se algum lote já passou, vale a pena revisar o que deu certo em vez
        // de jogar fora o trabalho inteiro.
        if (montadas.length > 0) {
          setErro(`${mensagem} As fotos já processadas estão abaixo.`)
          setLinhas(montadas)
          setEtapa('revisao')
        } else {
          setErro(mensagem)
          setErroDeCota(mensagem.toLowerCase().includes('cota'))
          setEtapa('captura')
        }
        return
      }
    }

    setLinhas(montadas)
    setEtapa('revisao')
  }

  // -------------------------------------------------------------------------
  // Etapa 3 — revisão
  // -------------------------------------------------------------------------

  function atualizarLinha(fotoId: string, mudanca: Partial<Linha>) {
    setLinhas((atuais) =>
      atuais.map((linha) => {
        if (linha.fotoId !== fotoId) return linha

        const atualizada = { ...linha, ...mudanca, automatico: false }

        // Trocar o vínculo puxa unidade e categoria do item escolhido.
        if (mudanca.vinculoId !== undefined && mudanca.vinculoId !== null) {
          const escolhido = itens.find((item) => item.id === mudanca.vinculoId)
          if (escolhido) {
            atualizada.nome = escolhido.name
            atualizada.unidade = escolhido.unit
            atualizada.categoria = escolhido.category
          }
        }

        return atualizada
      }),
    )
  }

  function removerLinha(fotoId: string) {
    setLinhas((atuais) => atuais.filter((linha) => linha.fotoId !== fotoId))
  }

  const pendentes = linhas.filter(
    (linha) => linha.vinculoId === null && linha.nome.trim() === '',
  ).length

  function confirmar() {
    setErro(null)

    if (pendentes > 0) {
      setErro(
        `${pendentes} ${pendentes === 1 ? 'foto ainda precisa' : 'fotos ainda precisam'} ` +
          'de um item vinculado ou de um nome para criar.',
      )
      return
    }

    const entradas: StockEntry[] = []

    for (const linha of linhas) {
      const quantidade = Number(linha.quantidade.replace(',', '.'))
      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        setErro(`Quantidade inválida em "${linha.nome || 'item sem nome'}".`)
        return
      }

      entradas.push({
        stock_item_id: linha.vinculoId,
        new_item: linha.vinculoId
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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (etapa === 'processando') {
    return (
      <div className="space-y-4 py-12 text-center">
        <div
          className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-slate-200 border-t-brand-600"
          role="status"
          aria-label="Processando"
        />
        <p className="font-medium text-slate-900">
          {progresso.de === progresso.ate
            ? `Processando foto ${progresso.de} de ${progresso.total}…`
            : `Processando fotos ${progresso.de} a ${progresso.ate} de ${progresso.total}…`}
        </p>
        <p className="text-sm text-slate-500">
          As fotos vão em lotes de {tamanhoLote} para gastar menos da cota diária
          da IA.
        </p>
      </div>
    )
  }

  if (etapa === 'revisao') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Revisar antes de salvar</h1>
          <p className="mt-1 text-sm text-slate-500">
            Nada foi gravado ainda. Confira os vínculos e as quantidades.
          </p>
        </div>

        {erro ? <Alert>{erro}</Alert> : null}

        {linhas.length === 0 ? (
          <EmptyState
            title="Nenhuma foto para revisar"
            description="Volte e tire as fotos dos produtos."
            action={
              <Button variant="secondary" onClick={() => setEtapa('captura')}>
                Voltar para a captura
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {linhas.map((linha) => {
              const precisaAtencao = linha.vinculoId === null

              return (
                <li key={linha.fotoId}>
                  <Card className="space-y-3 p-3">
                    <div className="flex gap-3">
                      <Image
                        src={linha.preview}
                        alt=""
                        width={64}
                        height={64}
                        unoptimized
                        className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                      />

                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          value={linha.nome}
                          onChange={(e) =>
                            atualizarLinha(linha.fotoId, {
                              nome: e.target.value,
                              vinculoId: null,
                            })
                          }
                          placeholder="Nome do produto"
                          aria-label="Nome identificado"
                          className={inputClasses}
                        />

                        <div className="flex flex-wrap items-center gap-1.5">
                          {linha.automatico ? (
                            <Badge tone="success">Identificado</Badge>
                          ) : precisaAtencao ? (
                            <Badge tone="warning">Revisar</Badge>
                          ) : (
                            <Badge tone="info">Vínculo manual</Badge>
                          )}
                          <Badge
                            tone={
                              linha.confianca === 'alta'
                                ? 'neutral'
                                : linha.confianca === 'media'
                                  ? 'warning'
                                  : 'danger'
                            }
                          >
                            IA: confiança {linha.confianca}
                          </Badge>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removerLinha(linha.fotoId)}
                        aria-label="Descartar esta foto"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <IconTrash />
                      </button>
                    </div>

                    <div className="grid grid-cols-[1fr_5rem] gap-2">
                      <Select
                        value={linha.vinculoId ?? ''}
                        onChange={(e) =>
                          atualizarLinha(linha.fotoId, {
                            vinculoId: e.target.value || null,
                          })
                        }
                        aria-label="Item do cadastro vinculado"
                      >
                        <option value="">Criar item novo</option>
                        {itens.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </Select>

                      <Input
                        value={linha.quantidade}
                        onChange={(e) =>
                          atualizarLinha(linha.fotoId, { quantidade: e.target.value })
                        }
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        aria-label="Quantidade"
                      />
                    </div>

                    {linha.vinculoId === null ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={linha.categoria}
                          onChange={(e) =>
                            atualizarLinha(linha.fotoId, { categoria: e.target.value })
                          }
                          aria-label="Categoria do item novo"
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
                            atualizarLinha(linha.fotoId, { unidade: e.target.value })
                          }
                          aria-label="Unidade do item novo"
                        >
                          {UNIDADES.map((u) => (
                            <option key={u.valor} value={u.valor}>
                              {u.rotulo}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : null}
                  </Card>
                </li>
              )
            })}
          </ul>
        )}

        {linhas.length > 0 ? (
          <div className="safe-bottom sticky bottom-nav z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <p className="mb-2 text-xs text-slate-500">
              {linhas.length} {linhas.length === 1 ? 'item' : 'itens'}
              {pendentes > 0 ? ` · ${pendentes} sem vínculo` : ''}
            </p>
            <Button size="lg" className="w-full" onClick={confirmar} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Confirmar e salvar tudo'}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  // Etapa 1 — captura
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Fotografar as compras</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tire uma foto por produto. Nada é enviado até você tocar em processar.
        </p>
      </div>

      {erro ? (
        <Alert>
          <p>{erro}</p>
          {erroDeCota ? (
            <Link
              href="/entrada-rapida"
              className="mt-2 inline-block font-medium underline"
            >
              Digitar os itens manualmente
            </Link>
          ) : null}
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex h-13 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 font-medium text-white active:bg-brand-700">
          <IconCamera width={20} height={20} />
          Tirar foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={aoEscolherArquivos}
            className="sr-only"
          />
        </label>

        <label className="flex h-13 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-slate-800 ring-1 ring-slate-300 active:bg-slate-100">
          <IconPlus width={20} height={20} />
          Da galeria
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={aoEscolherArquivos}
            className="sr-only"
          />
        </label>
      </div>

      {fotos.length === 0 ? (
        <EmptyState
          title="Nenhuma foto ainda"
          description="Fotografe os produtos um a um. Dá para tirar várias em sequência e revisar antes de enviar."
        />
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-2">
            {fotos.map((foto, indice) => (
              <li key={foto.id} className="relative">
                <Image
                  src={foto.preview}
                  alt={`Foto ${indice + 1}`}
                  width={160}
                  height={160}
                  unoptimized
                  className="aspect-square w-full rounded-xl object-cover ring-1 ring-slate-200"
                />
                <button
                  type="button"
                  onClick={() => removerFoto(foto.id)}
                  aria-label={`Remover foto ${indice + 1}`}
                  className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur"
                >
                  <IconTrash width={16} height={16} />
                </button>
              </li>
            ))}
          </ul>

          <div className="safe-bottom sticky bottom-nav z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <p className="mb-2 text-xs text-slate-500">
              {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'} ·{' '}
              {Math.ceil(fotos.length / tamanhoLote)}{' '}
              {Math.ceil(fotos.length / tamanhoLote) === 1
                ? 'requisição à IA'
                : 'requisições à IA'}
            </p>
            <Button size="lg" className="w-full" onClick={processar}>
              Processar {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
