import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        images: {
          include: {
            image: {
              select: {
                id: true,
                title: true,
                originalName: true,
                width: true,
                height: true,
                fileSize: true,
                createdAt: true,
              },
            },
          },
        },
      },
    })

    if (!tag) return NextResponse.json({ error: '标签不存在' }, { status: 404 })

    // Flatten images
    const images = tag.images.map((it) => it.image)

    return NextResponse.json({ tag: { ...tag, images } })
  } catch (error) {
    console.error('Fetch tag detail error:', error)
    return NextResponse.json({ error: '获取标签详情失败' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

    const id = params.id
    const body = await req.json()
    const { name, color } = body

    const tag = await prisma.tag.findUnique({ where: { id } })
    if (!tag) return NextResponse.json({ error: '标签不存在' }, { status: 404 })

    if (tag.type !== 'CUSTOM') {
      return NextResponse.json({ error: '自动生成的标签不能被编辑' }, { status: 403 })
    }

    // Note: schema has no owner; assumption: any authenticated user can edit custom tags.
    const updated = await prisma.tag.update({ where: { id }, data: { name: name || tag.name, color: color || tag.color } })

    return NextResponse.json({ tag: updated })
  } catch (error) {
    console.error('Update tag error:', error)
    return NextResponse.json({ error: '更新标签失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

    const id = params.id
    const tag = await prisma.tag.findUnique({ where: { id } })
    if (!tag) return NextResponse.json({ error: '标签不存在' }, { status: 404 })

    if (tag.type !== 'CUSTOM') {
      return NextResponse.json({ error: '自动生成的标签不能被删除' }, { status: 403 })
    }

    // count affected images
    const count = await prisma.imageTag.count({ where: { tagId: id } })

    await prisma.tag.delete({ where: { id } })

    return NextResponse.json({ message: '删除成功', affected: count })
  } catch (error) {
    console.error('Delete tag error:', error)
    return NextResponse.json({ error: '删除标签失败' }, { status: 500 })
  }
}
