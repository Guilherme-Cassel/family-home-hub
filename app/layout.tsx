import type { Metadata, Viewport } from 'next'
import { Onest } from 'next/font/google'
import './globals.css'

/**
 * Substituta aberta da Samsung Sans. A pilha de fontes em globals.css coloca
 * a Samsung Sans na frente, então num Galaxy o app usa a fonte original do
 * sistema e a Onest só entra nos demais aparelhos.
 */
const onest = Onest({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-onest',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Casa em Ordem',
  description: 'Estoque da despensa e manutenções da casa, para a família toda.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  // A barra de status do celular acompanha o tema, como num app nativo.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={onest.variable}>
      <body>{children}</body>
    </html>
  )
}
