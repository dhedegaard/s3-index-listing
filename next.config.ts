import type { NextConfig } from 'next'

export default {
  reactStrictMode: true,
  experimental: {
    dynamicIO: true,
  },
} satisfies NextConfig
