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
        { error: '图片未在回收站中' },
        { status: 400 }
      )
    }

    // 恢复图片：清空 deletedAt 字段
    const restoredImage = await prisma.image.update({
      where: { id: params.id },
      data: { deletedAt: null },
    })

    return NextResponse.json({
      message: '恢复成功',
      image: restoredImage,
    })
  } catch (error) {
    console.error('Restore image error:', error)
    return NextResponse.json(
      { error: '恢复图片失败' },
      { status: 500 }
    )
  }
}
