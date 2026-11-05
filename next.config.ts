import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // Node-only mail libraries; load them from node_modules at runtime instead of bundling.
  serverExternalPackages: ['imapflow', 'mailparser', 'nodemailer'],
  turbopack: {
    root: path.resolve(dirname),
  },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.SITE_URL || 'http://localhost:3000',
  },
}

export default nextConfig
