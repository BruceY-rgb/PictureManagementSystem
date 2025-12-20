import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

    const imageId = params.id
    const body = await req.json()
    const { tagId, name, color } = body

    // check image belongs to user
    const image = await prisma.image.findUnique({ where: { id: imageId } })
    if (!image) return NextResponse.json({ error: '图片不存在' }, { status: 404 })
    if (image.userId !== userId) return NextResponse.json({ error: '无权操作该图片' }, { status: 403 })

    let tag = null
    if (tagId) {
      tag = await prisma.tag.findUnique({ where: { id: tagId } })
      if (!tag) return NextResponse.json({ error: '标签不存在' }, { status: 404 })
    } else if (name) {
      // find or create
      tag = await prisma.tag.findUnique({ where: { name } })
      if (!tag) {
        tag = await prisma.tag.create({ data: { name, color: color || undefined, type: 'CUSTOM' } })
      }
    } else {
      return NextResponse.json({ error: '需要 tagId 或 name' }, { status: 400 })
    }

    // attach if not exists
    const exist = await prisma.imageTag.findUnique({ where: { imageId_tagId: { imageId, tagId: tag.id } } })
    if (!exist) {
      await prisma.imageTag.create({ data: { imageId, tagId: tag.id } })
      // increment tag useCount
      await prisma.tag.update({ where: { id: tag.id }, data: { useCount: { increment: 1 } } })
    }

    return NextResponse.json({ message: '已添加标签', tag })
  } catch (error) {
    console.error('Add tag to image error:', error)
    return NextResponse.json({ error: '添加标签失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

    const imageId = params.id
    const body = await req.json()
    const { tagId } = body
    if (!tagId) return NextResponse.json({ error: '缺少 tagId' }, { status: 400 })

    const image = await prisma.image.findUnique({ where: { id: imageId } })
    if (!image) return NextResponse.json({ error: '图片不存在' }, { status: 404 })
    if (image.userId !== userId) return NextResponse.json({ error: '无权操作该图片' }, { status: 403 })

    const rel = await prisma.imageTag.findUnique({ where: { imageId_tagId: { imageId, tagId } } })
    if (!rel) return NextResponse.json({ error: '关联不存在' }, { status: 404 })

    await prisma.imageTag.delete({ where: { imageId_tagId: { imageId, tagId } } })
    await prisma.tag.update({ where: { id: tagId }, data: { useCount: { decrement: 1 } } })

    return NextResponse.json({ message: '已移除标签' })
  } catch (error) {
    console.error('Remove tag from image error:', error)
    return NextResponse.json({ error: '移除标签失败' }, { status: 500 })
  }
}
