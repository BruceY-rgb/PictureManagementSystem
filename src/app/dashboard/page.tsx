"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageIcon, Users, Tag, Clock, Upload, Search, Map as MapIcon } from 'lucide-react'
import ImageCarousel from '@/components/ImageCarousel'

interface PublicStats {
  totalImages: number
  totalUsers: number
  topTags: { id: string; name: string; useCount: number; type: 'AUTO_EXIF' | 'AUTO_AI' | 'CUSTOM' }[]
  recentImages: { id: string; title: string | null; originalName: string; createdAt: string }[]
  tagStats?: {
    autoExif: number
    autoAI: number
    custom: number
    total: number
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/public/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        } else {
          console.error('Fetch stats failed', await res.text())
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">欢迎来到图片管理系统</h1>
          <p className="text-muted-foreground mt-2">您的智能图片管理平台 — 轻松管理、搜索和分享您的图片</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <ImageIcon className="h-6 w-6 text-primary" />
            <CardTitle>{stats?.totalImages ?? 0}</CardTitle>
            <CardDescription>图片总数</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Users className="h-6 w-6 text-primary" />
            <CardTitle>{stats?.totalUsers ?? 0}</CardTitle>
            <CardDescription>注册用户</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Tag className="h-6 w-6 text-primary" />
            <CardTitle>{stats?.tagStats?.total ?? 0}</CardTitle>
            <CardDescription>标签总数</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Clock className="h-6 w-6 text-primary" />
            <CardTitle>{stats?.recentImages?.length ?? 0}</CardTitle>
            <CardDescription>最近上传</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats?.recentImages && stats.recentImages.length > 0 && (
          <div className="space-y-4">
            <ImageCarousel
              images={stats.recentImages}
              autoPlayInterval={4000}
            />
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>最近上传</CardTitle>
              <CardDescription>最近的几张图片（仅元数据展示）</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentImages && stats.recentImages.length > 0 ? (
                <ul className="space-y-3">
                  {stats.recentImages.map((img) => (
                    <li key={img.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{img.title ?? img.originalName}</div>
                        <div className="text-xs text-muted-foreground">{new Date(img.createdAt).toLocaleString('zh-CN')}</div>
                      </div>
                      <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/gallery`)}>查看</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">暂无图片</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>热门标签</CardTitle>
              <CardDescription>按使用次数排序</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.topTags && stats.topTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {stats.topTags.map((t) => {
                    const getTagColor = (type: string) => {
                      switch (type) {
                        case 'AUTO_EXIF':
                          return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        case 'AUTO_AI':
                          return 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        case 'CUSTOM':
                          return 'bg-green-100 text-green-700 hover:bg-green-200'
                        default:
                          return 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    }

                    return (
                      <span
                        key={t.id}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${getTagColor(t.type)}`}
                      >
                        {t.name} <span className="text-muted-foreground">({t.useCount})</span>
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">暂无标签</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {stats?.tagStats && (
        <Card>
          <CardHeader>
            <CardTitle>智能标签统计</CardTitle>
            <CardDescription>自动标签生成功能统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-blue-50">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700">{stats.tagStats.autoExif}</p>
                  <p className="text-sm text-blue-600">EXIF自动标签</p>
                  <p className="text-xs text-muted-foreground mt-1">基于相机信息自动生成</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-lg bg-purple-50">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-700">{stats.tagStats.autoAI}</p>
                  <p className="text-sm text-purple-600">AI智能标签</p>
                  <p className="text-xs text-muted-foreground mt-1">AI图像识别生成</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-lg bg-green-50">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">{stats.tagStats.custom}</p>
                  <p className="text-sm text-green-600">用户自定义标签</p>
                  <p className="text-xs text-muted-foreground mt-1">手动创建的标签</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>系统功能</CardTitle>
          <CardDescription>探索图片管理系统的强大功能</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col items-center text-center p-4 rounded-lg hover:bg-accent transition-colors cursor-pointer" onClick={() => router.push('/upload')}>
              <Upload className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">上传图片</h3>
              <p className="text-xs text-muted-foreground">批量上传和管理您的图片</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg hover:bg-accent transition-colors cursor-pointer" onClick={() => router.push('/search')}>
              <Search className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">智能搜索</h3>
              <p className="text-xs text-muted-foreground">快速查找任何图片</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg hover:bg-accent transition-colors cursor-pointer" onClick={() => router.push('/tags')}>
              <Tag className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">标签管理</h3>
              <p className="text-xs text-muted-foreground">组织和分类您的图片</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg hover:bg-accent transition-colors cursor-pointer" onClick={() => router.push('/map')}>
              <MapIcon className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">地图视图</h3>
              <p className="text-xs text-muted-foreground">在地图上查看图片位置</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
