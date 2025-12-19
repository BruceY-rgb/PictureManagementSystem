import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // 验证用户登录
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 获取查询参数
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const favorite = searchParams.get('favorite') === 'true'

    const skip = (page - 1) * limit

    // 构建查询条件
    const where: any = {
      userId: session.user.id,
      deletedAt: null, // 默认不返回已删除的图片
    }

    // 如果查询收藏的图片
    if (favorite) {
      where.isFavorite = true
    }

    // 查询图片
    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          width: true,
          height: true,
          title: true,
          description: true,
          takenAt: true,
          createdAt: true,
          updatedAt: true,
          viewCount: true,
          isFavorite: true,
          aiAnalyzed: true,
          aiLabels: true,
          aiConfidence: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.image.count({
        where,
      }),
    ])

    return NextResponse.json({
      images,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Fetch images error:', error)
    return NextResponse.json(
      { error: '获取图片列表失败' },
      { status: 500 }
    )
  }
}
