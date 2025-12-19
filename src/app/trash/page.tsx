'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

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
  deletedAt: string
  tags: any[]
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function TrashPage() {
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
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<ImageData | null>(null)
  const [confirmPermanentOpen, setConfirmPermanentOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const { toast } = useToast()

  const pendingName = pendingPermanentDelete
    ? (pendingPermanentDelete.title ?? pendingPermanentDelete.originalName)
    : ''

  useEffect(() => {
    if (status === 'loading') return
    fetchImages()
  }, [status, pagination.page])

  const fetchImages = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/trash?page=${pagination.page}&limit=${pagination.limit}`
      )
      const data = await res.json()

      if (res.ok) {
        setImages(data.images)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch trash:', error)
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
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const restoreImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/images/${imageId}/restore`, {
        method: 'POST',
      })

      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId))
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
        toast({
          title: '恢复成功',
          description: '图片已恢复到画廊',
          type: 'success',
        })
      } else {
        const data = await res.json()
        toast({
          title: '恢复失败',
          description: data.error || '无法恢复图片',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Restore error:', error)
      toast({
        title: '恢复失败',
        description: '无法恢复图片',
        type: 'error',
      })
    }
  }

  const permanentDelete = async (imageId: string) => {
    try {
      const res = await fetch(`/api/images/${imageId}/permanent`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId))
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
        toast({
          title: '永久删除成功',
          description: '图片已被永久删除',
          type: 'success',
        })
        setConfirmPermanentOpen(false)
      } else {
        const data = await res.json()
        toast({
          title: '删除失败',
          description: data.error || '无法删除图片',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Permanent delete error:', error)
      toast({
        title: '删除失败',
        description: '无法删除图片',
        type: 'error',
      })
    } finally {
      setPendingPermanentDelete(null)
    }
  }

  const clearTrash = async () => {
    try {
      const res = await fetch('/api/trash', {
        method: 'DELETE',
      })

      if (res.ok) {
        const data = await res.json()
        setImages([])
        setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 })
        toast({
          title: '回收站已清空',
          description: `已永久删除 ${data.count} 张图片`,
          type: 'success',
        })
        setConfirmClearOpen(false)
      } else {
        const data = await res.json()
        toast({
          title: '清空失败',
          description: data.error || '无法清空回收站',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Clear trash error:', error)
      toast({
        title: '清空失败',
        description: '无法清空回收站',
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
        <Trash2 className="h-24 w-24 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">回收站是空的</h2>
        <p className="text-muted-foreground mb-6">
          删除的图片会出现在这里
        </p>
        <Button onClick={() => router.push('/gallery')} size="lg">
          前往画廊
        </Button>
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">回收站</h1>
            <p className="text-muted-foreground mt-1">
              共 {pagination.total} 张已删除图片
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setConfirmClearOpen(true)}
            disabled={images.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清空回收站
          </Button>
        </div>

        {/* 图片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((image) => (
            <Card key={image.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-100">
                  <img
                    src={`/api/images/${image.id}/file?size=medium`}
                    alt={image.title || image.originalName}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Trash2 className="h-12 w-12 text-white/60" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium truncate mb-2">
                    {image.title || image.originalName}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    删除于: {formatDate(image.deletedAt)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => restoreImage(image.id)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      恢复
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setPendingPermanentDelete(image)
                        setConfirmPermanentOpen(true)
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      永久删除
                    </Button>
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

      {/* 永久删除确认对话框 */}
      <Dialog open={confirmPermanentOpen} onOpenChange={setConfirmPermanentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              永久删除图片
            </DialogTitle>
            <DialogDescription>
              此操作不可撤销！图片将被永久删除，无法恢复。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <div className="text-sm text-muted-foreground">{pendingName}</div>
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirmPermanentOpen(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (pendingPermanentDelete) {
                    permanentDelete(pendingPermanentDelete.id)
                  }
                }}
              >
                永久删除
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清空回收站确认对话框 */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              清空回收站
            </DialogTitle>
            <DialogDescription>
              此操作不可撤销！回收站中的所有图片({pagination.total} 张)将被永久删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirmClearOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={clearTrash}>
                确认清空
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
