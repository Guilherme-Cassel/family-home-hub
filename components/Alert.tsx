import clsx from 'clsx'
import type { ReactNode } from 'react'

type Props = {
  tone?: 'error' | 'warning' | 'info' | 'success'
  children: ReactNode
}

const TONES = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  info: 'bg-sky-50 text-sky-900 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
}

/** Mensagem de erro ou aviso, sempre em português, para estados assíncronos. */
export function Alert({ tone = 'error', children }: Props) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx('rounded-xl px-3 py-2.5 text-sm ring-1 ring-inset', TONES[tone])}
    >
      {children}
    </div>
  )
}
