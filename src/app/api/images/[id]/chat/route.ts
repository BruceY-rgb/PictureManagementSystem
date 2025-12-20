import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateImageReply, ImageContext } from '@/lib/ai/doubao'

interface ChatRequest {
  message: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 解析请求体
    const body: ChatRequest = await req.json()
    const { message, conversationHistory = [] } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入问题' },
        { status: 400 }
      )
    }

    // 获取图片信息(包含原始图片数据)
    const image = await prisma.image.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        width: true,
        height: true,
        takenAt: true,
        cameraModel: true,
        cameraMake: true,
        focalLength: true,
        aperture: true,
        shutterSpeed: true,
        iso: true,
        aiLabels: true,
        originalImage: true,  // 新增: 获取图片二进制数据
        mimeType: true,       // 新增: 获取MIME类型
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    if (!image) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      )
    }

    // 构建图片上下文(包含图片内容)
    const imageContext: ImageContext = {
      title: image.title,
      description: image.description,
      width: image.width,
      height: image.height,
      takenAt: image.takenAt?.toISOString() || null,
      cameraModel: image.cameraModel,
      cameraMake: image.cameraMake,
      focalLength: image.focalLength,
      aperture: image.aperture,
      shutterSpeed: image.shutterSpeed,
      iso: image.iso,
      // 从标签中提取
      tags: image.tags.map(t => t.tag.name),
      // 从 AI 分析结果中提取标签
      labels: parseAiLabels(image.aiLabels),
      // 新增: 传递图片数据用于Vision问答
      imageBuffer: image.originalImage || undefined,
      mimeType: image.mimeType || undefined,
    }

    // 调用 DeepSeek 生成回答
    const reply = await generateImageReply(
      message.trim(),
      imageContext,
      conversationHistory
    )

    return NextResponse.json({
      reply,
      imageContext: {
        tags: imageContext.tags,
        labels: imageContext.labels,
        hasExif: !!(imageContext.takenAt || imageContext.cameraModel),
      },
    })
  } catch (error) {
    console.error('[Image Chat] Error:', error)

    // 返回更友好的错误信息
    if (error instanceof Error) {
      if (error.message.includes('API key not configured')) {
        return NextResponse.json(
          { error: 'AI 服务未配置，请联系管理员' },
          { status: 503 }
        )
      }
      if (error.message.includes('超时')) {
        return NextResponse.json(
          { error: '请求超时，请稍后重试' },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'AI 问答服务暂时不可用' },
      { status: 500 }
    )
  }
}

/**
 * 解析 AI 标签（存储为 JSON）
 */
function parseAiLabels(aiLabels: unknown): string[] {
  if (!aiLabels) return []

  try {
    // aiLabels 可能是 JSON 字符串或已解析的对象
    const parsed = typeof aiLabels === 'string' ? JSON.parse(aiLabels) : aiLabels

    // 可能是数组格式
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item.keyword) return item.keyword
        return String(item)
      }).filter(Boolean)
    }

    // 可能是对象格式 { scenes: [], objects: [] }
    if (typeof parsed === 'object') {
      const labels: string[] = []
      if (Array.isArray(parsed.scenes)) labels.push(...parsed.scenes)
      if (Array.isArray(parsed.objects)) labels.push(...parsed.objects)
      if (Array.isArray(parsed.emotions)) labels.push(...parsed.emotions)
      return labels
    }

    return []
  } catch {
    return []
  }
}
