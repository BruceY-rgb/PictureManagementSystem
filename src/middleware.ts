export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    // 移除 /dashboard，因为它是公开的门户页
    '/upload/:path*',
    '/gallery/:path*',
    '/search/:path*',
    '/editor/:path*',
    '/albums/:path*',
    '/favorites/:path*',
    '/trash/:path*',
    '/map/:path*',
    '/profile/:path*',
    '/settings/:path*',
    // API 路由保护（除了 /api/auth 和 /api/public）
    '/api/images/:path*',
    '/api/tags/:path*',
  ],
}
