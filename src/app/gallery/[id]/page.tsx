"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import TagInput from '@/components/tags/TagInput'
import TagBadge from '@/components/tags/TagBadge'
import { useToast } from '@/components/ui/toast'
import { ImageAIChat } from '@/components/image/ImageAIChat'
import { AIAnalysisStatus } from '@/components/image/AIAnalysisStatus'

interface AILabels {
  scenes?: string[]
  objects?: string[]
  people?: string[]
  text?: string[]
  emotions?: string[]
  details?: string[]
  analyzedAt?: string
  model?: string
}

type ImageDetail = {
  id: string
  title?: string | null
  originalName: string
  mimeType: string
  fileSize: number
  width: number
  height: number
  takenAt?: string | null
  createdAt: string
  viewCount: number
  aiAnalyzed: boolean
  aiLabels?: AILabels | null
  aiConfidence?: number | null
  tags: { tag: { id: string; name: string; type: string; color?: string | null } }[]
}

export default function ImageDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [image, setImage] = useState<ImageDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchImage = useCallback(async () => {
    try {
      const res = await fetch(`/api/images/${params.id}`)
      const data = await res.json()
      if (res.ok) setImage(data.image)
    } catch (err) {
      console.error(err)
    }
  }, [params.id])

  // 获取图片详情
  useEffect(() => {
    if (status === 'loading') return

    const loadImage = async () => {
      setLoading(true)
      await fetchImage()
      setLoading(false)
    }
    loadImage()
  }, [status, fetchImage])

  // 轮询检查 AI 分析状态
  useEffect(() => {
    if (!image || image.aiAnalyzed) return

    const interval = setInterval(async () => {
      await fetchImage()
    }, 3000) // 每3秒检查一次

    return () => clearInterval(interval)
  }, [image, fetchImage])

  const addTag = async (tag: any) => {
    try {
      const res = await fetch(`/api/images/${params.id}/tags`, { method: 'POST', body: JSON.stringify({ tagId: tag.id }) })
      const data = await res.json()
      if (res.ok) {
        toast({ title: '已添加标签', type: 'success' })
        setImage((prev) => prev ? { ...prev, tags: [...prev.tags, { tag }] } : prev)
      } else {
        toast({ title: '添加失败', description: data.error || '未知错误', type: 'error' })
      }
    } catch (err) {
      console.error(err)
      toast({ title: '添加失败', type: 'error' })
    }
  }

  const removeTag = async (tagId: string) => {
    if (!confirm('确认移除该标签？')) return
    try {
      const res = await fetch(`/api/images/${params.id}/tags`, { method: 'DELETE', body: JSON.stringify({ tagId }) })
      const data = await res.json()
      if (res.ok) {
        toast({ title: '已移除', type: 'success' })
        setImage((prev) => prev ? { ...prev, tags: prev.tags.filter((t) => t.tag.id !== tagId) } : prev)
      } else {
        toast({ title: '失败', description: data.error || '未知错误', type: 'error' })
      }
    } catch (err) {
      console.error(err)
      toast({ title: '失败', type: 'error' })
    }
  }

  const handleRetryAIAnalysis = async () => {
    try {
      const res = await fetch(`/api/images/${params.id}/analyze`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast({ title: '已重新触发AI分析', type: 'success' })
        // 重置状态以显示加载中
        setImage((prev) => prev ? { ...prev, aiAnalyzed: false, aiLabels: null, aiConfidence: null } : prev)
      } else {
        toast({ title: '触发失败', description: data.error || '未知错误', type: 'error' })
      }
    } catch (err) {
      console.error(err)
      toast({ title: '触发失败', type: 'error' })
    }
  }

  const download = () => {
    window.open(`/api/images/${params.id}/file?size=original`, '_blank')
  }

  const deleteImage = async () => {
    if (!confirm('确认删除该图片？')) return
    try {
      const res = await fetch(`/api/images/${params.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: '图片已删除', type: 'success' })
        router.push('/gallery')
      } else {
        const text = await res.text()
        toast({ title: '删除失败', description: text || res.statusText, type: 'error' })
      }
    } catch (err) {
      console.error(err)
      toast({ title: '删除失败', type: 'error' })
    }
  }

  if (loading) return <div className="p-6">加载中...</div>
  if (!image) return <div className="p-6">图片不存在</div>

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => router.push('/gallery')}>返回画廊</Button>
        <Button onClick={() => router.push(`/editor/${image.id}`)}>编辑图片</Button>
        <Button onClick={download}>下载</Button>
        <Button variant="destructive" onClick={deleteImage}>删除图片</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 图片预览 */}
        <Card>
          <CardContent className="p-4">
            <img src={`/api/images/${image.id}/file?size=large`} alt={image.title ?? image.originalName} className="w-full h-auto rounded" />
          </CardContent>
        </Card>

        {/* 图片信息和标签 */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="font-medium">{image.title ?? image.originalName}</h3>
              <div className="text-sm text-muted-foreground">{image.width} × {image.height} • {(image.fileSize / 1024).toFixed(1)} KB</div>
            </div>

            {/* AI 分析状态和结果 */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                AI 分析
                <AIAnalysisStatus
                  imageId={image.id}
                  aiAnalyzed={image.aiAnalyzed}
                  aiLabels={image.aiLabels}
                  aiConfidence={image.aiConfidence}
                  onRetry={handleRetryAIAnalysis}
                />
              </h4>
              {image.aiAnalyzed && image.aiLabels && image.aiConfidence !== 0 && (
                <AIAnalysisStatus
                  imageId={image.id}
                  aiAnalyzed={image.aiAnalyzed}
                  aiLabels={image.aiLabels}
                  aiConfidence={image.aiConfidence}
                  showDetails
                />
              )}
            </div>

            {/* 标签管理 */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">标签</h4>
              <div className="flex flex-wrap gap-2">
                {image.tags.map((t) => (
                  <TagBadge key={t.tag.id} id={t.tag.id} name={t.tag.name} type={t.tag.type} color={t.tag.color} onRemove={() => removeTag(t.tag.id)} />
                ))}
              </div>
              <div className="mt-3">
                <TagInput value={[]} onChange={(v) => addTag(v[v.length - 1])} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI 问答 */}
        <ImageAIChat imageId={image.id} imageName={image.title ?? image.originalName} />
      </div>
    </div>
  )
}
