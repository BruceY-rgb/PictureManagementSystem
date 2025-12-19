import { prisma } from '@/lib/prisma'

export interface AutoTagOptions {
  exifData: any
  metadata: {
    width: number
    height: number
    aspectRatio: number
  }
  imageId: string
}

export interface GeneratedTag {
  name: string
  type: 'AUTO_EXIF' | 'AUTO_AI' | 'CUSTOM'
}

/**
 * 根据EXIF信息自动生成标签
 */
export async function generateAutoTags(options: AutoTagOptions): Promise<GeneratedTag[]> {
  const { exifData, metadata } = options
  const tags: GeneratedTag[] = []

  // 1. 相机品牌标签
  if (exifData.Make) {
    const brand = exifData.Make.trim()
    tags.push({
      name: brand,
      type: 'AUTO_EXIF',
    })
  }

  // 2. 相机型号标签
  if (exifData.Model) {
    const model = exifData.Model.trim()
    tags.push({
      name: model,
      type: 'AUTO_EXIF',
    })
  }

  // 3. 镜头标签
  if (exifData.LensModel) {
    const lens = exifData.LensModel.trim()
    tags.push({
      name: `镜头:${lens}`,
      type: 'AUTO_EXIF',
    })
  }

  // 4. 拍摄时间标签
  if (exifData.DateTimeOriginal) {
    const date = new Date(exifData.DateTimeOriginal)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const dayOfWeek = date.getDay()
    const season = getSeasonFromMonth(month)
    const timeOfDay = getTimeOfDay(hour)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    tags.push(
      { name: `${year}年`, type: 'AUTO_EXIF' },
      { name: `${year}年${month}月`, type: 'AUTO_EXIF' },
      { name: `${month}月${day}日`, type: 'AUTO_EXIF' },
      { name: season, type: 'AUTO_EXIF' },
      { name: timeOfDay, type: 'AUTO_EXIF' },
      { name: isWeekend ? '周末' : '工作日', type: 'AUTO_EXIF' }
    )
  }

  // 5. 焦距分类标签
  if (exifData.FocalLength) {
    const focalLength = exifData.FocalLength
    const category = categorizeFocalLength(focalLength)
    if (category) {
      tags.push({
        name: category,
        type: 'AUTO_EXIF',
      })
    }
  }

  // 6. 光圈分类标签
  if (exifData.FNumber) {
    const aperture = exifData.FNumber
    const category = categorizeAperture(aperture)
    if (category) {
      tags.push({
        name: category,
        type: 'AUTO_EXIF',
      })
    }
  }

  // 7. ISO分类标签
  if (exifData.ISO) {
    const iso = exifData.ISO
    const category = categorizeISO(iso)
    if (category) {
      tags.push({
        name: category,
        type: 'AUTO_EXIF',
      })
    }
  }

  // 8. GPS位置标签（如果有经纬度信息）
  if (exifData.latitude && exifData.longitude) {
    tags.push({
      name: '已定位',
      type: 'AUTO_EXIF',
    })

    // 通过反向地理编码获取地点信息
    const locationTags = await getLocationTags(exifData.latitude, exifData.longitude)
    tags.push(...locationTags)
  }

  // 9. 图片方向标签
  const orientation = categorizeOrientation(metadata.aspectRatio)
  if (orientation) {
    tags.push({
      name: orientation,
      type: 'AUTO_EXIF',
    })
  }

  // 10. 分辨率分类标签
  const resolution = categorizeResolution(metadata.width, metadata.height)
  if (resolution) {
    tags.push({
      name: resolution,
      type: 'AUTO_EXIF',
    })
  }

  // 11. 软件标签
  if (exifData.Software) {
    const software = exifData.Software.trim()
    tags.push({
      name: `编辑:${software}`,
      type: 'AUTO_EXIF',
    })
  }

  return tags
}

/**
 * 保存自动标签到数据库并关联到图片
 */
export async function saveAutoTags(imageId: string, tags: GeneratedTag[]): Promise<void> {
  // 去重
  const uniqueTags = Array.from(
    new Map(tags.map(tag => [tag.name, tag])).values()
  )

  for (const tag of uniqueTags) {
    try {
      // 查找或创建标签
      let dbTag = await prisma.tag.findUnique({
        where: { name: tag.name },
      })

      if (!dbTag) {
        // 创建新标签
        dbTag = await prisma.tag.create({
          data: {
            name: tag.name,
            type: tag.type,
            useCount: 0,
          },
        })
      }

      // 关联标签到图片（如果还没有关联）
      const existingRelation = await prisma.imageTag.findUnique({
        where: {
          imageId_tagId: {
            imageId,
            tagId: dbTag.id,
          },
        },
      })

      if (!existingRelation) {
        await prisma.imageTag.create({
          data: {
            imageId,
            tagId: dbTag.id,
          },
        })

        // 更新标签使用次数
        await prisma.tag.update({
          where: { id: dbTag.id },
          data: { useCount: { increment: 1 } },
        })
      }
    } catch (error) {
      console.error(`Error saving tag "${tag.name}":`, error)
      // 继续处理其他标签
    }
  }
}

