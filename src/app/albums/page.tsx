'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Folder, Plus, Image as ImageIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

interface Album {
  id: string
  name: string
  description: string | null
  coverImageId: string | null
  createdAt: string
  updatedAt: string
  _count: {
    images: number
  }
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AlbumsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [albums, setAlbums] = useState<Album[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState('')
  const [newAlbumDescription, setNewAlbumDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (status === 'loading') return
    fetchAlbums()
  }, [status, pagination.page])

  const fetchAlbums = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/albums?page=${pagination.page}&limit=${pagination.limit}`
      )
      const data = await res.json()

      if (res.ok) {
        setAlbums(data.albums)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch albums:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createAlbum = async () => {
    if (!newAlbumName.trim()) {
      toast({ title: '请输入相册名称', type: 'error' })
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAlbumName,
          description: newAlbumDescription,
        }),
      })

      if (res.ok) {
        toast({ title: '相册创建成功', type: 'success' })
        setCreateDialogOpen(false)
        setNewAlbumName('')
        setNewAlbumDescription('')
        fetchAlbums()
      } else {
        const data = await res.json()
        toast({
          title: '创建失败',
          description: data.error || '无法创建相册',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Create album error:', error)
      toast({ title: '创建失败', type: 'error' })
    } finally {
      setIsCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
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

  if (albums.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
          <Folder className="h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">还没有相册</h2>
          <p className="text-muted-foreground mb-6">
            创建相册来组织您的图片
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            创建相册
          </Button>
        </div>

        {/* 创建相册对话框 */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新相册</DialogTitle>
              <DialogDescription>
                为您的图片集创建一个新相册
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">相册名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：旅行照片"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述（可选）</Label>
                <Textarea
                  id="description"
                  placeholder="描述这个相册的内容"
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={createAlbum} disabled={isCreating}>
                {isCreating ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">我的相册</h1>
            <p className="text-muted-foreground mt-1">
              共 {pagination.total} 个相册
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建相册
          </Button>
        </div>

        {/* 相册网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {albums.map((album) => (
            <Card
              key={album.id}
              className="group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/albums/${album.id}`)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  {album.coverImageId ? (
                    <img
                      src={`/api/images/${album.coverImageId}/file?size=medium`}
                      alt={album.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Folder className="h-20 w-20 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {album._count.images}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium truncate mb-1">{album.name}</h3>
                  {album.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {album.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    创建于 {formatDate(album.createdAt)}
                  </p>
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

      {/* 创建相册对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新相册</DialogTitle>
            <DialogDescription>
              为您的图片集创建一个新相册
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">相册名称 *</Label>
              <Input
                id="name"
                placeholder="例如：旅行照片"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Textarea
                id="description"
                placeholder="描述这个相册的内容"
                value={newAlbumDescription}
                onChange={(e) => setNewAlbumDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={createAlbum} disabled={isCreating}>
              {isCreating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
