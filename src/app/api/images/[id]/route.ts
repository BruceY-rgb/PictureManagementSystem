import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const image = await prisma.image.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        width: true,
        height: true,
        aspectRatio: true,
        orientation: true,
        title: true,
        description: true,
        takenAt: true,
        cameraModel: true,
        cameraMake: true,
        lensModel: true,
        focalLength: true,
        aperture: true,
        shutterSpeed: true,
        iso: true,
        latitude: true,
        longitude: true,
        altitude: true,
        software: true,
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
    })

    if (!image) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      )
    }

    // 增加查看次数
    await prisma.image.update({
      where: { id: params.id },
      data: { viewCount: { increment: 1 } },
    })

    return NextResponse.json({ image })
  } catch (error) {
    console.error('Fetch image error:', error)
    return NextResponse.json(
      { error: '获取图片失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const image = await prisma.image.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!image) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      )
    }

    // 软删除：设置 deletedAt 字段
    await prisma.image.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ message: '已移至回收站' })
  } catch (error) {
    console.error('Delete image error:', error)
    return NextResponse.json(
      { error: '删除图片失败' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const { title, description } = body

    const image = await prisma.image.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!image) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      )
    }

    const updatedImage = await prisma.image.update({
      where: { id: params.id },
      data: {
        title,
        description,
      },
    })

    return NextResponse.json({ image: updatedImage })
  } catch (error) {
    console.error('Update image error:', error)
    return NextResponse.json(
      { error: '更新图片失败' },
      { status: 500 }
    )
  }
}
