import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { isFavorite } = body

    if (typeof isFavorite !== 'boolean') {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
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

    // 更新收藏状态
    const updatedImage = await prisma.image.update({
      where: { id: params.id },
      data: { isFavorite },
    })

    return NextResponse.json({
      message: isFavorite ? '已添加到收藏夹' : '已取消收藏',
      image: updatedImage,
    })
  } catch (error) {
    console.error('Toggle favorite error:', error)
    return NextResponse.json(
      { error: '操作失败' },
      { status: 500 }
    )
  }
}
