import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ಆyaama',
    short_name: 'ಆyaama',
    description: 'Designed for teams who value clarity over complexity.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f9fc',
    theme_color: '#17175e',
    orientation: 'any',
    categories: ['productivity', 'business'],
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/brand/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
