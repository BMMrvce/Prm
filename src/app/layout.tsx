import type { Metadata } from 'next'
import { Bricolage_Grotesque, Shantell_Sans } from 'next/font/google'
import type { ReactNode } from 'react'
import { PwaRegister } from '@/components/pwa-register'
import './globals.css'

// App-wide typeface, plus a playful hand-drawn one for to-do lists.
const appFont = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-app' })
const funkyFont = Shantell_Sans({ subsets: ['latin'], variable: '--font-shantell' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Workbench — Calm, focused project management',
    template: '%s · Workbench',
  },
  description: 'A productive workbench for projects, tasks, time, and team collaboration.',
  applicationName: 'Workbench',
  icons: { icon: '/icons/workbench-192.png', apple: '/icons/workbench-192.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Workbench',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${appFont.variable} ${funkyFont.variable} min-h-screen bg-white text-zinc-950 antialiased`}
      >
        {children}
        <PwaRegister />
      </body>
    </html>
  )
}
