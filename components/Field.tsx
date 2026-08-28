import { cn } from '@/lib/cn'
import { IconChevronDown } from '@/components/icons'
import type { ComponentProps, ReactNode } from 'react'

/**
 * Campos da One UI são caixas cheias de canto largo. O anel fica de fora do
 * estado normal e só aparece no foco, na cor de acento.
 */
export const inputClasses = cn(
  'w-full rounded-field bg-surface px-4 py-3 text-base text-ink',
  'ring-1 ring-line placeholder:text-ink-2',
  'transition-shadow focus:ring-2 focus:ring-accent focus:outline-none',
  'disabled:bg-surface-2 disabled:text-ink-2',
)

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input {...props} className={cn(inputClasses, className)} />
}

/**
 * A seta nativa do `<select>` fica colada na borda do campo e ignora o tema —
 * some no escuro e destoa do resto. Aqui ela é desligada e redesenhada com o
 * mesmo chevron do app, na cor certa e afastada da borda.
 */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative block">
      <select
        {...props}
        className={cn(inputClasses, 'h-12 appearance-none pr-11', className)}
      />
      <IconChevronDown
        width={18}
        height={18}
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-2"
      />
    </span>
  )
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea {...props} className={cn(inputClasses, className)} />
}

type FieldProps = {
  label: string
  htmlFor?: string
  hint?: ReactNode
  children: ReactNode
}

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block px-1.5 text-[13px] font-semibold text-ink-2"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="px-1.5 text-xs text-ink-2">{hint}</p> : null}
    </div>
  )
}
