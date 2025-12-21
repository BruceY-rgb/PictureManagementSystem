'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'
import { Camera, ExternalLink } from 'lucide-react'

// 修复 Leaflet 默认图标问题
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export interface ImageLocation {
  id: string
  latitude: number
  longitude: number
  title: string | null
  originalName: string
  takenAt: string | null
}

interface PhotoMapProps {
  images: ImageLocation[]
}

// 自动调整地图视野以显示所有标记
function FitBounds({ images }: { images: ImageLocation[] }) {
  const map = useMap()

  useEffect(() => {
    if (images.length === 0) return

    if (images.length === 1) {
      map.setView([images[0].latitude, images[0].longitude], 15)
    } else {
      const bounds = L.latLngBounds(
        images.map(img => [img.latitude, img.longitude])
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [images, map])

  return null
}

export function PhotoMap({ images }: PhotoMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 默认中心点（中国）
  const defaultCenter: [number, number] = [35.8617, 104.1954]
  const defaultZoom = 4

  if (!mounted) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="text-muted-foreground">加载地图中...</div>
      </div>
    )
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="w-full h-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {images.map((image) => (
        <Marker
          key={image.id}
          position={[image.latitude, image.longitude]}
        >
          <Popup>
            <div className="w-48">
              <div className="relative aspect-video bg-muted rounded overflow-hidden mb-2">
                <img
                  src={`/api/images/${image.id}/file?size=small`}
                  alt={image.title || image.originalName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm truncate">
                  {image.title || image.originalName}
                </p>
                {image.takenAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    {new Date(image.takenAt).toLocaleDateString('zh-CN')}
                  </p>
                )}
                <Link
                  href={`/gallery/${image.id}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  查看详情
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      <FitBounds images={images} />
    </MapContainer>
  )
}
