import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

type Props = {
  tone?: 'error' | 'warning' | 'info' | 'success'
  children: ReactNode
}

const TONES = {
  error: 'bg-danger-soft text-danger-ink',
  warning: 'bg-warn-soft text-warn-ink',
  info: 'bg-info-soft text-info-ink',
  success: 'bg-ok-soft text-ok-ink',
}

/** Mensagem de erro ou aviso, sempre em português, para estados assíncronos. */
export function Alert({ tone = 'error', children }: Props) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-item px-4 py-3 text-sm font-medium',
        TONES[tone],
      )}
    >
      {children}
    </div>
  )
}
