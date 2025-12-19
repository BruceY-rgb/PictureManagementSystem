import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // 验证图片是否存在且属于当前用户
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

    if (!image.deletedAt) {
      return NextResponse.json(
        { error: '只能永久删除回收站中的图片' },
        { status: 400 }
      )
    }

    // 永久删除图片（硬删除）
    // Prisma 会自动级联删除关联的标签和相册关系
    await prisma.image.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: '永久删除成功' })
  } catch (error) {
    console.error('Permanent delete image error:', error)
    return NextResponse.json(
      { error: '永久删除图片失败' },
      { status: 500 }
    )
  }
}
