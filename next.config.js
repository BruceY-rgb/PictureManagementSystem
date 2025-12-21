/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 部署需要 standalone 输出模式
  output: 'standalone',
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
