'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2 } from 'lucide-react'

interface Tag {
  id: string
  name: string
  type: string
  color: string | null
  useCount: number
}

interface TagSearchInputProps {
  selectedTags: string[]
  onTagSelect: (tagName: string) => void
  placeholder?: string
}

export function TagSearchInput({
  selectedTags,
  onTagSelect,
  placeholder = "搜索标签..."
}: TagSearchInputProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // 防抖搜索
  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(
          `/api/tags?search=${encodeURIComponent(input)}&sort=useCount_desc&limit=10`
        )
        const data = await res.json()
        setSuggestions(data.tags || [])
        setShowSuggestions(true)
      } catch (error) {
        console.error('Tag search failed:', error)
      } finally {
        setIsLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [input])

  const handleSelect = (tagName: string) => {
    onTagSelect(tagName)
    setInput('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => input && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
        )}
      </div>

      {/* 建议下拉列表 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          {suggestions
            .filter(tag => !selectedTags.includes(tag.name))
            .map((tag) => (
              <div
                key={tag.id}
                onClick={() => handleSelect(tag.name)}
                className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>{tag.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {tag.type === 'AUTO_AI' ? 'AI' :
                     tag.type === 'AUTO_EXIF' ? 'EXIF' :
                     '自定义'}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {tag.useCount}次
                </span>
              </div>
            ))}
        </div>
      )}

      {/* 无结果提示 */}
      {showSuggestions && input && !isLoading && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-4 text-center text-sm text-muted-foreground">
          未找到匹配的标签
        </div>
      )}
    </div>
  )
}
