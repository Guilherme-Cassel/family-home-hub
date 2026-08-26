'use client'

import clsx from 'clsx'
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

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-2xl">
        {ITENS.map(({ href, label, Icon }) => {
          const ativo =
            href === '/' ? pathname === '/' : pathname.startsWith(href)

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={clsx(
                  'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  ativo ? 'text-brand-700' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Icon className={clsx(ativo && 'stroke-[2.1]')} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
