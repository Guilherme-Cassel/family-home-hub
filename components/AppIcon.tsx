/**
 * Ícone do app: casa sobre engrenagem — despensa e manutenção, as duas coisas
 * que ele cuida.
 *
 * Desenho no estilo One UI: quadrado bem arredondado, cores chapadas e formas
 * cheias. Nada de contorno fino, que vira borrão no tamanho de favicon.
 *
 * Este componente é a fonte do desenho; `app/icon.svg` e `app/apple-icon.tsx`
 * repetem os mesmos caminhos.
 */

const FUNDO = '#0b7d59'

/** Os oito dentes da engrenagem, girados em torno do centro dela. */
const ANGULOS = [0, 45, 90, 135, 180, 225, 270, 315]

export function AppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Casa em Ordem"
    >
      <rect width="32" height="32" rx="8" fill={FUNDO} />

      {/* Engrenagem atrás, em verde claro para não competir com a casa. */}
      <g fill="#ffffff" opacity="0.4">
        {ANGULOS.map((angulo) => (
          <rect
            key={angulo}
            x="10.9"
            y="3.0"
            width="3.2"
            height="3.8"
            rx="1.2"
            transform={`rotate(${angulo} 12.5 13)`}
          />
        ))}
        <circle cx="12.5" cy="13" r="8.4" />
      </g>
      <circle cx="12.5" cy="13" r="3.6" fill={FUNDO} />

      {/* Casa na frente, contornada na cor do fundo para se destacar dela. */}
      <g stroke={FUNDO} strokeWidth="1.6" strokeLinejoin="round" paintOrder="stroke">
        <path d="M20.9 11.5 29.3 19.9H12.5Z" fill="#f5b23f" />
        <path d="M15.9 19.9h10v6.2a1.4 1.4 0 0 1-1.4 1.4h-7.2a1.4 1.4 0 0 1-1.4-1.4Z" fill="#ffffff" />
      </g>
      <path
        d="M19 27.5v-4.1a1.3 1.3 0 0 1 1.3-1.3h1.3a1.3 1.3 0 0 1 1.3 1.3v4.1Z"
        fill={FUNDO}
      />
    </svg>
  )
}
