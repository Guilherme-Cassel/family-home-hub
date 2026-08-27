import type { MetadataRoute } from 'next'

/**
 * Manifesto para o app poder ser fixado na tela de início do celular.
 *
 * `display: standalone` faz ele abrir sem a barra de endereço, que é o que
 * dá cara de app na hora de marcar manutenção em pé na cozinha.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Casa em Ordem',
    short_name: 'Casa',
    description:
      'Estoque da despensa e manutenções da casa, para a família toda.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0c6f4d',
    lang: 'pt-BR',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
