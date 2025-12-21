import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface ImageLocation {
  id: string
  latitude: number
  longitude: number
  title: string | null
  originalName: string
  takenAt: string | null
}

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

    // 查询所有带有 GPS 信息的图片
    const images = await prisma.image.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        title: true,
        originalName: true,
        takenAt: true,
      },
      orderBy: {
        takenAt: 'desc',
      },
    })

    // 统计信息
    const totalImages = await prisma.image.count({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
    })

    const imagesWithLocation = images.length
    const imagesWithoutLocation = totalImages - imagesWithLocation

    return NextResponse.json({
      images: images.map(img => ({
        id: img.id,
        latitude: img.latitude as number,
        longitude: img.longitude as number,
        title: img.title,
        originalName: img.originalName,
        takenAt: img.takenAt?.toISOString() || null,
      })),
      stats: {
        total: totalImages,
        withLocation: imagesWithLocation,
        withoutLocation: imagesWithoutLocation,
      },
    })
  } catch (error) {
    console.error('Fetch image locations error:', error)
    return NextResponse.json(
      { error: '获取图片位置失败' },
      { status: 500 }
    )
  }
}
