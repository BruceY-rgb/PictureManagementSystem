'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Edit, Trash2, Plus, X, Calendar, Eye, ArrowLeft, AlertTriangle, Upload, Heart, Image as ImageIconLucide
} from 'lucide-react'
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
  viewCount: number
  isFavorite: boolean
  deletedAt: string | null
}

interface AlbumImage {
  image: ImageData
  addedAt: string
}

interface Album {
  id: string
  name: string
  description: string | null
  coverImageId: string | null
  createdAt: string
  updatedAt: string
  images: AlbumImage[]
  _count: {
    images: number
  }
}

export default function AlbumDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const [album, setAlbum] = useState<Album | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addImagesDialogOpen, setAddImagesDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [availableImages, setAvailableImages] = useState<ImageData[]>([])
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([])
  const { toast } = useToast()

  const albumId = params.id as string

  useEffect(() => {
    if (status === 'loading') return
    fetchAlbum()
  }, [status, albumId])

  const fetchAlbum = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/albums/${albumId}`)
      const data = await res.json()

      if (res.ok) {
        setAlbum(data.album)
        setEditName(data.album.name)
        setEditDescription(data.album.description || '')
      } else {
        toast({ title: '加载失败', description: data.error, type: 'error' })
        router.push('/albums')
      }
    } catch (error) {
      console.error('Failed to fetch album:', error)
      toast({ title: '加载失败', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableImages = async () => {
    try {
      const res = await fetch('/api/images?limit=100')
      const data = await res.json()

      if (res.ok) {
        // 过滤掉已在相册中的图片
        const albumImageIds = album?.images.map((ai) => ai.image.id) || []
        const available = data.images.filter(
          (img: ImageData) => !albumImageIds.includes(img.id)
        )
        setAvailableImages(available)
      }
    } catch (error) {
      console.error('Failed to fetch images:', error)
    }
  }

  const updateAlbum = async () => {
    try {
      const res = await fetch(`/api/albums/${albumId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      })

      if (res.ok) {
        toast({ title: '更新成功', type: 'success' })
        setEditDialogOpen(false)
        fetchAlbum()
      } else {
        const data = await res.json()
        toast({ title: '更新失败', description: data.error, type: 'error' })
      }
    } catch (error) {
      console.error('Update album error:', error)
      toast({ title: '更新失败', type: 'error' })
    }
  }

  const deleteAlbum = async () => {
    try {
      const res = await fetch(`/api/albums/${albumId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast({ title: '相册已删除', type: 'success' })
        router.push('/albums')
      } else {
        const data = await res.json()
        toast({ title: '删除失败', description: data.error, type: 'error' })
      }
    } catch (error) {
      console.error('Delete album error:', error)
      toast({ title: '删除失败', type: 'error' })
    }
  }

  const addImagesToAlbum = async () => {
    if (selectedImageIds.length === 0) {
      toast({ title: '请选择要添加的图片', type: 'error' })
      return
    }

    try {
      const res = await fetch(`/api/albums/${albumId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: selectedImageIds }),
      })

      if (res.ok) {
        toast({ title: '添加成功', type: 'success' })
        setAddImagesDialogOpen(false)
        setSelectedImageIds([])
        fetchAlbum()
      } else {
        const data = await res.json()
        toast({ title: '添加失败', description: data.error, type: 'error' })
      }
    } catch (error) {
      console.error('Add images error:', error)
      toast({ title: '添加失败', type: 'error' })
    }
  }

  const removeImageFromAlbum = async (imageId: string) => {
    try {
      const res = await fetch(`/api/albums/${albumId}/images/${imageId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast({ title: '已从相册移除', type: 'success' })
        setAlbum((prev) =>
          prev
            ? {
                ...prev,
                images: prev.images.filter((ai) => ai.image.id !== imageId),
                _count: { images: prev._count.images - 1 },
                // 如果移除的是封面图片，清空封面
                coverImageId: prev.coverImageId === imageId ? null : prev.coverImageId,
              }
            : null
        )
      } else {
        const data = await res.json()
        toast({ title: '移除失败', description: data.error, type: 'error' })
      }
    } catch (error) {
      console.error('Remove image error:', error)
      toast({ title: '移除失败', type: 'error' })
    }
  }

  const setCoverImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/albums/${albumId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageId: imageId }),
      })

      if (res.ok) {
        toast({ title: '封面已更新', type: 'success' })
        setAlbum((prev) =>
          prev ? { ...prev, coverImageId: imageId } : null
        )
      } else {
        const data = await res.json()
        toast({ title: '设置失败', description: data.error, type: 'error' })
      }
    } catch (error) {
      console.error('Set cover error:', error)
      toast({ title: '设置失败', type: 'error' })
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

  if (!album) {
    return null
  }

  return (
    <>
      <div>
        {/* 头部 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/albums')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回相册列表
          </Button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{album.name}</h1>
              {album.description && (
                <p className="text-muted-foreground mt-2">{album.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                共 {album._count.images} 张图片 · 创建于 {formatDate(album.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  fetchAvailableImages()
                  setAddImagesDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                添加图片
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除相册
              </Button>
            </div>
          </div>
        </div>

        {/* 图片网格 */}
        {album.images.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg">
            <Upload className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">相册是空的</h3>
            <p className="text-muted-foreground mb-4">
              添加图片到这个相册
            </p>
            <Button
              onClick={() => {
                fetchAvailableImages()
                setAddImagesDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加图片
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {album.images.map((albumImage) => {
              const image = albumImage.image
              const isCover = album.coverImageId === image.id
              return (
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
                      {/* 从相册移除按钮 */}
                      <button
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImageFromAlbum(image.id)
                        }}
                        aria-label="从相册移除"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                      {/* 收藏图标 */}
                      {image.isFavorite && (
                        <div className="absolute top-2 left-2 p-1.5 rounded-full bg-black/50">
                          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        </div>
                      )}
                      {/* 封面标识 */}
                      {isCover && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1">
                          <ImageIconLucide className="h-3 w-3" />
                          封面
                        </div>
                      )}
                      {/* 设为封面按钮 */}
                      {!isCover && (
                        <button
                          className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 hover:bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCoverImage(image.id)
                          }}
                          aria-label="设为封面"
                        >
                          <ImageIconLucide className="h-3 w-3" />
                          设为封面
                        </button>
                      )}
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
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <span>{image.width} × {image.height}</span>
                        <span>{formatFileSize(image.fileSize)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 编辑相册对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑相册</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">相册名称 *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={updateAlbum}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除相册确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              删除相册
            </DialogTitle>
            <DialogDescription>
              确认要删除&ldquo;{album.name}&rdquo;吗？相册中的图片不会被删除，只会移除关联。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={deleteAlbum}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加图片对话框 */}
      <Dialog open={addImagesDialogOpen} onOpenChange={setAddImagesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>从画廊添加图片</DialogTitle>
            <DialogDescription>
              选择要添加到相册的图片（已选择 {selectedImageIds.length} 张）
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {availableImages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                没有可添加的图片
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {availableImages.map((image) => {
                  const isSelected = selectedImageIds.includes(image.id)
                  return (
                    <div
                      key={image.id}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedImageIds((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== image.id)
                            : [...prev, image.id]
                        )
                      }}
                    >
                      <div className="aspect-square bg-gray-100">
                        <img
                          src={`/api/images/${image.id}/file?size=medium`}
                          alt={image.title || image.originalName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-2">
                            <svg
                              className="h-6 w-6"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddImagesDialogOpen(false)
                setSelectedImageIds([])
              }}
            >
              取消
            </Button>
            <Button
              onClick={addImagesToAlbum}
              disabled={selectedImageIds.length === 0}
            >
              添加 {selectedImageIds.length > 0 && `(${selectedImageIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
