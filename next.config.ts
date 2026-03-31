import withPWA from '@ducanh2912/next-pwa'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
}

export default withPWA({
  dest: 'public',
  register: true,
  customWorkerSrc: 'worker',
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    skipWaiting: true,
  },
})(nextConfig)
