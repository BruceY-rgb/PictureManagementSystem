export interface User {
  id: string
  username: string
  email: string
  nickname?: string | null
  avatar?: string | null
  bio?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface UserProfile {
  id: string
  username: string
  email: string
  nickname?: string | null
  avatar?: string | null
  bio?: string | null
}

export interface RegisterInput {
  username: string
  email: string
  password: string
  nickname?: string
}

export interface LoginInput {
  email: string
  password: string
}
