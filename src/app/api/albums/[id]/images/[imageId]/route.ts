import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; imageId: string } }
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

    // 从相册中移除图片（只删除关联，不删除图片本身）
    await prisma.albumImage.delete({
      where: {
        albumId_imageId: {
          albumId: params.id,
          imageId: params.imageId,
        },
      },
    })

    return NextResponse.json({ message: '已从相册移除' })
  } catch (error) {
    console.error('Remove image from album error:', error)
    return NextResponse.json(
      { error: '移除图片失败' },
      { status: 500 }
    )
  }
}
