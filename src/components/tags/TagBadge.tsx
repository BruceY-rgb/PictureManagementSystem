"use client"

import React from 'react'
import { Trash2 } from 'lucide-react'

type TagBadgeProps = {
  id: string
  name: string
  type?: string
  color?: string | null
  count?: number
  onRemove?: (id: string) => void
}

export function TagBadge({ id, name, type, color, count, onRemove }: TagBadgeProps) {
  const bg = color || (type === 'AUTO_EXIF' ? 'bg-blue-100' : type === 'AUTO_AI' ? 'bg-purple-100' : 'bg-green-100')
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${typeof bg === 'string' && bg.startsWith('#') ? '' : bg}`} style={typeof bg === 'string' && bg.startsWith('#') ? { backgroundColor: bg } : undefined}>
      <span className="text-sm font-medium truncate max-w-[160px]">{name}</span>
      {typeof count === 'number' && <span className="text-xs text-muted-foreground">{count}</span>}
      {onRemove && (
        <button className="ml-2 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onRemove(id) }} aria-label="移除标签">
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

export default TagBadge
