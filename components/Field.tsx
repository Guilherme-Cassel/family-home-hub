import { cn } from '@/lib/cn'
import type { ComponentProps, ReactNode } from 'react'

export const inputClasses = cn(
  'w-full rounded-xl bg-white px-3 py-2.5 text-base text-slate-900',
  'ring-1 ring-slate-300 placeholder:text-slate-400',
  'focus:ring-2 focus:ring-brand-600 focus:outline-none',
  'disabled:bg-slate-100 disabled:text-slate-500',
)

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input {...props} className={cn(inputClasses, className)} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select {...props} className={cn(inputClasses, 'h-11', className)} />
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
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
