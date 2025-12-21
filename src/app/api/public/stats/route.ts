import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // 公开统计：总图片数、总用户数、热门标签、最近上传（公开元数据，不包含图片二进制）
    const [
      totalImages,
      totalUsers,
      topTags,
      recentImages,
      autoExifTagCount,
      autoAITagCount,
      customTagCount,
    ] = await Promise.all([
      prisma.image.count(),
      prisma.user.count(),
      prisma.tag.findMany({
        orderBy: { useCount: 'desc' },
        take: 8,
        select: { id: true, name: true, useCount: true, type: true }
      }),
      prisma.image.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          title: true,
          originalName: true,
          createdAt: true,
          width: true,
          height: true,
          fileSize: true
        }
      }),
      prisma.tag.count({ where: { type: 'AUTO_EXIF' } }),
      prisma.tag.count({ where: { type: 'AUTO_AI' } }),
      prisma.tag.count({ where: { type: 'CUSTOM' } }),
    ])

    return NextResponse.json({
      totalImages,
      totalUsers,
      topTags,
      recentImages,
      tagStats: {
        autoExif: autoExifTagCount,
        autoAI: autoAITagCount,
        custom: customTagCount,
        total: autoExifTagCount + autoAITagCount + customTagCount,
      },
    })
  } catch (error) {
    console.error('Public stats fetch error:', error)
    return NextResponse.json({ error: '获取站点统计失败' }, { status: 500 })
  }
}
