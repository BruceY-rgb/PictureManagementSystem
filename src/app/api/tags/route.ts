import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const type = url.searchParams.get('type') || undefined
    const sort = url.searchParams.get('sort') || 'useCount_desc'
    const search = url.searchParams.get('search') || undefined

    // 分页参数
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const where: any = {}
    if (type) where.type = type
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const orderBy: any = {}
    const [field, dir] = sort.split('_')
    orderBy[field || 'useCount'] = dir === 'asc' ? 'asc' : 'desc'

    const tags = await prisma.tag.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
    })

    // 获取总数（用于分页）
    const total = await prisma.tag.count({ where })

    return NextResponse.json({
      tags,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + tags.length < total
      }
    })
  } catch (error) {
    console.error('Fetch tags error:', error)
    return NextResponse.json({ error: '获取标签失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const { name, color } = body
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: '标签名称不能为空' }, { status: 400 })
    }

    // create custom tag
    const existing = await prisma.tag.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: '标签已存在' }, { status: 409 })
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || undefined,
        type: 'CUSTOM',
      },
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error) {
    console.error('Create tag error:', error)
    return NextResponse.json({ error: '创建标签失败' }, { status: 500 })
  }
}
