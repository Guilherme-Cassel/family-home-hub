import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Junta classes resolvendo conflitos do Tailwind.
 *
 * O `clsx` sozinho só concatena, e em CSS quem decide o vencedor é a ordem na
 * folha de estilo, não a ordem no atributo. Então `w-full` da base de um
 * componente ganhava de um `w-24` passado por quem usa — o campo esticava,
 * espremia o vizinho e o nome do ingrediente sumia da tela.
 *
 * O `twMerge` conhece os grupos do Tailwind e deixa só a última classe de cada
 * grupo, que é o comportamento que quem escreve `className="w-24"` espera.
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes))
}
