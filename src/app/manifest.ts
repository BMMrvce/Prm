import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ಸKala²',
    short_name: 'ಸKala²',
    description: 'Designed for teams who value clarity over complexity.',
    start_url: '/',
    display: 'standalone',
    // Light theme values (globals.css: --background, --brand-primary).
    background_color: '#f3f4f8',
    theme_color: '#423a8e',
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
