import { ImageResponse } from 'next/og'

/**
 * Ícone de "adicionar à tela de início" do iOS.
 *
 * O iOS não aceita SVG como apple-touch-icon, então este PNG é gerado no
 * build a partir do mesmo desenho de `icon.svg`. Sem ele, quem fixar o app na
 * tela do iPhone ganha um print borrado da página no lugar do ícone.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

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
          background: 'linear-gradient(180deg, #19a771 0%, #0c6f4d 100%)',
        }}
      >
        <svg width="132" height="132" viewBox="0 0 32 32">
          <path
            d="M16 5.1 27.2 14.7v10.6a1.7 1.7 0 0 1-1.7 1.7H6.5a1.7 1.7 0 0 1-1.7-1.7V14.7z"
            fill="#fff"
          />
          <path
            d="m11.7 19.9 3 3 5.6-5.7"
            fill="none"
            stroke="#0c6f4d"
            strokeWidth="2.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  )
}
