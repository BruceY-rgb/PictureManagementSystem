import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { retryFailedTask, queueImageAnalysis, processImageAnalysis } from '@/lib/ai/analysis-queue'

/**
 * POST /api/images/[id]/analyze
 * 手动触发或重试图片的AI分析
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const imageId = params.id

    // 验证图片存在且属于当前用户
    const image = await prisma.image.findUnique({
      where: {
        id: imageId,
        userId: session.user.id,
      },
      select: {
        id: true,
        aiAnalyzed: true,
        aiConfidence: true,
      },
    })

    if (!image) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      )
    }

    // 如果已经分析过但失败了(confidence = 0)，使用重试逻辑
    if (image.aiAnalyzed && image.aiConfidence === 0) {
      await retryFailedTask(imageId, session.user.id)
    } else if (!image.aiAnalyzed) {
      // 如果还没分析过，创建新任务
      await queueImageAnalysis(imageId, session.user.id)
    } else {
      // 已经成功分析过了
      return NextResponse.json({
        message: '图片已完成AI分析',
        aiAnalyzed: true,
      })
    }

    // 立即开始处理
    processImageAnalysis(imageId, session.user.id)
      .catch(err => console.error('Failed to process AI analysis:', err))

    return NextResponse.json({
      message: '已触发AI分析',
      aiAnalyzed: false,
    })
  } catch (error) {
    console.error('Trigger AI analysis error:', error)
    return NextResponse.json(
      { error: '触发AI分析失败' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/images/[id]/analyze
 * 获取图片的AI分析状态
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const imageId = params.id

    // 获取图片AI分析状态
    const image = await prisma.image.findUnique({
      where: {
        id: imageId,
        userId: session.user.id,
      },
      select: {
        id: true,
        aiAnalyzed: true,
        aiLabels: true,
        aiConfidence: true,
      },
    })

    if (!image) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      )
    }

    // 获取任务状态
    const task = await prisma.aIAnalysisTask.findFirst({
      where: { imageId },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        retries: true,
        error: true,
        createdAt: true,
        completedAt: true,
      },
    })

    return NextResponse.json({
      aiAnalyzed: image.aiAnalyzed,
      aiLabels: image.aiLabels,
      aiConfidence: image.aiConfidence,
      task: task || null,
    })
  } catch (error) {
    console.error('Get AI analysis status error:', error)
    return NextResponse.json(
      { error: '获取AI分析状态失败' },
      { status: 500 }
    )
  }
}
