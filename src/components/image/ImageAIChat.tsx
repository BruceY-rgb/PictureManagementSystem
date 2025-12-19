'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Loader2, Bot, User, Sparkles, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ImageAIChatProps {
  imageId: string
  imageName?: string
}

export function ImageAIChat({ imageId, imageName }: ImageAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 发送消息
  const sendMessage = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || loading) return

    // 添加用户消息
    const userMessage: Message = { role: 'user', content: trimmedInput }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`/api/images/${imageId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          conversationHistory: messages,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        const assistantMessage: Message = { role: 'assistant', content: data.reply }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        toast({
          title: '发送失败',
          description: data.error || '请稍后重试',
          type: 'error',
        })
        // 移除刚添加的用户消息
        setMessages(prev => prev.slice(0, -1))
        setInput(trimmedInput)
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast({
        title: '网络错误',
        description: '请检查网络连接后重试',
        type: 'error',
      })
      // 移除刚添加的用户消息
      setMessages(prev => prev.slice(0, -1))
      setInput(trimmedInput)
    } finally {
      setLoading(false)
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 清空对话
  const clearChat = () => {
    setMessages([])
  }

  // 快捷问题
  const quickQuestions = [
    '图片里有什么？',
    '什么时候拍的？',
    '拍摄设备？',
  ]

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI 问答
          </span>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              清空
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-[200px] max-h-[400px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-4">
              <Bot className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm mb-3">有什么想了解的？</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {quickQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => {
                      setInput(q)
                      inputRef.current?.focus()
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                  </div>
                  <div
                    className={`flex-1 rounded-lg px-2.5 py-1.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-8'
                        : 'bg-muted mr-8'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-3 w-3" />
                  </div>
                  <div className="flex-1 rounded-lg px-2.5 py-1.5 bg-muted mr-8">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      思考中...
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入区域 */}
        <div className="flex gap-2 flex-shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题..."
            className="flex-1 min-h-[36px] max-h-[80px] px-2.5 py-1.5 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={1}
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            size="sm"
            className="h-[36px] px-3"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
