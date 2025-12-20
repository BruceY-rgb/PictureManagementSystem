"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ImageIcon from 'lucide-react'

type ImageItem = { id: string; title?: string | null; originalName: string; createdAt: string; width?: number; height?: number; fileSize?: number }
type TagDetail = { id: string; name: string; type: string; useCount: number; createdAt: string }

export default function TagDetailPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const [tag, setTag] = useState<TagDetail | null>(null)
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/tags/${params.id}`)
        const data = await res.json()
        if (res.ok) {
          setTag({ id: data.tag.id, name: data.tag.name, type: data.tag.type, useCount: data.tag.useCount, createdAt: data.tag.createdAt })
          setImages(data.tag.images || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [params.id])

  if (loading) return <div className="p-6">加载中...</div>

  if (!tag) return <div className="p-6">标签不存在</div>

  return (
    <div>
      <div className="mb-4">
        <Button variant="outline" onClick={() => router.push('/tags')}>← 返回标签管理</Button>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-semibold">标签: {tag.name} ({tag.type})</h1>
        <div className="text-sm text-muted-foreground">使用次数: {tag.useCount} 创建时间: {new Date(tag.createdAt).toLocaleString()}</div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-2">包含此标签的图片 ({images.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <Card key={img.id} className="cursor-pointer" onClick={() => router.push(`/gallery/${img.id}`)}>
              <CardContent className="p-0">
                <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-100">
                  <img src={`/api/images/${img.id}/file?size=small`} alt={img.title ?? img.originalName} className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <div className="font-medium truncate">{img.title ?? img.originalName}</div>
                  <div className="text-xs text-muted-foreground">{new Date(img.createdAt).toLocaleDateString()}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
