'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageIcon, Calendar, Eye, Trash2, Heart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import Image from 'next/image'

interface ImageData {
  id: string
  filename: string
  originalName: string
  mimeType: string
  fileSize: number
  width: number
  height: number
  title: string | null
  description: string | null
  takenAt: string | null
  createdAt: string
  viewCount: number
  isFavorite: boolean
  tags: any[]
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function GalleryPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [images, setImages] = useState<ImageData[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [pendingDelete, setPendingDelete] = useState<ImageData | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { toast } = useToast()

  const pendingName = pendingDelete ? (pendingDelete.title ?? pendingDelete.originalName) : ''

  // 获取图片列表（middleware 已经处理了认证，这里不需要重复检查）
  useEffect(() => {
    // 等待 session 加载完成后再获取数据
    if (status === 'loading') return
    fetchImages()
  }, [status, pagination.page])

  const fetchImages = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/images?page=${pagination.page}&limit=${pagination.limit}`
      )
      const data = await res.json()

      if (res.ok) {
        setImages(data.images)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch images:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const toggleFavorite = async (imageId: string, currentFavorite: boolean) => {
    try {
      const res = await fetch(`/api/images/${imageId}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !currentFavorite }),
      })

      if (res.ok) {
        // 更新本地状态
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId ? { ...img, isFavorite: !currentFavorite } : img
          )
        )
        toast({
          title: !currentFavorite ? '已添加到收藏夹' : '已取消收藏',
          type: 'success',
        })
      } else {
        const data = await res.json()
        toast({
          title: '操作失败',
          description: data.error || '无法更改收藏状态',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Toggle favorite error:', error)
      toast({
        title: '操作失败',
        description: '无法更改收藏状态',
        type: 'error',
      })
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <ImageIcon className="h-24 w-24 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">还没有图片</h2>
        <p className="text-muted-foreground mb-6">
          开始上传您的第一张图片吧
        </p>
        <Button onClick={() => router.push('/upload')} size="lg">
          上传图片
        </Button>
      </div>
    )
  }

  return (
    <>
      <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">我的图片</h1>
          <p className="text-muted-foreground mt-1">
            共 {pagination.total} 张图片
          </p>
        </div>
        <Button onClick={() => router.push('/upload')}>
          上传图片
        </Button>
      </div>

      {/* 图片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((image) => (
          <Card
            key={image.id}
            className="group cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(`/gallery/${image.id}`)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-100">
                <img
                  src={`/api/images/${image.id}/file?size=medium`}
                  alt={image.title || image.originalName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                {/* 收藏图标 */}
                <button
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(image.id, image.isFavorite)
                  }}
                  aria-label={image.isFavorite ? '取消收藏' : '收藏'}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      image.isFavorite
                        ? 'fill-red-500 text-red-500'
                        : 'text-white'
                    }`}
                  />
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-medium truncate mb-2">
                  {image.title || image.originalName}
                </h3>
                <div className="flex items-center text-sm text-muted-foreground gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(image.takenAt || image.createdAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {image.viewCount}
                  </div>
                  <div>
                    <button
                      className="flex items-center gap-1 text-destructive hover:opacity-80"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPendingDelete(image)
                        setConfirmOpen(true)
                      }}
                      aria-label="删除图片"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>{image.width} × {image.height}</span>
                  <span>{formatFileSize(image.fileSize)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {pagination.page} / {pagination.totalPages} 页
          </span>
          <Button
            variant="outline"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            下一页
          </Button>
        </div>
      )}
    </div>

      {/* 删除确认对话框 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移至回收站</DialogTitle>
            <DialogDescription>
              确认要将这张图片移至回收站吗？您可以稍后从回收站中恢复。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <div className="text-sm text-muted-foreground">{pendingName}</div>
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>取消</Button>
              <Button
                className="bg-destructive text-destructive-foreground"
                onClick={async () => {
                  if (!pendingDelete) return
                  const id = pendingDelete.id
                  try {
                    setDeletingIds((s) => [...s, id])
                    const res = await fetch(`/api/images/${id}`, { method: 'DELETE' })
                    if (!res.ok) {
                      const text = await res.text()
                      console.error('Delete failed:', text)
                      toast({ title: '删除失败', description: text || res.statusText, type: 'error' })
                      return
                    }

                    setImages((prev) => prev.filter((it) => it.id !== id))
                    setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
                    toast({ title: '已移至回收站', description: '您可以从回收站恢复图片', type: 'success' })
                    setConfirmOpen(false)
                  } catch (err) {
                    console.error('Delete error:', err)
                    toast({ title: '删除出错', description: '删除图片时出现错误', type: 'error' })
                  } finally {
                    setDeletingIds((s) => s.filter((i) => i !== id))
                    setPendingDelete(null)
                  }
                }}
              >
                删除
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
