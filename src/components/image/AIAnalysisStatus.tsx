'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AILabels {
  scenes?: string[]
  objects?: string[]
  people?: string[]
  text?: string[]
  emotions?: string[]
  details?: string[]
  analyzedAt?: string
  model?: string
}

interface AIAnalysisStatusProps {
  imageId: string
  aiAnalyzed: boolean
  aiLabels?: AILabels | null
  aiConfidence?: number | null
  className?: string
  onRetry?: () => void
  showDetails?: boolean
}

export function AIAnalysisStatus({
  imageId,
  aiAnalyzed,
  aiLabels,
  aiConfidence,
  className = '',
  onRetry,
  showDetails = false,
}: AIAnalysisStatusProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    if (!onRetry) return
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  // Not analyzed yet - show pending status
  if (!aiAnalyzed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`gap-1 ${className}`}>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">AI分析中...</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">AI正在分析图片内容，请稍候</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Failed analysis (confidence = 0 or no labels)
  if (aiAnalyzed && (!aiLabels || aiConfidence === 0)) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
                <AlertCircle className="h-3 w-3" />
                <span className="text-xs">分析失败</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">AI分析失败，可能是网络问题或API配置错误</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            <span className="ml-1 text-xs">重试</span>
          </Button>
        )}
      </div>
    )
  }

  // Successfully analyzed
  const labels = aiLabels as AILabels
  const allLabels = [
    ...(labels?.scenes || []),
    ...(labels?.objects || []),
    ...(labels?.people || []),
    ...(labels?.emotions || []),
  ]

  if (allLabels.length === 0) {
    return (
      <Badge variant="outline" className={`gap-1 text-muted-foreground ${className}`}>
        <CheckCircle2 className="h-3 w-3" />
        <span className="text-xs">已分析 (无标签)</span>
      </Badge>
    )
  }

  // Simple badge view
  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className={`gap-1 ${className}`}>
              <Sparkles className="h-3 w-3" />
              <span className="text-xs">AI: {allLabels.length} 标签</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <AILabelsTooltip labels={labels} aiConfidence={aiConfidence} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Detailed view
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3" />
          <span className="text-xs">AI分析完成</span>
        </Badge>
        {aiConfidence && (
          <span className="text-xs text-muted-foreground">
            置信度: {Math.round(aiConfidence * 100)}%
          </span>
        )}
      </div>

      <AILabelsDetail labels={labels} />
    </div>
  )
}

function AILabelsTooltip({ labels, aiConfidence }: { labels: AILabels; aiConfidence?: number | null }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="font-medium">
        AI分析结果 {aiConfidence ? `(${Math.round(aiConfidence * 100)}% 置信度)` : ''}
      </div>

      {labels?.scenes && labels.scenes.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">场景:</div>
          <div className="flex flex-wrap gap-1">
            {labels.scenes.slice(0, 5).map((scene) => (
              <Badge key={scene} variant="outline" className="text-xs">
                {scene}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {labels?.objects && labels.objects.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">物体:</div>
          <div className="flex flex-wrap gap-1">
            {labels.objects.slice(0, 5).map((object) => (
              <Badge key={object} variant="outline" className="text-xs">
                {object}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {labels?.people && labels.people.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">人物:</div>
          <div className="flex flex-wrap gap-1">
            {labels.people.slice(0, 3).map((person) => (
              <Badge key={person} variant="outline" className="text-xs">
                {person}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {labels?.emotions && labels.emotions.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">氛围:</div>
          <div className="flex flex-wrap gap-1">
            {labels.emotions.slice(0, 3).map((emotion) => (
              <Badge key={emotion} variant="outline" className="text-xs">
                {emotion}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AILabelsDetail({ labels }: { labels: AILabels }) {
  return (
    <div className="space-y-3 text-sm">
      {labels?.scenes && labels.scenes.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1 font-medium">场景</div>
          <div className="flex flex-wrap gap-1">
            {labels.scenes.map((scene) => (
              <Badge key={scene} variant="secondary" className="text-xs">
                {scene}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {labels?.objects && labels.objects.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1 font-medium">物体</div>
          <div className="flex flex-wrap gap-1">
            {labels.objects.map((object) => (
              <Badge key={object} variant="secondary" className="text-xs">
                {object}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {labels?.people && labels.people.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1 font-medium">人物</div>
          <div className="flex flex-wrap gap-1">
            {labels.people.map((person) => (
              <Badge key={person} variant="secondary" className="text-xs">
                {person}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {labels?.text && labels.text.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1 font-medium">识别文字</div>
          <div className="flex flex-wrap gap-1">
            {labels.text.map((t, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {labels?.emotions && labels.emotions.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1 font-medium">情感氛围</div>
          <div className="flex flex-wrap gap-1">
            {labels.emotions.map((emotion) => (
              <Badge key={emotion} variant="secondary" className="text-xs">
                {emotion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {labels?.details && labels.details.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1 font-medium">其他细节</div>
          <div className="flex flex-wrap gap-1">
            {labels.details.map((detail, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {detail}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {labels?.analyzedAt && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          分析时间: {new Date(labels.analyzedAt).toLocaleString('zh-CN')}
        </div>
      )}
    </div>
  )
}
