"use client"

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface ImageData {
  id: string
  title: string | null
  originalName: string
}

interface ImageCarouselProps {
  images: ImageData[]
  autoPlayInterval?: number
}

export default function ImageCarousel({ images, autoPlayInterval = 3000 }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    setImageError({})
  }, [images.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
    setImageError({})
  }, [images.length])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setImageError({})
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && images.length > 1) {
      interval = setInterval(goToNext, autoPlayInterval)
    }
    return () => clearInterval(interval)
  }, [isPlaying, images.length, autoPlayInterval, goToNext])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious()
      if (e.key === 'ArrowRight') goToNext()
      if (e.key === 'Escape') setIsFullscreen(false)
      if (e.key === ' ') {
        e.preventDefault()
        togglePlayPause()
      }
    }

    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen, goToPrevious, goToNext])

  if (!images || images.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">暂无图片可展示</p>
        </CardContent>
      </Card>
    )
  }

  const currentImage = images[currentIndex]

  return (
    <>
      <Card className="overflow-hidden h-full flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col">
          <div className="relative group flex-1 flex flex-col">
            <div className="relative flex-1 min-h-[400px] bg-black/5 overflow-hidden">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out"
                  style={{
                    opacity: index === currentIndex ? 1 : 0,
                    pointerEvents: index === currentIndex ? 'auto' : 'none',
                  }}
                >
                  {!imageError[image.id] ? (
                    <img
                      src={`/api/images/${image.id}/file?size=large`}
                      alt={image.title || image.originalName}
                      className="max-h-full max-w-full object-contain cursor-pointer"
                      onClick={toggleFullscreen}
                      onError={() => setImageError({ ...imageError, [image.id]: true })}
                    />
                  ) : (
                    <div className="text-center p-8">
                      <p className="text-muted-foreground">图片加载失败</p>
                      <p className="text-sm text-muted-foreground mt-2">{image.title || image.originalName}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <span className="text-white text-sm font-medium">
                    {currentIndex + 1} / {images.length}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="p-4 bg-background border-t">
            <h3 className="font-semibold text-base truncate mb-3">
              {currentImage.title || currentImage.originalName}
            </h3>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {images.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => goToSlide(index)}
                    className={`relative flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-primary/50'
                    }`}
                  >
                    {!imageError[img.id] ? (
                      <img
                        src={`/api/images/${img.id}/file?size=small`}
                        alt={img.title || img.originalName}
                        className="w-full h-full object-cover"
                        onError={() => setImageError({ ...imageError, [img.id]: true })}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">N/A</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            <X className="h-6 w-6" />
          </Button>

          {!imageError[currentImage.id] ? (
            <img
              src={`/api/images/${currentImage.id}/file?size=original`}
              alt={currentImage.title || currentImage.originalName}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onError={() => setImageError({ ...imageError, [currentImage.id]: true })}
            />
          ) : (
            <div className="text-center p-8 text-white">
              <p>图片加载失败</p>
              <p className="text-sm mt-2">{currentImage.title || currentImage.originalName}</p>
            </div>
          )}

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={goToNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 rounded-full px-6 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-white hover:bg-white/20"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <span className="text-white font-medium">
                  {currentIndex + 1} / {images.length}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
