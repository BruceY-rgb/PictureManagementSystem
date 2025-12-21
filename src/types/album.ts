import { Image } from './image'

export interface Album {
  id: string
  userId: string
  name: string
  description: string | null
  coverImageId: string | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    images: number
  }
}

export interface AlbumWithImages extends Album {
  images: {
    image: Image
    addedAt: Date
  }[]
}

export interface AlbumImage {
  albumId: string
  imageId: string
  addedAt: Date
}

export interface AlbumCreateInput {
  name: string
  description?: string
}

export interface AlbumUpdateInput {
  name?: string
  description?: string
  coverImageId?: string
}
