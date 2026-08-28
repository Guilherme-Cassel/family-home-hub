import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  action?: ReactNode
}

/** Estado vazio: bloco liso, sem borda tracejada — a One UI não usa contorno. */
export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="rounded-card bg-surface px-6 py-12 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-2">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
