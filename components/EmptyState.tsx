import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
