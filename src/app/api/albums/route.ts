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

    // 查询相册列表
    const [albumsData, total] = await Promise.all([
      prisma.album.findMany({
        where: {
          userId: session.user.id,
        },
        select: {
          id: true,
          name: true,
          description: true,
          coverImageId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              images: true,
            },
          },
          images: {
            select: {
              image: {
                select: {
                  id: true,
                },
              },
            },
            orderBy: {
              addedAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.album.count({
        where: {
          userId: session.user.id,
        },
      }),
    ])

    // 处理封面：如果没有指定封面，使用最新添加的图片
    const albums = albumsData.map((album) => ({
      id: album.id,
      name: album.name,
      description: album.description,
      coverImageId: album.coverImageId || album.images[0]?.image.id || null,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
      _count: album._count,
    }))

    return NextResponse.json({
      albums,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Fetch albums error:', error)
    return NextResponse.json(
      { error: '获取相册列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { name, description } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: '相册名称不能为空' },
        { status: 400 }
      )
    }

    // 创建相册
    const album = await prisma.album.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        description: description?.trim() || null,
      },
    })

    return NextResponse.json({
      message: '相册创建成功',
      album,
    })
  } catch (error) {
    console.error('Create album error:', error)
    return NextResponse.json(
      { error: '创建相册失败' },
      { status: 500 }
    )
  }
}
