'use client'

import { Input, Select } from '@/components/Field'
import { IconTrash } from '@/components/icons'
import { cn } from '@/lib/cn'
import { CATEGORIAS_ESTOQUE, UNIDADES } from '@/lib/constants'

/**
 * Os campos que as duas telas de revisão têm em comum.
 *
 * A entrada por foto e a alteração rápida montam linhas de formato diferente —
 * uma tem miniatura e vínculo, a outra tem o sinal de entrada/saída — mas
 * estes três pedaços eram idênticos nas duas, copiados um do outro. Ficavam
 * fáceis de corrigir só de um lado: foi o que quase aconteceu com a largura do
 * campo de quantidade.
 *
 * A linha inteira não vira componente de propósito: para servir aos dois
 * formatos ela precisaria de um punhado de props de "mostrar isso, esconder
 * aquilo", e aí a duplicação sai mais barata que a indireção.
 */

type CampoQuantidadeProps = {
  valor: string
  aoMudar: (valor: string) => void
  unidade: string
  /** Rótulo acessível; inclui a unidade porque é ela que dá sentido ao número. */
  rotulo: string
  /** Largura, quando a linha não é uma grade que já a define. */
  className?: string
}

/**
 * Quantidade com a unidade colada dentro do campo.
 *
 * Sem a unidade à vista, "1000" num item medido em ml parece erro de
 * digitação — e é justo o número certo depois de converter uma caixinha de 1 L.
 */
export function CampoQuantidade({
  valor,
  aoMudar,
  unidade,
  rotulo,
  className,
}: CampoQuantidadeProps) {
  return (
    <span className={cn('relative block', className)}>
      <Input
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        aria-label={rotulo}
        className="pr-12"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-2">
        {unidade}
      </span>
    </span>
  )
}

type CamposDeItemNovoProps = {
  categoria: string
  unidade: string
  aoMudarCategoria: (valor: string) => void
  aoMudarUnidade: (valor: string) => void
  /** Como os campos se identificam para o leitor de tela. */
  rotuloCategoria?: string
  rotuloUnidade?: string
  className?: string
}

/**
 * Categoria e unidade de um item que ainda vai ser cadastrado.
 *
 * Só aparecem quando não há vínculo: são os dois campos que o cadastro exige e
 * que nem a foto nem a fala entregam com certeza.
 */
export function CamposDeItemNovo({
  categoria,
  unidade,
  aoMudarCategoria,
  aoMudarUnidade,
  rotuloCategoria = 'Categoria do item novo',
  rotuloUnidade = 'Unidade do item novo',
  className,
}: CamposDeItemNovoProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      <Select
        value={categoria}
        onChange={(e) => aoMudarCategoria(e.target.value)}
        aria-label={rotuloCategoria}
      >
        {CATEGORIAS_ESTOQUE.map((c) => (
          <option key={c.valor} value={c.valor}>
            {c.rotulo}
          </option>
        ))}
      </Select>

      <Select
        value={unidade}
        onChange={(e) => aoMudarUnidade(e.target.value)}
        aria-label={rotuloUnidade}
      >
        {UNIDADES.map((u) => (
          <option key={u.valor} value={u.valor}>
            {u.rotulo}
          </option>
        ))}
      </Select>
    </div>
  )
}

type BotaoDescartarProps = {
  aoClicar: () => void
  rotulo: string
}

/** Tira uma linha da revisão, antes de qualquer coisa ser gravada. */
export function BotaoDescartar({ aoClicar, rotulo }: BotaoDescartarProps) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={rotulo}
      className="press-sm flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger"
    >
      <IconTrash />
    </button>
  )
}
