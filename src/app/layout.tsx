import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import { PwaRegister } from '@/components/pwa-register'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Workbench — Calm, focused project management',
    template: '%s · Workbench',
  },
  description: 'A productive workbench for projects, tasks, time, and team collaboration.',
  applicationName: 'Workbench',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Workbench',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-white text-zinc-950 antialiased`}>
        {children}
        <PwaRegister />
      </body>
    </html>
  )
}
