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

    // 获取相册详情和图片列表
    const album = await prisma.album.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        images: {
          include: {
            image: {
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
                viewCount: true,
                isFavorite: true,
                deletedAt: true,
              },
            },
          },
          orderBy: {
            addedAt: 'desc',
          },
        },
        _count: {
          select: {
            images: true,
          },
        },
      },
    })

    if (!album) {
      return NextResponse.json(
        { error: '相册不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ album })
  } catch (error) {
    console.error('Fetch album error:', error)
    return NextResponse.json(
      { error: '获取相册失败' },
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
    const { name, description, coverImageId } = body

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

    // 更新相册
    const updatedAlbum = await prisma.album.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(coverImageId !== undefined && { coverImageId }),
      },
    })

    return NextResponse.json({
      message: '相册更新成功',
      album: updatedAlbum,
    })
  } catch (error) {
    console.error('Update album error:', error)
    return NextResponse.json(
      { error: '更新相册失败' },
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

    // 删除相册（级联删除相册-图片关联，但不删除图片本身）
    await prisma.album.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: '相册删除成功' })
  } catch (error) {
    console.error('Delete album error:', error)
    return NextResponse.json(
      { error: '删除相册失败' },
      { status: 500 }
    )
  }
}
