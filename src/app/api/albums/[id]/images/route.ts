import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const body = await req.json()
    const { imageIds } = body

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: '请选择要添加的图片' },
        { status: 400 }
      )
    }

    // 验证相册是否存在且属于当前用户
    const album = await prisma.album.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!album) {
      return NextResponse.json(
        { error: '相册不存在' },
        { status: 404 }
      )
    }

    // 验证所有图片都属于当前用户且未被删除
    const images = await prisma.image.findMany({
      where: {
        id: { in: imageIds },
        userId: session.user.id,
        deletedAt: null,
      },
    })

    if (images.length !== imageIds.length) {
      return NextResponse.json(
        { error: '部分图片不存在或已被删除' },
        { status: 400 }
      )
    }

    // 批量添加图片到相册（忽略已存在的关联）
    const albumImages = imageIds.map((imageId) => ({
      albumId: params.id,
      imageId,
    }))

    await prisma.albumImage.createMany({
      data: albumImages,
      skipDuplicates: true,
    })

    return NextResponse.json({
      message: `成功添加 ${imageIds.length} 张图片到相册`,
      count: imageIds.length,
    })
  } catch (error) {
    console.error('Add images to album error:', error)
    return NextResponse.json(
      { error: '添加图片失败' },
      { status: 500 }
    )
  }
}
