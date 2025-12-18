'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  ImageIcon,
  Upload,
  Tag,
  Map,
  Search,
  Heart,
  Trash2,
  Folder
} from 'lucide-react'

const sidebarLinks = [
  {
    title: '首页',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: '所有图片',
    href: '/gallery',
    icon: ImageIcon,
  },
  {
    title: '上传图片',
    href: '/upload',
    icon: Upload,
  },
  {
    title: '标签管理',
    href: '/tags',
    icon: Tag,
  },
  {
    title: '地图视图',
    href: '/map',
    icon: Map,
  },
  {
    title: '搜索',
    href: '/search',
    icon: Search,
  },
  {
    title: '收藏夹',
    href: '/favorites',
    icon: Heart,
  },
  {
    title: '相册',
    href: '/albums',
    icon: Folder,
  },
  {
    title: '回收站',
    href: '/trash',
    icon: Trash2,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-background">
      <div className="flex h-full flex-col gap-2 p-4">
        <nav className="flex flex-col gap-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {link.title}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
