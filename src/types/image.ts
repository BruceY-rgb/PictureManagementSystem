import { Tag } from './tag'

export interface Image {
  id: string
  userId: string
  filename: string
  originalName: string
  mimeType: string
  fileSize: number
  width: number
  height: number
  aspectRatio?: number | null
  orientation?: number | null

  // EXIF 信息
  takenAt?: Date | null
  cameraModel?: string | null
  cameraMake?: string | null
  lensModel?: string | null
  focalLength?: number | null
  aperture?: number | null
  shutterSpeed?: string | null
  iso?: number | null
  latitude?: number | null
  longitude?: number | null
  altitude?: number | null
  gpsTimestamp?: Date | null
  software?: string | null

  // 编辑信息
  isEdited: boolean
  editHistory?: any

  // 用户自定义
  title?: string | null
  description?: string | null

  // AI 分析
  aiAnalyzed: boolean
  aiLabels?: any
  aiConfidence?: number | null

  // 统计
  viewCount: number

  // 收藏功能
  isFavorite: boolean

  // 软删除
  deletedAt?: Date | null

  createdAt: Date
  updatedAt: Date
}

export interface ImageWithTags extends Image {
  tags: {
    tag: Tag
    createdAt: Date
  }[]
}

export interface ImageListItem {
  id: string
  filename: string
  originalName: string
  thumbnailMedium: Buffer
  width: number
  height: number
  title?: string | null
  createdAt: Date
  tags: {
    tag: Tag
  }[]
}

export interface ImageUploadInput {
  file: File
  title?: string
  description?: string
  tags?: string[]
}

export interface ImageUpdateInput {
  title?: string
  description?: string
  tags?: string[]
}

export interface ImageSearchParams {
  keyword?: string
  tags?: string[]
  startDate?: Date
  endDate?: Date
  minWidth?: number
  minHeight?: number
  latitude?: number
  longitude?: number
  radius?: number
  page?: number
  limit?: number
}
