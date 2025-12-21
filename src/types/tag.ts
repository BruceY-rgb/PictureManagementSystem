export enum TagType {
  AUTO_EXIF = 'AUTO_EXIF',
  AUTO_AI = 'AUTO_AI',
  CUSTOM = 'CUSTOM',
}

export interface Tag {
  id: string
  name: string
  type: TagType
  color?: string | null
  useCount: number
  createdAt: Date
  updatedAt: Date
}

export interface TagInput {
  name: string
  type?: TagType
  color?: string
}
