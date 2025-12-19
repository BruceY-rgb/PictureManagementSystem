import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
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
    const skip = (page - 1) * limit

    // 查询已删除的图片
    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where: {
          userId: session.user.id,
          deletedAt: { not: null },
        },
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
          deletedAt: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          deletedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.image.count({
        where: {
          userId: session.user.id,
          deletedAt: { not: null },
        },
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
    console.error('Fetch trash error:', error)
    return NextResponse.json(
      { error: '获取回收站列表失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 永久删除所有回收站中的图片
    const result = await prisma.image.deleteMany({
      where: {
        userId: session.user.id,
        deletedAt: { not: null },
      },
    })

    return NextResponse.json({
      message: '回收站已清空',
      count: result.count,
    })
  } catch (error) {
    console.error('Clear trash error:', error)
    return NextResponse.json(
      { error: '清空回收站失败' },
      { status: 500 }
    )
  }
}
