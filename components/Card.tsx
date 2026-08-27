import { cn } from '@/lib/cn'
import type { ComponentProps } from 'react'

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200',
        className,
      )}
    />
  )
}
