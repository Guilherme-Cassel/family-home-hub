import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Fotos comprimidas viajam no corpo da Server Action de entrada em massa.
      bodySizeLimit: '8mb',
    },
  },
}

export default nextConfig
