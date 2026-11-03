import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Workbench',
    short_name: 'Workbench',
    description: 'Office, studio, and personal work in one focused space.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f7f8',
    theme_color: '#493bd0',
    orientation: 'any',
    categories: ['productivity', 'business'],
    icons: [
      {
        src: '/icons/workbench-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/workbench-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/workbench-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
