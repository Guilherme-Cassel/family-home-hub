import Link from 'next/link'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { IconCamera, IconChevronRight, IconList } from '@/components/icons'

export const metadata = { title: 'Entrada de compras · Casa em Ordem' }

export default function EntradaPage() {
  return (
    <>
      <PageHeader
        titulo="Entrada de compras"
        subtitulo="Como você quer registrar o que chegou?"
        voltar="/"
      />

      <ul className="space-y-3">
        <li>
          <Link href="/entrada/foto">
            <Card className="press flex items-center gap-4 rounded-card p-4 transition-colors hover:bg-surface-2">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-accent text-on-fill">
                <IconCamera width={24} height={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink">Por foto</p>
                  <Badge tone="info">IA</Badge>
                </div>
                <p className="mt-0.5 text-sm text-ink-2">
                  Fotografar os produtos e deixar a IA identificar.
                </p>
              </div>
              <IconChevronRight className="shrink-0 text-ink-3" />
            </Card>
          </Link>
        </li>

        <li>
          <Link href="/entrada-rapida">
            <Card className="press flex items-center gap-4 rounded-card p-4 transition-colors hover:bg-surface-2">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-accent text-on-fill">
                <IconList width={24} height={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">Digitar</p>
                <p className="mt-0.5 text-sm text-ink-2">
                  Tabela com sugestão do que já está cadastrado.
                </p>
              </div>
              <IconChevronRight className="shrink-0 text-ink-3" />
            </Card>
          </Link>
        </li>
      </ul>
    </>
  )
}
