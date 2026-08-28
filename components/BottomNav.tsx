'use client'

import { cn } from '@/lib/cn'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconBox,
  IconCart,
  IconChef,
  IconHome,
  IconWrench,
} from '@/components/icons'

const ITENS = [
  { href: '/', label: 'Início', Icon: IconHome },
  { href: '/estoque', label: 'Estoque', Icon: IconBox },
  { href: '/compras', label: 'Compras', Icon: IconCart },
  { href: '/manutencao', label: 'Manutenção', Icon: IconWrench },
  { href: '/receitas', label: 'Receitas', Icon: IconChef },
]

/**
 * Navegação em cápsula flutuante, translúcida, como a da One UI 7/8. O item
 * ativo ganha uma pílula de fundo atrás do ícone, não só a cor.
 */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-3 pt-2">
      <nav
        aria-label="Navegação principal"
        className="glass mx-auto flex h-[66px] max-w-xl rounded-[30px] px-1.5 shadow-[0_0_0_1px_var(--color-line),0_12px_32px_-10px_rgb(0_0_0/0.28)]"
      >
        <ul className="flex w-full">
          {ITENS.map(({ href, label, Icon }) => {
            const ativo =
              href === '/' ? pathname === '/' : pathname.startsWith(href)

            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={ativo ? 'page' : undefined}
                  className={cn(
                    'press-sm flex h-full flex-col items-center justify-center gap-[3px]',
                    'rounded-3xl text-[11px] font-semibold tracking-[-0.005em]',
                    'transition-colors',
                    ativo ? 'text-accent' : 'text-ink-2 hover:text-ink',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-[26px] w-[46px] place-items-center rounded-full transition-colors',
                      ativo && 'bg-accent-soft',
                    )}
                  >
                    <Icon
                      width={21}
                      height={21}
                      strokeWidth={ativo ? 2.2 : 1.9}
                    />
                  </span>
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
