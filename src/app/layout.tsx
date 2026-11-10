import type { Metadata, Viewport } from 'next'
import { Inter, Shantell_Sans } from 'next/font/google'
import type { ReactNode } from 'react'
import { PwaRegister } from '@/components/pwa-register'
import { THEME_COLORS, THEME_SCRIPT } from '@/lib/theme-config'
import './globals.css'

// One UI typeface (Inter). The optical-size axis gives large headings Inter's display cut.
const appFont = Inter({ subsets: ['latin'], axes: ['opsz'], variable: '--font-app' })
// Funky handwritten face, only for the dashboard To Do list (`font-handwritten`). Its
// Informal and Bounce axes give the hand-drawn, slightly dancing letters.
const handwrittenFont = Shantell_Sans({
  subsets: ['latin'],
  axes: ['INFM', 'BNCE'],
  variable: '--font-handwritten-face',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'ಸKala² — Clarity. Focus. Structure. Progress.',
    template: '%s · ಸKala²',
  },
  description: 'Designed for teams who value clarity over complexity.',
  applicationName: 'ಸKala²',
  // Latin spelling, so searches for the name in English letters find it too.
  keywords: ['Kala²', 'Kala2', 'ಸKala²', 'productivity', 'project management'],
  icons: {
    icon: [
      { url: '/brand/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/brand/icon-180.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ಸKala²',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme script adds `dark` to <html> before hydration, hence suppressHydrationWarning.
    // data-scroll-behavior: page changes jump to the top instantly; smooth scrolling (set in
    // globals.css) still applies within a page.
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body
        className={`${appFont.variable} ${handwrittenFont.variable} min-h-screen bg-canvas text-ink antialiased`}
      >
        {children}
        <PwaRegister />
      </body>
    </html>
  )
}
