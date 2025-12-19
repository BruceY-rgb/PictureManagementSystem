import sharp from 'sharp'
import exifr from 'exifr'

export interface ProcessedImage {
  originalImage: Buffer
  thumbnailSmall: Buffer
  thumbnailMedium: Buffer
  thumbnailLarge: Buffer
  metadata: {
    width: number
    height: number
    mimeType: string
    fileSize: number
    aspectRatio: number
  }
  exifData: any
}

export async function processImage(
  imageBuffer: Buffer
): Promise<ProcessedImage> {
  try {
    // 获取图片元数据（应用旋转后的）
    const metadata = await sharp(imageBuffer).rotate().metadata()

    // 解析 EXIF 数据（增强版：双重解析策略）
    let exifData: any = {}
    try {
      // 优先尝试完整EXIF解析
      exifData = await exifr.parse(imageBuffer, {
        pick: [
          'DateTimeOriginal',
          'Make',
          'Model',
          'LensModel',
          'FocalLength',
          'FNumber',
          'ExposureTime',
          'ISO',
          'latitude',
          'longitude',
          'GPSAltitude',
          'GPSDateStamp',
          'GPSTimeStamp',
          'Software',
          'Orientation',
        ],
      }) || {}
    } catch (fullExifError) {
      console.warn('Full EXIF parsing failed, trying GPS only:', fullExifError)
      try {
        // 备用：只解析GPS数据
        const gpsData = await exifr.gps(imageBuffer)
        exifData = gpsData ? { ...gpsData } : {}
        console.log('[EXIF] Successfully parsed GPS data only')
      } catch (gpsError) {
        console.warn('GPS parsing also failed:', gpsError)
        exifData = {}
      }
    }

    // 生成缩略图（添加 .rotate() 自动根据 EXIF Orientation 旋转）
    const thumbnailSmall = await sharp(imageBuffer)
      .rotate() // 自动修正方向
      .resize(150, 150, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer()

    const thumbnailMedium = await sharp(imageBuffer)
      .rotate() // 自动修正方向
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()

    const thumbnailLarge = await sharp(imageBuffer)
      .rotate() // 自动修正方向
      .resize(800, 800, {
        fit: 'inside',
      })
      .jpeg({ quality: 90, progressive: true })
      .toBuffer()

    return {
      originalImage: imageBuffer,
      thumbnailSmall,
      thumbnailMedium,
      thumbnailLarge,
      metadata: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        mimeType: `image/${metadata.format || 'jpeg'}`,
        fileSize: imageBuffer.length,
        aspectRatio: metadata.width && metadata.height
          ? metadata.width / metadata.height
          : 0,
      },
      exifData,
    }
  } catch (error) {
    console.error('Error processing image:', error)
    throw new Error('图片处理失败')
  }
}

/**
 * 验证GPS坐标有效性
 */
function validateGPSCoordinates(lat: any, lon: any): { lat: number | null, lon: number | null } {
  // 检查是否为有效数字
  if (typeof lat !== 'number' || typeof lon !== 'number' ||
      isNaN(lat) || isNaN(lon) ||
      !isFinite(lat) || !isFinite(lon)) {
    return { lat: null, lon: null }
  }

  // 检查经纬度范围
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    console.warn('GPS coordinates out of range:', { lat, lon })
    return { lat: null, lon: null }
  }

  // 排除(0,0)无效坐标（通常表示GPS未锁定）
  if (lat === 0 && lon === 0) {
    console.warn('GPS coordinates are (0,0), treating as invalid')
    return { lat: null, lon: null }
  }

  return { lat, lon }
}

/**
 * 解析 EXIF 日期格式
 * EXIF 日期通常是 "2024:01:15 14:30:45" 格式
 */
function parseExifDate(dateValue: any): Date | null {
  if (!dateValue) return null

  // 如果已经是 Date 对象
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue
  }

  // 如果是字符串，尝试解析
  if (typeof dateValue === 'string') {
    // 将 "2024:01:15 14:30:45" 转换为 "2024-01-15T14:30:45"
    const normalized = dateValue.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
    const date = new Date(normalized)
    return isNaN(date.getTime()) ? null : date
  }

  return null
}

/**
 * 解析GPS时间戳（组合日期和时间）
 */
function parseGPSTimestamp(dateStamp: any, timeStamp: any): Date | null {
  if (!dateStamp) return null

  try {
    // 标准化日期格式 "2024:01:15" -> "2024-01-15"
    const normalizedDate = dateStamp.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')

    if (Array.isArray(timeStamp)) {
      // GPSTimeStamp 是数组格式 [hours, minutes, seconds]
      const [hours, minutes, seconds] = timeStamp
      if (typeof hours === 'number' && typeof minutes === 'number' && typeof seconds === 'number') {
        return new Date(`${normalizedDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
      }
    } else if (typeof timeStamp === 'string') {
      // GPSTimeStamp 是字符串格式 "10:30:45"
      return new Date(`${normalizedDate}T${timeStamp}`)
    }

    // 如果只有日期，没有时间
    return new Date(normalizedDate)
  } catch (error) {
    console.warn('Failed to parse GPS timestamp:', { dateStamp, timeStamp, error })
    return null
  }
}

/**
 * 安全计算快门速度字符串
 */
function formatShutterSpeed(exposureTime: number | undefined | null): string | null {
  if (!exposureTime || exposureTime <= 0) return null

  // 如果快门时间 >= 1秒，直接显示秒数
  if (exposureTime >= 1) {
    return `${exposureTime}s`
  }

  // 否则显示为分数形式 1/xxx
  const denominator = Math.round(1 / exposureTime)
  return `1/${denominator}`
}

export function parseExifData(exifData: any) {
  if (!exifData) {
    return {
      takenAt: null,
      cameraModel: null,
      cameraMake: null,
      lensModel: null,
      focalLength: null,
      aperture: null,
      shutterSpeed: null,
      iso: null,
      latitude: null,
      longitude: null,
      altitude: null,
      gpsTimestamp: null,
      software: null,
      orientation: null,
    }
  }

  // 验证GPS坐标
  const { lat: validatedLat, lon: validatedLon } = validateGPSCoordinates(
    exifData.latitude,
    exifData.longitude
  )

  // 验证海拔高度
  const validatedAltitude = exifData.GPSAltitude && isFinite(exifData.GPSAltitude)
    ? exifData.GPSAltitude
    : null

  return {
    takenAt: parseExifDate(exifData.DateTimeOriginal),
    cameraModel: exifData.Model || null,
    cameraMake: exifData.Make || null,
    lensModel: exifData.LensModel || null,
    focalLength: exifData.FocalLength || null,
    aperture: exifData.FNumber || null,
    shutterSpeed: formatShutterSpeed(exifData.ExposureTime),
    iso: exifData.ISO || null,
    latitude: validatedLat,
    longitude: validatedLon,
    altitude: validatedAltitude,
    gpsTimestamp: parseGPSTimestamp(exifData.GPSDateStamp, exifData.GPSTimeStamp),
    software: exifData.Software || null,
    orientation: exifData.Orientation || null,
  }
}
