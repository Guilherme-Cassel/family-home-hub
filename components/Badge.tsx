import { cn } from '@/lib/cn'
import type { ComponentProps } from 'react'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  success: 'bg-ok-soft text-ok-ink',
  warning: 'bg-warn-soft text-warn-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
}

type Props = ComponentProps<'span'> & { tone?: BadgeTone }

/** Selo em pílula, com fundo suave e texto na tinta do mesmo tom. */
export function Badge({ tone = 'neutral', className, ...props }: Props) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
        'text-xs font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    />
  )
}
