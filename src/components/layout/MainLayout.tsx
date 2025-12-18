'use client'

import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { ToastProvider } from '@/components/ui/toast'
import { usePathname } from 'next/navigation'

const publicPages = ['/login', '/register']

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = publicPages.includes(pathname)

  if (isPublicPage) {
    return <>{children}</>
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 ml-64">
            <div className="container py-6 px-4">{children}</div>
          </main>
        </div>
        <Footer />
      </div>
    </ToastProvider>
  )
}