// ==================== 辅助函数 ====================

/**
 * 根据月份获取季节
 */
function getSeasonFromMonth(month: number): string {
  if (month >= 3 && month <= 5) return '春季'
  if (month >= 6 && month <= 8) return '夏季'
  if (month >= 9 && month <= 11) return '秋季'
  return '冬季'
}

/**
 * 根据小时获取时间段
 */
function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 8) return '清晨'
  if (hour >= 8 && hour < 11) return '上午'
  if (hour >= 11 && hour < 13) return '中午'
  if (hour >= 13 && hour < 17) return '下午'
  if (hour >= 17 && hour < 19) return '傍晚'
  if (hour >= 19 && hour < 22) return '夜晚'
  return '深夜'
}

/**
 * 通过反向地理编码获取地点标签
 * 使用 Nominatim (OpenStreetMap) 免费 API
 */
async function getLocationTags(latitude: number, longitude: number): Promise<GeneratedTag[]> {
  const tags: GeneratedTag[] = []

  try {
    // 使用 Nominatim 反向地理编码 API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=zh-CN`,
      {
        headers: {
          'User-Agent': 'PictureManagementSystem/1.0',
        },
      }
    )

    if (!response.ok) {
      console.warn('反向地理编码请求失败:', response.status)
      return tags
    }

    const data = await response.json()
    const address = data.address

    if (address) {
      // 国家
      if (address.country) {
        tags.push({ name: address.country, type: 'AUTO_EXIF' })
      }

      // 省/州
      if (address.state || address.province) {
        tags.push({ name: address.state || address.province, type: 'AUTO_EXIF' })
      }

      // 城市
      if (address.city || address.town || address.municipality) {
        const city = address.city || address.town || address.municipality
        tags.push({ name: city, type: 'AUTO_EXIF' })
      }

      // 区/县
      if (address.district || address.county) {
        tags.push({ name: address.district || address.county, type: 'AUTO_EXIF' })
      }

      // 街道/社区
      if (address.suburb || address.neighbourhood) {
        tags.push({ name: address.suburb || address.neighbourhood, type: 'AUTO_EXIF' })
      }

      // 具体地点名称（如景点、公园等）
      if (address.tourism || address.amenity || address.leisure) {
        const placeName = address.tourism || address.amenity || address.leisure
        tags.push({ name: placeName, type: 'AUTO_EXIF' })
      }
    }
  } catch (error) {
    console.error('获取地点信息失败:', error)
  }

  return tags
}

/**
 * 根据焦距分类镜头类型
 */
function categorizeFocalLength(focalLength: number): string | null {
  if (focalLength < 24) return '超广角'
  if (focalLength >= 24 && focalLength < 35) return '广角'
  if (focalLength >= 35 && focalLength < 70) return '标准镜头'
  if (focalLength >= 70 && focalLength < 135) return '中焦'
  if (focalLength >= 135 && focalLength < 300) return '长焦'
  if (focalLength >= 300) return '超长焦'
  return null
}

/**
 * 根据光圈分类
 */
function categorizeAperture(aperture: number): string | null {
  if (aperture <= 1.4) return '大光圈'
  if (aperture > 1.4 && aperture <= 2.8) return '中大光圈'
  if (aperture > 2.8 && aperture <= 5.6) return '中等光圈'
  if (aperture > 5.6) return '小光圈'
  return null
}

/**
 * 根据ISO分类
 */
function categorizeISO(iso: number): string | null {
  if (iso <= 200) return '低ISO'
  if (iso > 200 && iso <= 800) return '中等ISO'
  if (iso > 800 && iso <= 3200) return '高ISO'
  if (iso > 3200) return '超高ISO'
  return null
}

/**
 * 根据宽高比判断图片方向
 */
function categorizeOrientation(aspectRatio: number): string | null {
  if (aspectRatio > 1.2) return '横向照片'
  if (aspectRatio < 0.8) return '纵向照片'
  if (aspectRatio >= 0.8 && aspectRatio <= 1.2) return '方形照片'
  return null
}

/**
 * 根据分辨率分类
 */
function categorizeResolution(width: number, height: number): string | null {
  const totalPixels = width * height
  const megaPixels = totalPixels / 1000000

  if (megaPixels < 1) return '低分辨率'
  if (megaPixels >= 1 && megaPixels < 5) return '标准分辨率'
  if (megaPixels >= 5 && megaPixels < 12) return '高分辨率'
  if (megaPixels >= 12 && megaPixels < 24) return '超高分辨率'
  if (megaPixels >= 24) return '专业分辨率'
  return null
}
