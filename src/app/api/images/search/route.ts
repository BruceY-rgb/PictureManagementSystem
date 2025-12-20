import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

    const searchParams = req.nextUrl.searchParams

    // 获取搜索参数
    const keyword = searchParams.get('keyword') || ''
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const minWidth = searchParams.get('minWidth')
    const maxWidth = searchParams.get('maxWidth')
    const minHeight = searchParams.get('minHeight')
    const maxHeight = searchParams.get('maxHeight')
    const cameraMake = searchParams.get('cameraMake')
    const cameraModel = searchParams.get('cameraModel')
    const minIso = searchParams.get('minIso')
    const maxIso = searchParams.get('maxIso')
    const minAperture = searchParams.get('minAperture')
    const maxAperture = searchParams.get('maxAperture')
    const hasLocation = searchParams.get('hasLocation')
    const latitude = searchParams.get('latitude')
    const longitude = searchParams.get('longitude')
    const radius = searchParams.get('radius') // 公里
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    // 构建查询条件
    const where: Prisma.ImageWhereInput = {
      userId: session.user.id,
    }

    // AI label filtering
    const aiScenes = searchParams.get('aiScenes')?.split(',').filter(Boolean) || []
    const aiObjects = searchParams.get('aiObjects')?.split(',').filter(Boolean) || []
    const aiEmotions = searchParams.get('aiEmotions')?.split(',').filter(Boolean) || []

    // 关键词搜索 - 搜索文件名、标题、描述、标签
    if (keyword) {
      where.OR = [
        { originalName: { contains: keyword } },
        { filename: { contains: keyword } },
        // 对于可能为null的字段，需要先检查非null
        {
          AND: [
            { title: { not: null } },
            { title: { contains: keyword } }
          ]
        },
        {
          AND: [
            { description: { not: null } },
            { description: { contains: keyword } }
          ]
        },
        // 搜索标签名称（模糊匹配）
        {
          tags: {
            some: {
              tag: {
                name: {
                  contains: keyword,
                },
              },
            },
          },
        },
      ]
    }

    // AI label search
    if (aiScenes.length > 0 || aiObjects.length > 0 || aiEmotions.length > 0) {
      const aiOrConditions: Prisma.ImageWhereInput[] = []

      for (const scene of aiScenes) {
        aiOrConditions.push({
          aiLabels: {
            path: ['scenes'],
            array_contains: scene,
          } as any,
        })
      }

      for (const object of aiObjects) {
        aiOrConditions.push({
          aiLabels: {
            path: ['objects'],
            array_contains: object,
          } as any,
        })
      }

      for (const emotion of aiEmotions) {
        aiOrConditions.push({
          aiLabels: {
            path: ['emotions'],
            array_contains: emotion,
          } as any,
        })
      }

      if (aiOrConditions.length > 0) {
        if (where.OR) {
          // Combine with existing OR conditions
          where.AND = [
            { OR: where.OR },
            { OR: aiOrConditions },
          ]
          delete where.OR
        } else {
          where.OR = aiOrConditions
        }
      }
    }

    // 标签搜索 - 支持模糊匹配
    if (tags.length > 0) {
      console.log('[Search] Tag keywords:', tags)

      // 构建条件：每个关键词都可以匹配标签名称的一部分
      const tagOrConditions = tags.map(tagKeyword => ({
        tags: {
          some: {
            tag: {
              name: {
                contains: tagKeyword,
              },
            },
          },
        },
      }))

      // 根据标签数量使用不同的查询策略
      if (tagOrConditions.length === 1) {
        // 单个标签：直接应用条件
        Object.assign(where, tagOrConditions[0])
      } else {
        // 多个标签：使用AND逻辑（图片必须匹配所有标签关键词）
        where.AND = tagOrConditions
      }

      console.log('[Search] Tag filter conditions created')
    }

    // 日期范围
    if (startDate || endDate) {
      where.takenAt = {}
      if (startDate) {
        where.takenAt.gte = new Date(startDate)
      }
      if (endDate) {
        // 设置为该天的最后一秒
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.takenAt.lte = end
      }
    }

    // 尺寸筛选
    if (minWidth) {
      where.width = { ...((where.width as object) || {}), gte: parseInt(minWidth) }
    }
    if (maxWidth) {
      where.width = { ...((where.width as object) || {}), lte: parseInt(maxWidth) }
    }
    if (minHeight) {
      where.height = { ...((where.height as object) || {}), gte: parseInt(minHeight) }
    }
    if (maxHeight) {
      where.height = { ...((where.height as object) || {}), lte: parseInt(maxHeight) }
    }

    // 相机信息筛选
    if (cameraMake) {
      where.cameraMake = { contains: cameraMake }
    }
    if (cameraModel) {
      where.cameraModel = { contains: cameraModel }
    }

    // ISO 范围
    if (minIso) {
      where.iso = { ...((where.iso as object) || {}), gte: parseInt(minIso) }
    }
    if (maxIso) {
      where.iso = { ...((where.iso as object) || {}), lte: parseInt(maxIso) }
    }

    // 光圈范围
    if (minAperture) {
      where.aperture = { ...((where.aperture as object) || {}), gte: parseFloat(minAperture) }
    }
    if (maxAperture) {
      where.aperture = { ...((where.aperture as object) || {}), lte: parseFloat(maxAperture) }
    }

    // 位置筛选
    if (hasLocation === 'true') {
      where.latitude = { not: null }
      where.longitude = { not: null }
    } else if (hasLocation === 'false') {
      where.OR = [
        { latitude: null },
        { longitude: null },
      ]
    }

    // GPS 范围搜索（简单的矩形范围，适合小范围搜索）
    if (latitude && longitude && radius) {
      const lat = parseFloat(latitude)
      const lon = parseFloat(longitude)
      const r = parseFloat(radius)

      // 简单计算：1度纬度约111公里，1度经度在赤道约111公里，随纬度变化
      const latDelta = r / 111
      const lonDelta = r / (111 * Math.cos(lat * Math.PI / 180))

      where.latitude = {
        gte: lat - latDelta,
        lte: lat + latDelta,
      }
      where.longitude = {
        gte: lon - lonDelta,
        lte: lon + lonDelta,
      }
    }

    // 查询图片
    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          width: true,
          height: true,
          title: true,
          description: true,
          takenAt: true,
          cameraMake: true,
          cameraModel: true,
          lensModel: true,
          focalLength: true,
          aperture: true,
          shutterSpeed: true,
          iso: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          updatedAt: true,
          viewCount: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.image.count({ where }),
    ])

    return NextResponse.json({
      images,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      searchParams: {
        keyword,
        tags,
        startDate,
        endDate,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        cameraMake,
        cameraModel,
        hasLocation,
      },
    })
  } catch (error) {
    console.error('Search images error:', error)
    return NextResponse.json(
      { error: '搜索图片失败' },
      { status: 500 }
    )
  }
}

// 获取可用的筛选选项（相机品牌、型号等）
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 获取用户图片中的所有唯一值
    const [cameraMakes, cameraModels, tags] = await Promise.all([
      prisma.image.findMany({
        where: {
          userId: session.user.id,
          cameraMake: { not: null },
        },
        select: { cameraMake: true },
        distinct: ['cameraMake'],
      }),
      prisma.image.findMany({
        where: {
          userId: session.user.id,
          cameraModel: { not: null },
        },
        select: { cameraModel: true },
        distinct: ['cameraModel'],
      }),
      prisma.tag.findMany({
        where: {
          images: {
            some: {
              image: {
                userId: session.user.id,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          color: true,
          useCount: true,
        },
        orderBy: {
          useCount: 'desc',
        },
      }),
    ])

    return NextResponse.json({
      cameraMakes: cameraMakes.map(c => c.cameraMake).filter(Boolean),
      cameraModels: cameraModels.map(c => c.cameraModel).filter(Boolean),
      tags,
    })
  } catch (error) {
    console.error('Get filter options error:', error)
    return NextResponse.json(
      { error: '获取筛选选项失败' },
      { status: 500 }
    )
  }
}
