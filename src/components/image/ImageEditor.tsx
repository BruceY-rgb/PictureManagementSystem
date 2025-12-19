"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Crop, Palette, RotateCcw, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Props = {
  imageUrl: string
  onSaved?: () => void
}

// 截图区域类型
type CropArea = {
  x: number
  y: number
  width: number
  height: number
}

// 拖拽类型
type DragType = 'none' | 'create' | 'move' | 'resize-nw' | 'resize-n' | 'resize-ne' | 'resize-e' | 'resize-se' | 'resize-s' | 'resize-sw' | 'resize-w'

export default function ImageEditor({ imageUrl, onSaved }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cropContainerRef = useRef<HTMLDivElement | null>(null)

  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState<'edit' | 'crop'>('edit')

  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)

  const [cropData, setCropData] = useState<string | null>(null)

  // 截图区域相关状态
  const [cropArea, setCropArea] = useState<CropArea | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState<DragType>('none')
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [originalCropArea, setOriginalCropArea] = useState<CropArea | null>(null)

  // 获取鼠标相对于图片的坐标
  const getMousePosition = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = cropContainerRef.current
    if (!container) return { x: 0, y: 0 }

    const rect = container.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  // 判断鼠标是否在某个点附近（用于调整大小的拖拽点）
  const isNearPoint = (mouseX: number, mouseY: number, pointX: number, pointY: number, threshold = 8) => {
    return Math.abs(mouseX - pointX) <= threshold && Math.abs(mouseY - pointY) <= threshold
  }

  // 获取鼠标位置对应的拖拽类型
  const getDragType = (mouseX: number, mouseY: number): DragType => {
    if (!cropArea) return 'none'

    const { x, y, width, height } = cropArea

    // 检查是否在调整大小的拖拽点上
    if (isNearPoint(mouseX, mouseY, x, y)) return 'resize-nw' // 左上
    if (isNearPoint(mouseX, mouseY, x + width / 2, y)) return 'resize-n' // 上中
    if (isNearPoint(mouseX, mouseY, x + width, y)) return 'resize-ne' // 右上
    if (isNearPoint(mouseX, mouseY, x + width, y + height / 2)) return 'resize-e' // 右中
    if (isNearPoint(mouseX, mouseY, x + width, y + height)) return 'resize-se' // 右下
    if (isNearPoint(mouseX, mouseY, x + width / 2, y + height)) return 'resize-s' // 下中
    if (isNearPoint(mouseX, mouseY, x, y + height)) return 'resize-sw' // 左下
    if (isNearPoint(mouseX, mouseY, x, y + height / 2)) return 'resize-w' // 左中

    // 检查是否在截图区域内（用于移动）
    if (mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height) {
      return 'move'
    }

    return 'none'
  }

  // 获取鼠标光标样式
  const getCursor = (type: DragType): string => {
    const cursorMap: Record<DragType, string> = {
      'none': 'crosshair',
      'create': 'crosshair',
      'move': 'move',
      'resize-nw': 'nw-resize',
      'resize-n': 'n-resize',
      'resize-ne': 'ne-resize',
      'resize-e': 'e-resize',
      'resize-se': 'se-resize',
      'resize-s': 's-resize',
      'resize-sw': 'sw-resize',
      'resize-w': 'w-resize',
    }
    return cursorMap[type] || 'default'
  }

  // 鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'crop') return

    const pos = getMousePosition(e)
    const type = cropArea ? getDragType(pos.x, pos.y) : 'create'

    setIsDragging(true)
    setDragStart(pos)
    setDragType(type)
    setOriginalCropArea(cropArea)

    if (type === 'create') {
      // 开始创建新的截图区域
      setCropArea({ x: pos.x, y: pos.y, width: 0, height: 0 })
    }
  }

  // 鼠标移动事件
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'crop') return

    const pos = getMousePosition(e)
    const container = cropContainerRef.current
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    if (!isDragging) {
      // 未拖拽时，更新光标样式
      const type = cropArea ? getDragType(pos.x, pos.y) : 'none'
      container.style.cursor = getCursor(type)
      return
    }

    const dx = pos.x - dragStart.x
    const dy = pos.y - dragStart.y

    if (dragType === 'create') {
      // 创建截图区域
      const newCropArea = {
        x: Math.min(dragStart.x, pos.x),
        y: Math.min(dragStart.y, pos.y),
        width: Math.abs(pos.x - dragStart.x),
        height: Math.abs(pos.y - dragStart.y),
      }
      setCropArea(newCropArea)
    } else if (dragType === 'move' && originalCropArea) {
      // 移动截图区域
      let newX = originalCropArea.x + dx
      let newY = originalCropArea.y + dy

      // 限制在容器内
      newX = Math.max(0, Math.min(newX, containerWidth - originalCropArea.width))
      newY = Math.max(0, Math.min(newY, containerHeight - originalCropArea.height))

      setCropArea({
        ...originalCropArea,
        x: newX,
        y: newY,
      })
    } else if (dragType.startsWith('resize-') && originalCropArea) {
      // 调整截图区域大小
      let { x, y, width, height } = originalCropArea

      if (dragType.includes('w')) {
        // 左边调整
        const newX = Math.max(0, Math.min(x + dx, x + width - 10))
        width = width + (x - newX)
        x = newX
      }
      if (dragType.includes('e')) {
        // 右边调整
        width = Math.max(10, Math.min(width + dx, containerWidth - x))
      }
      if (dragType.includes('n')) {
        // 上边调整
        const newY = Math.max(0, Math.min(y + dy, y + height - 10))
        height = height + (y - newY)
        y = newY
      }
      if (dragType.includes('s')) {
        // 下边调整
        height = Math.max(10, Math.min(height + dy, containerHeight - y))
      }

      setCropArea({ x, y, width, height })
    }
  }

  // 鼠标抬起事件
  const handleMouseUp = () => {
    setIsDragging(false)
    setDragType('none')
    setOriginalCropArea(null)
  }

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    // 重置加载状态
    setLoaded(false)

    const handleLoad = () => {
      setLoaded(true)
      // 初始加载时绘制图片
      drawImageToCanvas()
    }

    // 如果图片已经加载完成（从缓存），直接触发
    if (img.complete && img.naturalWidth > 0) {
      handleLoad()
    } else {
      img.onload = handleLoad
      img.onerror = () => {
        console.error('图片加载失败:', imageUrl)
      }
    }

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [imageUrl, cropData])

  // 实时应用色调调整
  useEffect(() => {
    if (loaded && mode === 'edit') {
      applyFilters()
    }
  }, [brightness, contrast, saturation, loaded, mode])

  // 切换到裁剪模式时重置截图区域
  useEffect(() => {
    if (mode === 'crop') {
      setCropArea(null)
    }
  }, [mode])

  const drawImageToCanvas = () => {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(img, 0, 0)
  }

  const applyFilters = () => {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 重新绘制原图
    ctx.filter = 'none'
    ctx.drawImage(img, 0, 0)

    // 应用滤镜
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    ctx.drawImage(img, 0, 0)
    ctx.filter = 'none'
  }


  const handleCrop = () => {
    if (!cropArea || cropArea.width === 0 || cropArea.height === 0) {
      alert('请先选择截图区域')
      return
    }

    const img = imgRef.current
    const container = cropContainerRef.current
    if (!img || !container) return

    try {
      // 获取图片的显示尺寸和实际尺寸
      const displayWidth = img.clientWidth
      const displayHeight = img.clientHeight
      const naturalWidth = img.naturalWidth
      const naturalHeight = img.naturalHeight

      // 计算缩放比例
      const scaleX = naturalWidth / displayWidth
      const scaleY = naturalHeight / displayHeight

      // 计算裁剪区域在原图中的实际像素位置和尺寸
      const actualX = Math.round(cropArea.x * scaleX)
      const actualY = Math.round(cropArea.y * scaleY)
      const actualWidth = Math.round(cropArea.width * scaleX)
      const actualHeight = Math.round(cropArea.height * scaleY)

      // 创建临时画布进行裁剪
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = actualWidth
      tempCanvas.height = actualHeight
      const ctx = tempCanvas.getContext('2d')

      if (!ctx) {
        alert('无法创建画布上下文')
        return
      }

      // 从原图裁剪指定区域
      ctx.drawImage(
        img,
        actualX,
        actualY,
        actualWidth,
        actualHeight,
        0,
        0,
        actualWidth,
        actualHeight
      )

      // 保存裁剪后的图片数据
      setCropData(tempCanvas.toDataURL('image/jpeg', 0.95))
      setCropArea(null)
      setMode('edit')
    } catch (err) {
      console.error('Crop failed:', err)
      alert('裁剪失败，请重试')
    }
  }

  const resetCrop = () => {
    setCropArea(null)
  }

  // 辅助函数：加载图片
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  const saveEdit = async () => {
    const img = imgRef.current
    if (!img) {
      alert('图片未加载')
      return
    }

    try {
      // 创建临时 canvas 来应用滤镜并导出
      const tempCanvas = document.createElement('canvas')
      let sourceImg: HTMLImageElement

      if (cropData) {
        sourceImg = await loadImage(cropData)
      } else {
        // 重新加载原图以确保 crossOrigin 正确设置
        sourceImg = await loadImage(img.src)
      }

      tempCanvas.width = sourceImg.naturalWidth || sourceImg.width
      tempCanvas.height = sourceImg.naturalHeight || sourceImg.height

      if (tempCanvas.width === 0 || tempCanvas.height === 0) {
        alert('图片尺寸无效')
        return
      }

      const ctx = tempCanvas.getContext('2d')
      if (!ctx) {
        alert('无法创建画布上下文')
        return
      }

      // 应用滤镜
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      ctx.drawImage(sourceImg, 0, 0)

      const blob: Blob | null = await new Promise<Blob | null>((resolve) =>
        tempCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
      )

      if (!blob) {
        alert('无法生成图片数据，请检查浏览器是否支持')
        return
      }

      const form = new FormData()
      form.append('image', blob, 'edited.jpg')
      form.append('saveAs', 'overwrite')

      // 构建 API URL
      const apiUrl = `/api/images/${window.location.pathname.split('/').pop()}/edit`

      const res = await fetch(apiUrl, {
        method: 'POST',
        body: form,
      })

      if (res.ok) {
        alert('保存成功')
        onSaved && onSaved()
      } else {
        const data = await res.json().catch(() => ({ error: '未知错误' }))
        alert('保存失败: ' + (data.error || res.statusText))
      }
    } catch (err) {
      console.error('保存失败:', err)
      alert('保存失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  const resetAll = () => {
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setCropData(null)
    setCropArea(null)
    if (imgRef.current) {
      drawImageToCanvas()
    }
  }


  return (
    <div className="space-y-4">
      <style jsx global>{`
        .crop-container {
          position: relative;
          display: inline-block;
          user-select: none;
        }
        .crop-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          pointer-events: none;
        }
        .crop-area {
          position: absolute;
          border: 2px solid #3b82f6;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
          cursor: move;
        }
        .crop-handle {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
        }
        .crop-handle.nw { top: -6px; left: -6px; cursor: nw-resize; }
        .crop-handle.n { top: -6px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
        .crop-handle.ne { top: -6px; right: -6px; cursor: ne-resize; }
        .crop-handle.e { top: 50%; right: -6px; transform: translateY(-50%); cursor: e-resize; }
        .crop-handle.se { bottom: -6px; right: -6px; cursor: se-resize; }
        .crop-handle.s { bottom: -6px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
        .crop-handle.sw { bottom: -6px; left: -6px; cursor: sw-resize; }
        .crop-handle.w { top: 50%; left: -6px; transform: translateY(-50%); cursor: w-resize; }
        .crop-size-info {
          position: absolute;
          top: -30px;
          left: 0;
          background: rgba(0, 0, 0, 0.75);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
        }
      `}</style>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 左侧：图片预览区域 */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">图片预览</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="relative bg-gray-100 rounded-lg overflow-hidden"
                style={{ minHeight: '400px' }}
              >
                {/* 加载中提示 */}
                {!loaded && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-400">加载中...</div>
                  </div>
                )}

                {/* 图片显示区域 */}
                {mode === 'edit' ? (
                  <img
                    ref={imgRef}
                    src={cropData || imageUrl}
                    alt="编辑图片"
                    crossOrigin="anonymous"
                    className="max-w-full h-auto block mx-auto"
                    style={{
                      display: loaded ? 'block' : 'none',
                      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                    }}
                  />
                ) : (
                  <div
                    ref={cropContainerRef}
                    className="crop-container"
                    style={{
                      display: loaded ? 'inline-block' : 'none',
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <img
                      ref={imgRef}
                      src={cropData || imageUrl}
                      alt="裁剪图片"
                      crossOrigin="anonymous"
                      className="max-w-full h-auto block"
                      draggable={false}
                    />
                    {/* 截图区域 */}
                    {cropArea && cropArea.width > 0 && cropArea.height > 0 && (
                      <div
                        className="crop-area"
                        style={{
                          left: `${cropArea.x}px`,
                          top: `${cropArea.y}px`,
                          width: `${cropArea.width}px`,
                          height: `${cropArea.height}px`,
                        }}
                      >
                        {/* 尺寸信息 */}
                        <div className="crop-size-info">
                          {Math.round(cropArea.width)} × {Math.round(cropArea.height)}
                        </div>
                        {/* 8个拖拽点 */}
                        <div className="crop-handle nw" />
                        <div className="crop-handle n" />
                        <div className="crop-handle ne" />
                        <div className="crop-handle e" />
                        <div className="crop-handle se" />
                        <div className="crop-handle s" />
                        <div className="crop-handle sw" />
                        <div className="crop-handle w" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 隐藏的画布用于处理图片 */}
              <canvas ref={canvasRef} className="hidden" />
            </CardContent>
          </Card>
        </div>

        {/* 右侧：控制面板 */}
        <div className="w-full lg:w-96">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">编辑工具</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={mode}
                onValueChange={(v: string) => setMode(v as 'edit' | 'crop')}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    色调调整
                  </TabsTrigger>
                  <TabsTrigger value="crop" className="flex items-center gap-2">
                    <Crop className="h-4 w-4" />
                    裁剪
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        亮度: {brightness}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>暗</span>
                        <span>亮</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        对比度: {contrast}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>低</span>
                        <span>高</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        饱和度: {saturation}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={saturation}
                        onChange={(e) => setSaturation(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>单色</span>
                        <span>鲜艳</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="crop" className="mt-4 space-y-4">
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>• 在图片上按住鼠标左键并拖拽选择截图区域</p>
                    <p>• 拖动边框上的圆点可以调整大小</p>
                    <p>• 点击截图区域内部可以移动位置</p>
                    <p>• 选择完成后点击"确认裁剪"应用更改</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={resetCrop}
                      className="flex-1 flex items-center gap-2"
                      disabled={!cropArea}
                    >
                      <RotateCcw className="h-4 w-4" />
                      重置
                    </Button>
                    <Button
                      onClick={handleCrop}
                      className="flex-1"
                      disabled={!cropArea || cropArea.width === 0 || cropArea.height === 0}
                    >
                      确认裁剪
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex flex-col gap-2">
                <Button
                  onClick={saveEdit}
                  className="w-full flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  保存并覆盖
                </Button>
                <Button
                  variant="outline"
                  onClick={resetAll}
                  className="w-full"
                >
                  重置所有更改
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
