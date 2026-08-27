import Link from 'next/link'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { IconCamera, IconChevronRight, IconList } from '@/components/icons'

export const metadata = { title: 'Entrada de compras · Casa em Ordem' }

export default function EntradaPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Entrada de compras</h1>
        <p className="mt-1 text-sm text-slate-500">
          Como você quer registrar o que chegou?
        </p>
      </div>

      <ul className="space-y-3">
        <li>
          <Link href="/entrada/foto">
            <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-slate-50">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <IconCamera width={24} height={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">Por foto</p>
                  <Badge tone="info">IA</Badge>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  Fotografar os produtos e deixar a IA identificar.
                </p>
              </div>
              <IconChevronRight className="shrink-0 text-slate-400" />
            </Card>
          </Link>
        </li>

        <li>
          <Link href="/entrada-rapida">
            <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-slate-50">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <IconList width={24} height={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">Digitar</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Tabela com sugestão do que já está cadastrado.
                </p>
              </div>
              <IconChevronRight className="shrink-0 text-slate-400" />
            </Card>
          </Link>
        </li>
      </ul>
    </div>
  )
}
