import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processImage } from '@/lib/image-utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('image') as File
    const saveAs = (form.get('saveAs') as string) || 'overwrite'

    if (!file) return NextResponse.json({ error: '缺少图片数据' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // check image ownership
    const img = await prisma.image.findUnique({ where: { id: params.id } })
    if (!img) return NextResponse.json({ error: '图片不存在' }, { status: 404 })
    if (img.userId !== userId) return NextResponse.json({ error: '无权编辑该图片' }, { status: 403 })

    // process edited image
    const processed = await processImage(buffer)

    if (saveAs === 'overwrite') {
      const updated = await prisma.image.update({
        where: { id: params.id },
        data: {
          originalImage: processed.originalImage,
          thumbnailSmall: processed.thumbnailSmall,
          thumbnailMedium: processed.thumbnailMedium,
          thumbnailLarge: processed.thumbnailLarge,
          mimeType: processed.metadata.mimeType,
          fileSize: processed.metadata.fileSize,
          width: processed.metadata.width,
          height: processed.metadata.height,
          aspectRatio: processed.metadata.aspectRatio,
        },
      })

      return NextResponse.json({ image: updated })
    }

    // saveAs new not implemented; fallback to overwrite
    const updated = await prisma.image.update({
      where: { id: params.id },
      data: {
        originalImage: processed.originalImage,
        thumbnailSmall: processed.thumbnailSmall,
        thumbnailMedium: processed.thumbnailMedium,
        thumbnailLarge: processed.thumbnailLarge,
        mimeType: processed.metadata.mimeType,
        fileSize: processed.metadata.fileSize,
        width: processed.metadata.width,
        height: processed.metadata.height,
        aspectRatio: processed.metadata.aspectRatio,
      },
    })

    return NextResponse.json({ image: updated })
  } catch (error) {
    console.error('Edit image error:', error)
    return NextResponse.json({ error: '编辑图片失败' }, { status: 500 })
  }
}
