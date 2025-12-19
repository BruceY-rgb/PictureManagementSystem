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

    const searchParams = req.nextUrl.searchParams
    const size = searchParams.get('size') || 'medium' // small, medium, large, original

    const image = await prisma.image.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      select: {
        id: true,
        mimeType: true,
        thumbnailSmall: size === 'small',
        thumbnailMedium: size === 'medium',
        thumbnailLarge: size === 'large',
        originalImage: size === 'original',
      },
    })

    if (!image) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      )
    }

    let imageBuffer: Buffer | null = null

    switch (size) {
      case 'small':
        imageBuffer = image.thumbnailSmall as Buffer
        break
      case 'medium':
        imageBuffer = image.thumbnailMedium as Buffer
        break
      case 'large':
        imageBuffer = image.thumbnailLarge as Buffer
        break
      case 'original':
        imageBuffer = image.originalImage as Buffer
        break
      default:
        imageBuffer = image.thumbnailMedium as Buffer
    }

    if (!imageBuffer) {
      return NextResponse.json(
        { error: '图片数据不存在' },
        { status: 404 }
      )
    }

    // 将 Buffer 转换为 Uint8Array 以兼容 NextResponse
    const uint8Array = new Uint8Array(imageBuffer)

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': image.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Fetch image file error:', error)
    return NextResponse.json(
      { error: '获取图片文件失败' },
      { status: 500 }
    )
  }
}
