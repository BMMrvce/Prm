import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(dirname),
  },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.SITE_URL || 'http://localhost:3000',
  },
}

export default nextConfig
