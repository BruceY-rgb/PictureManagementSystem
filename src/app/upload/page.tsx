'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'

interface UploadFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export default function UploadPage() {
  const router = useRouter()
  const { status } = useSession()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])

    const newFiles: UploadFile[] = selectedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const droppedFiles = Array.from(e.dataTransfer.files)
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'))

    const newFiles: UploadFile[] = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)

    const formData = new FormData()
    files.forEach(f => {
      formData.append('images', f.file)
    })

    try {
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || '上传失败')
      }

      // 更新文件状态
      setFiles(prev =>
        prev.map((f, i) => ({
          ...f,
          status: result.results[i].success ? 'success' : 'error',
          error: result.results[i].error,
        }))
      )

      // 3秒后跳转到图片列表页
      setTimeout(() => {
        router.push('/gallery')
      }, 3000)
    } catch (error: any) {
      setFiles(prev =>
        prev.map(f => ({
          ...f,
          status: 'error',
          error: error.message,
        }))
      )
    } finally {
      setIsUploading(false)
    }
  }

  // middleware 已经处理了认证，等待 session 加载完成
  if (status === 'loading') {
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
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">上传图片</CardTitle>
          <CardDescription>
            支持批量上传 JPEG, PNG, GIF 和 WebP 格式的图片,单个文件最大 10MB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 上传区域 */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">
                拖拽图片到这里或点击选择文件
              </p>
              <p className="text-sm text-muted-foreground">
                支持批量上传多张图片
              </p>
            </label>
          </div>

          {/* 文件列表 */}
          {files.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">
                已选择 {files.length} 张图片
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border"
                  >
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                      {file.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {file.status === 'success' && (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="h-8 w-8 text-red-500" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs truncate">{file.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 上传按钮 */}
          {files.length > 0 && (
            <div className="flex gap-4">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1"
                size="lg"
              >
                {isUploading ? '上传中...' : `上传 ${files.length} 张图片`}
              </Button>
              <Button
                variant="outline"
                onClick={() => setFiles([])}
                disabled={isUploading}
                size="lg"
              >
                清空
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
