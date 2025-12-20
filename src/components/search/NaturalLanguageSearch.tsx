'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Sparkles, X } from 'lucide-react'
import { parseNaturalLanguage, getQuerySuggestions } from '@/lib/mcp/parser'

interface NaturalLanguageSearchProps {
  defaultQuery?: string
  onSearch?: (query: string) => void
}

export function NaturalLanguageSearch({
  defaultQuery = '',
  onSearch,
}: NaturalLanguageSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultQuery)
  const [parsedPreview, setParsedPreview] = useState<ReturnType<typeof parseNaturalLanguage> | null>(null)
  const [isNLMode, setIsNLMode] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Debounced parsing preview
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query && isNLMode && query.length >= 3) {
        const parsed = parseNaturalLanguage(query)
        setParsedPreview(parsed)
      } else {
        setParsedPreview(null)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [query, isNLMode])

  const handleSearch = () => {
    if (!query.trim()) return

    if (isNLMode) {
      // Use natural language search
      if (onSearch) {
        onSearch(query)
      } else {
        router.push(`/search?nlq=${encodeURIComponent(query)}`)
      }
    } else {
      // Use keyword search
      if (onSearch) {
        onSearch(query)
      } else {
        router.push(`/search?keyword=${encodeURIComponent(query)}`)
      }
    }
    setShowSuggestions(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const useSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
  }

  const clearQuery = () => {
    setQuery('')
    setParsedPreview(null)
  }

  const suggestions = getQuerySuggestions()

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">
      {/* Search Input */}
      <div className="relative">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={
                isNLMode
                  ? "Ask me anything: 'beach photos with people', 'sunset pictures from last year'..."
                  : 'Search by keyword...'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => !query && setShowSuggestions(true)}
              className="pl-10 pr-10 h-12 text-base"
            />
            {query && (
              <button
                onClick={clearQuery}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button onClick={handleSearch} size="lg" className="h-12 px-6">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Mode Toggle */}
        <div className="absolute top-full mt-2 right-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsNLMode(!isNLMode)}
            className="text-xs"
          >
            {isNLMode ? (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                Natural Language
              </>
            ) : (
              <>
                <Search className="h-3 w-3 mr-1" />
                Keyword Search
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Parsed Preview */}
      {parsedPreview && isNLMode && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Searching for:</span>
            <Badge variant="secondary" className="text-xs">
              {Math.round(parsedPreview.confidence * 100)}% confident
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            {parsedPreview.scenes && parsedPreview.scenes.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">Scenes:</span>
                {parsedPreview.scenes.map((scene) => (
                  <Badge key={scene} variant="outline" className="text-xs">
                    {scene}
                  </Badge>
                ))}
              </div>
            )}

            {parsedPreview.objects && parsedPreview.objects.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">Objects:</span>
                {parsedPreview.objects.map((object) => (
                  <Badge key={object} variant="outline" className="text-xs">
                    {object}
                  </Badge>
                ))}
              </div>
            )}

            {parsedPreview.emotions && parsedPreview.emotions.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">Emotions:</span>
                {parsedPreview.emotions.map((emotion) => (
                  <Badge key={emotion} variant="outline" className="text-xs">
                    {emotion}
                  </Badge>
                ))}
              </div>
            )}

            {parsedPreview.dates && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">Date:</span>
                <Badge variant="outline" className="text-xs">
                  {parsedPreview.dates.start
                    ? new Date(parsedPreview.dates.start).toLocaleDateString()
                    : ''}
                  {parsedPreview.dates.end &&
                    ` - ${new Date(parsedPreview.dates.end).toLocaleDateString()}`}
                </Badge>
              </div>
            )}

            {parsedPreview.keywords && parsedPreview.keywords.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">Keywords:</span>
                {parsedPreview.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Query Suggestions */}
      {showSuggestions && !query && isNLMode && (
        <div className="bg-background border rounded-lg p-3 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Try these examples:</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Badge
                key={suggestion}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => useSuggestion(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
