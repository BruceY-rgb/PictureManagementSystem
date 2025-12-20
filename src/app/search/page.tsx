'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Calendar,
  Eye,
  ImageIcon,
  Camera,
  MapPin,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

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
  cameraMake: string | null
  cameraModel: string | null
  lensModel: string | null
  focalLength: number | null
  aperture: number | null
  shutterSpeed: string | null
  iso: number | null
  latitude: number | null
  longitude: number | null
  createdAt: string
  viewCount: number
  tags: {
    tag: {
      id: string
      name: string
      type: string
      color: string | null
    }
  }[]
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface FilterOptions {
  cameraMakes: string[]
  cameraModels: string[]
  tags: {
    id: string
    name: string
    type: string
    color: string | null
    useCount: number
  }[]
}

function SearchContent() {
  const router = useRouter()
  const urlSearchParams = useSearchParams()
  const { data: session, status } = useSession()

  // 搜索状态
  const [keyword, setKeyword] = useState(urlSearchParams.get('keyword') || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    urlSearchParams.get('tags')?.split(',').filter(Boolean) || []
  )
  const [startDate, setStartDate] = useState(urlSearchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState(urlSearchParams.get('endDate') || '')
  const [cameraMake, setCameraMake] = useState(urlSearchParams.get('cameraMake') || '')
  const [cameraModel, setCameraModel] = useState(urlSearchParams.get('cameraModel') || '')
  const [minWidth, setMinWidth] = useState(urlSearchParams.get('minWidth') || '')
  const [maxWidth, setMaxWidth] = useState(urlSearchParams.get('maxWidth') || '')
  const [minHeight, setMinHeight] = useState(urlSearchParams.get('minHeight') || '')
  const [maxHeight, setMaxHeight] = useState(urlSearchParams.get('maxHeight') || '')
  const [hasLocation, setHasLocation] = useState(urlSearchParams.get('hasLocation') || '')
  const [sortBy, setSortBy] = useState(urlSearchParams.get('sortBy') || 'createdAt')
  const [sortOrder, setSortOrder] = useState(urlSearchParams.get('sortOrder') || 'desc')

  // 结果状态
  const [images, setImages] = useState<ImageData[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // 筛选选项
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    cameraMakes: [],
    cameraModels: [],
    tags: [],
  })

  // 高级筛选展开状态
  const [showAdvanced, setShowAdvanced] = useState(false)

  // 获取筛选选项
  useEffect(() => {
    if (status === 'authenticated') {
      fetchFilterOptions()
    }
  }, [status])

  // URL参数变化时自动搜索
  useEffect(() => {
    if (status === 'authenticated' && urlSearchParams.toString()) {
      handleSearch()
    }
  }, [status])

  const fetchFilterOptions = async () => {
    try {
      const res = await fetch('/api/images/search', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setFilterOptions(data)
      }
    } catch (error) {
      console.error('Failed to fetch filter options:', error)
    }
  }

  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams()

    if (keyword) params.set('keyword', keyword)
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (cameraMake) params.set('cameraMake', cameraMake)
    if (cameraModel) params.set('cameraModel', cameraModel)
    if (minWidth) params.set('minWidth', minWidth)
    if (maxWidth) params.set('maxWidth', maxWidth)
    if (minHeight) params.set('minHeight', minHeight)
    if (maxHeight) params.set('maxHeight', maxHeight)
    if (hasLocation) params.set('hasLocation', hasLocation)
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy)
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder)
    params.set('page', pagination.page.toString())

    return params
  }, [keyword, selectedTags, startDate, endDate, cameraMake, cameraModel, minWidth, maxWidth, minHeight, maxHeight, hasLocation, sortBy, sortOrder, pagination.page])

  const handleSearch = async (resetPage = false) => {
    setIsLoading(true)
    setHasSearched(true)

    try {
      const params = buildSearchParams()
      if (resetPage) {
        params.set('page', '1')
        setPagination(prev => ({ ...prev, page: 1 }))
      }

      // 更新 URL
      router.push(`/search?${params.toString()}`, { scroll: false })

      const res = await fetch(`/api/images/search?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setImages(data.images)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeywordSearch = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(true)
  }

  const handleTagClick = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName))
    } else {
      setSelectedTags([...selectedTags, tagName])
    }
  }

  const removeTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tagName))
  }

  const clearAllFilters = () => {
    setKeyword('')
    setSelectedTags([])
    setStartDate('')
    setEndDate('')
    setCameraMake('')
    setCameraModel('')
    setMinWidth('')
    setMaxWidth('')
    setMinHeight('')
    setMaxHeight('')
    setHasLocation('')
    setSortBy('createdAt')
    setSortOrder('desc')
    setImages([])
    setHasSearched(false)
    router.push('/search')
  }

  const hasActiveFilters = keyword || selectedTags.length > 0 || startDate || endDate ||
    cameraMake || cameraModel || minWidth || maxWidth || minHeight || maxHeight || hasLocation

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
    <div className="space-y-6">
      {/* 搜索头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">图片搜索</h1>
          <p className="text-muted-foreground mt-1">
            根据名称、标签、日期等条件搜索您的照片
          </p>
        </div>
      </div>

      {/* 搜索表单 */}
      <Card>
        <CardContent className="pt-6">
          {/* 关键词搜索 */}
          <form onSubmit={handleKeywordSearch} className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索图片名称、标题、描述或标签..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '搜索中...' : '搜索'}
            </Button>
          </form>

          {/* 已选择的标签 */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-muted-foreground">已选标签：</span>
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="cursor-pointer">
                  {tag}
                  <X
                    className="ml-1 h-3 w-3"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}

          {/* 高级筛选切换 */}
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mb-4"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            高级筛选
            {showAdvanced ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4" />
            )}
          </Button>

          {/* 高级筛选选项 */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
              {/* 日期范围 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  拍摄日期
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="开始日期"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="结束日期"
                  />
                </div>
              </div>

              {/* 相机品牌 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  相机品牌
                </Label>
                <Select value={cameraMake} onValueChange={setCameraMake}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择相机品牌" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {filterOptions.cameraMakes.map(make => (
                      <SelectItem key={make} value={make}>{make}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 相机型号 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  相机型号
                </Label>
                <Select value={cameraModel} onValueChange={setCameraModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择相机型号" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {filterOptions.cameraModels.map(model => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 图片尺寸 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  宽度范围 (px)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={minWidth}
                    onChange={(e) => setMinWidth(e.target.value)}
                    placeholder="最小"
                  />
                  <Input
                    type="number"
                    value={maxWidth}
                    onChange={(e) => setMaxWidth(e.target.value)}
                    placeholder="最大"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  高度范围 (px)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={minHeight}
                    onChange={(e) => setMinHeight(e.target.value)}
                    placeholder="最小"
                  />
                  <Input
                    type="number"
                    value={maxHeight}
                    onChange={(e) => setMaxHeight(e.target.value)}
                    placeholder="最大"
                  />
                </div>
              </div>

              {/* 位置信息 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  位置信息
                </Label>
                <Select value={hasLocation} onValueChange={setHasLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择位置筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="true">有位置信息</SelectItem>
                    <SelectItem value="false">无位置信息</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 排序 */}
              <div className="space-y-2">
                <Label>排序方式</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择排序方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">上传时间</SelectItem>
                    <SelectItem value="takenAt">拍摄时间</SelectItem>
                    <SelectItem value="fileSize">文件大小</SelectItem>
                    <SelectItem value="viewCount">查看次数</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>排序顺序</Label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择排序顺序" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">降序（最新/最大优先）</SelectItem>
                    <SelectItem value="asc">升序（最旧/最小优先）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-end gap-2">
                <Button onClick={() => handleSearch(true)} disabled={isLoading}>
                  应用筛选
                </Button>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearAllFilters}>
                    清除筛选
                  </Button>
                )}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* 搜索结果 */}
      {hasSearched && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-muted-foreground">
              {isLoading ? '搜索中...' : `找到 ${pagination.total} 张图片`}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">搜索中...</p>
              </div>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">未找到匹配的图片</h2>
              <p className="text-muted-foreground">
                请尝试调整搜索条件或使用其他关键词
              </p>
            </div>
          ) : (
            <>
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
                        {image.latitude && image.longitude && (
                          <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded">
                            <MapPin className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium truncate mb-2">
                          {image.title || image.originalName}
                        </h3>

                        {/* 标签 */}
                        {image.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {image.tags.slice(0, 3).map(({ tag }) => (
                              <Badge
                                key={tag.id}
                                variant="secondary"
                                className="text-xs"
                                style={{ backgroundColor: tag.color || undefined }}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                            {image.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{image.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

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

                        {/* 相机信息 */}
                        {(image.cameraMake || image.cameraModel) && (
                          <div className="flex items-center text-xs text-muted-foreground mt-2 gap-1">
                            <Camera className="h-3 w-3" />
                            {image.cameraMake} {image.cameraModel}
                          </div>
                        )}

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
                    onClick={() => {
                      setPagination(prev => ({ ...prev, page: prev.page - 1 }))
                      setTimeout(() => handleSearch(), 0)
                    }}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {pagination.page} / {pagination.totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => {
                      setPagination(prev => ({ ...prev, page: prev.page + 1 }))
                      setTimeout(() => handleSearch(), 0)
                    }}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Loading fallback component
function SearchLoading() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">加载搜索页面...</p>
      </div>
    </div>
  )
}

// Main page component with Suspense wrapper
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  )
}
