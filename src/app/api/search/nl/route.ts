/**
 * Natural Language Search API
 * Converts natural language queries into structured database searches
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseNaturalLanguage } from '@/lib/mcp/parser'
import { Prisma } from '@prisma/client'

interface ImageWithRelevance {
  id: string
  filename: string
  originalName: string
  title: string | null
  description: string | null
  width: number
  height: number
  fileSize: number
  mimeType: string
  isFavorite: boolean
  aiAnalyzed: boolean
  aiLabels: any
  aiConfidence: number | null
  createdAt: Date
  takenAt: Date | null
  tags: Array<{ tag: { id: string; name: string; type: string } }>
  relevanceScore?: number
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    if (!query.trim()) {
      return NextResponse.json(
        { error: '请输入搜索关键词' },
        { status: 400 }
      )
    }

    console.log('[NL Search] Query:', query)

    // Parse natural language query
    const parsed = parseNaturalLanguage(query)
    console.log('[NL Search] Parsed:', {
      scenes: parsed.scenes,
      objects: parsed.objects,
      emotions: parsed.emotions,
      dates: parsed.dates,
      keywords: parsed.keywords,
      confidence: parsed.confidence,
    })

    // Build where clause
    const where = buildWhereClause(parsed, session.user.id)

    // Execute search
    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.image.count({ where }),
    ])

    // Rank results by relevance
    const rankedImages = rankByRelevance(images, parsed)

    console.log(`[NL Search] Found ${total} images, returning top ${rankedImages.length}`)

    return NextResponse.json({
      images: rankedImages.map(img => ({
        ...img,
        tags: img.tags.map(t => t.tag),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      query: {
        original: query,
        parsed,
      },
    })
  } catch (error) {
    console.error('[NL Search] Error:', error)
    return NextResponse.json(
      { error: '搜索失败,请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * Build Prisma where clause from parsed query
 */
function buildWhereClause(
  parsed: ReturnType<typeof parseNaturalLanguage>,
  userId: string
): Prisma.ImageWhereInput {
  const where: Prisma.ImageWhereInput = {
    userId,
    deletedAt: null,
  }

  const orConditions: Prisma.ImageWhereInput[] = []

  // AI label search (scenes, objects, emotions)
  const aiLabels = [
    ...(parsed.scenes || []),
    ...(parsed.objects || []),
    ...(parsed.emotions || []),
  ]

  if (aiLabels.length > 0) {
    // Search in aiLabels JSON field
    for (const label of aiLabels) {
      // Search in scenes
      orConditions.push({
        aiLabels: {
          path: ['scenes'],
          array_contains: label,
        } as any,
      })
      // Search in objects
      orConditions.push({
        aiLabels: {
          path: ['objects'],
          array_contains: label,
        } as any,
      })
      // Search in emotions
      orConditions.push({
        aiLabels: {
          path: ['emotions'],
          array_contains: label,
        } as any,
      })
    }

    // Also search in AUTO_AI tags
    orConditions.push({
      tags: {
        some: {
          tag: {
            type: 'AUTO_AI',
            name: { in: aiLabels },
          },
        },
      },
    })
  }

  // Keyword search (text fields)
  if (parsed.keywords.length > 0) {
    for (const keyword of parsed.keywords) {
      orConditions.push(
        { originalName: { contains: keyword, mode: 'insensitive' } },
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } }
      )

      // Also search in tags
      orConditions.push({
        tags: {
          some: {
            tag: {
              name: { contains: keyword, mode: 'insensitive' },
            },
          },
        },
      })
    }
  }

  // Location search (EXIF tags)
  if (parsed.locations && parsed.locations.length > 0) {
    orConditions.push({
      tags: {
        some: {
          tag: {
            type: 'AUTO_EXIF',
            name: { in: parsed.locations },
          },
        },
      },
    })

    // Also search in location-related EXIF fields
    for (const location of parsed.locations) {
      orConditions.push(
        { city: { contains: location, mode: 'insensitive' } },
        { country: { contains: location, mode: 'insensitive' } },
        { state: { contains: location, mode: 'insensitive' } }
      )
    }
  }

  // Add OR conditions if any
  if (orConditions.length > 0) {
    where.OR = orConditions
  }

  // Date filters
  if (parsed.dates) {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (parsed.dates.start) {
      dateFilter.gte = parsed.dates.start
    }
    if (parsed.dates.end) {
      dateFilter.lte = parsed.dates.end
    }
    where.takenAt = dateFilter
  }

  return where
}

/**
 * Rank images by relevance to parsed query
 */
function rankByRelevance(
  images: any[],
  parsed: ReturnType<typeof parseNaturalLanguage>
): ImageWithRelevance[] {
  return images
    .map(img => {
      let score = 0

      // AI label matches (highest weight)
      if (img.aiLabels && typeof img.aiLabels === 'object') {
        const aiLabels = img.aiLabels as {
          scenes?: string[]
          objects?: string[]
          emotions?: string[]
        }

        // Scene matches
        if (parsed.scenes) {
          score += countMatches(aiLabels.scenes || [], parsed.scenes) * 5
        }

        // Object matches
        if (parsed.objects) {
          score += countMatches(aiLabels.objects || [], parsed.objects) * 5
        }

        // Emotion matches
        if (parsed.emotions) {
          score += countMatches(aiLabels.emotions || [], parsed.emotions) * 3
        }

        // AI confidence bonus
        if (img.aiConfidence) {
          score *= img.aiConfidence
        }
      }

      // Tag matches
      const tagNames = img.tags.map((t: any) => t.tag.name.toLowerCase())
      const allSearchTerms = [
        ...(parsed.scenes || []),
        ...(parsed.objects || []),
        ...(parsed.emotions || []),
        ...parsed.keywords,
      ]
      score += countMatches(tagNames, allSearchTerms) * 3

      // Text field matches
      const textFields = [
        img.originalName?.toLowerCase() || '',
        img.title?.toLowerCase() || '',
        img.description?.toLowerCase() || '',
      ]

      for (const keyword of parsed.keywords) {
        for (const field of textFields) {
          if (field.includes(keyword.toLowerCase())) {
            score += 2
          }
        }
      }

      // Date match bonus
      if (parsed.dates && img.takenAt) {
        const takenAt = new Date(img.takenAt)
        if (
          (!parsed.dates.start || takenAt >= parsed.dates.start) &&
          (!parsed.dates.end || takenAt <= parsed.dates.end)
        ) {
          score += 1
        }
      }

      return {
        ...img,
        relevanceScore: score,
      }
    })
    .filter(img => img.relevanceScore > 0) // Only return relevant results
    .sort((a, b) => b.relevanceScore! - a.relevanceScore!)
}

/**
 * Count matching items between two arrays
 */
function countMatches(arr1: string[], arr2: string[]): number {
  const set1 = new Set(arr1.map(s => s.toLowerCase()))
  const set2 = new Set(arr2.map(s => s.toLowerCase()))
  let count = 0
  for (const item of set2) {
    if (set1.has(item)) {
      count++
    }
  }
  return count
}
