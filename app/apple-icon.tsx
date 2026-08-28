import { ImageResponse } from 'next/og'

/**
 * Ícone de "adicionar à tela de início" do iOS.
 *
 * O iOS não aceita SVG como apple-touch-icon, então este PNG é gerado no
 * build a partir do mesmo desenho de `icon.svg`. Sem ele, quem fixar o app na
 * tela do iPhone ganha um print borrado da página no lugar do ícone.
 *
 * O iOS aplica o próprio arredondamento, então aqui o fundo é quadrado e o
 * desenho fica dentro de uma margem de segurança.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const FUNDO = '#0b7d59'
const ANGULOS = [0, 45, 90, 135, 180, 225, 270, 315]

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: FUNDO,
        }}
      >
        <svg width="150" height="150" viewBox="0 0 32 32">
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

          <g
            stroke={FUNDO}
            strokeWidth="1.6"
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            <path d="M20.9 11.5 29.3 19.9H12.5Z" fill="#f5b23f" />
            <path d="M15.9 19.9h10v6.2a1.4 1.4 0 0 1-1.4 1.4h-7.2a1.4 1.4 0 0 1-1.4-1.4Z" fill="#ffffff" />
          </g>
          <path
            d="M19 27.5v-4.1a1.3 1.3 0 0 1 1.3-1.3h1.3a1.3 1.3 0 0 1 1.3 1.3v4.1Z"
            fill={FUNDO}
          />
        </svg>
      </div>
    ),
    size,
  )
}
