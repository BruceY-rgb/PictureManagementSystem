'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Image, ImageOff, Loader2 } from 'lucide-react'

// 动态导入地图组件（禁用 SSR）
const PhotoMap = dynamic(
  () => import('@/components/map/PhotoMap').then(mod => mod.PhotoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

interface ImageLocation {
  id: string
  latitude: number
  longitude: number
  title: string | null
  originalName: string
  takenAt: string | null
}

interface Stats {
  total: number
  withLocation: number
  withoutLocation: number
}

export default function MapPage() {
  const { status } = useSession()
  const router = useRouter()
  const [images, setImages] = useState<ImageLocation[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    const fetchLocations = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/images/locations')
        const data = await res.json()

        if (res.ok) {
          setImages(data.images)
          setStats(data.stats)
        } else {
          setError(data.error || '获取位置信息失败')
        }
      } catch (err) {
        console.error('Fetch locations error:', err)
        setError('网络错误，请稍后重试')
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 标题和统计 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          地图视图
        </h1>

        {stats && (
          <div className="flex gap-4 text-sm">
            <Card className="px-3 py-1.5">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-green-500" />
                <span>{stats.withLocation} 张有位置</span>
              </div>
            </Card>
            <Card className="px-3 py-1.5">
              <div className="flex items-center gap-2">
                <ImageOff className="h-4 w-4 text-muted-foreground" />
                <span>{stats.withoutLocation} 张无位置</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* 地图容器 */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[calc(100vh-200px)] min-h-[400px]">
            {images.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <MapPin className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">暂无位置信息</p>
                <p className="text-sm mt-2">
                  上传带有 GPS 信息的照片后，将在此处显示
                </p>
              </div>
            ) : (
              <PhotoMap images={images} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
