import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processImage, parseExifData } from '@/lib/image-utils'
import { generateAutoTags, saveAutoTags } from '@/lib/auto-tag'
import { queueImageAnalysis, processImageAnalysis } from '@/lib/ai/analysis-queue'

export async function POST(req: NextRequest) {
  try {
    // 验证用户登录
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 获取表单数据
    const formData = await req.formData()
    const files = formData.getAll('images') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '请选择要上传的图片' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type))

    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: '只支持 JPEG, PNG, GIF 和 WebP 格式的图片' },
        { status: 400 }
      )
    }

    // 验证文件大小 (最大 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize)

    if (oversizedFiles.length > 0) {
      return NextResponse.json(
        { error: '图片大小不能超过 10MB' },
        { status: 400 }
      )
    }

    // 处理并保存图片
    const uploadResults = []

    for (const file of files) {
      try {
        // 读取文件为 Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 处理图片
        const processed = await processImage(buffer)

        // 解析 EXIF 数据
        const exifData = parseExifData(processed.exifData)

        // 生成文件名
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const filename = `${timestamp}_${randomStr}_${file.name}`

        // 保存到数据库（显式字段，确保数据有效性）
        const image = await prisma.image.create({
          data: {
            userId: session.user.id,
            filename,
            originalName: file.name,
            mimeType: processed.metadata.mimeType,
            fileSize: processed.metadata.fileSize,
            width: processed.metadata.width,
            height: processed.metadata.height,
            aspectRatio: processed.metadata.aspectRatio,
            originalImage: processed.originalImage,
            thumbnailSmall: processed.thumbnailSmall,
            thumbnailMedium: processed.thumbnailMedium,
            thumbnailLarge: processed.thumbnailLarge,
            // EXIF数据（已验证和清理）
            takenAt: exifData.takenAt,
            cameraModel: exifData.cameraModel,
            cameraMake: exifData.cameraMake,
            lensModel: exifData.lensModel,
            focalLength: exifData.focalLength,
            aperture: exifData.aperture,
            shutterSpeed: exifData.shutterSpeed,
            iso: exifData.iso,
            latitude: exifData.latitude,
            longitude: exifData.longitude,
            altitude: exifData.altitude,
            gpsTimestamp: exifData.gpsTimestamp,
            software: exifData.software,
            orientation: exifData.orientation,
          },
          select: {
            id: true,
            filename: true,
            originalName: true,
            width: true,
            height: true,
            fileSize: true,
            createdAt: true,
          },
        })

        // 生成并保存自动标签
        try {
          const autoTags = await generateAutoTags({
            exifData: processed.exifData,
            metadata: processed.metadata,
            imageId: image.id,
          })

          await saveAutoTags(image.id, autoTags)

          console.log(`Generated ${autoTags.length} auto tags for image ${image.id}`)
        } catch (tagError) {
          console.error('Error generating auto tags:', tagError)
          // 标签生成失败不影响图片上传
        }

        // Queue and process AI analysis
        try {
          await queueImageAnalysis(image.id, session.user.id)
          // Process immediately in background (non-blocking for the response)
          processImageAnalysis(image.id, session.user.id)
            .catch(err => console.error('Failed to process AI analysis:', err))
        } catch (error) {
          console.error('Error queueing AI analysis:', error)
          // AI分析队列失败不影响图片上传
        }

        uploadResults.push({
          success: true,
          image,
        })
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error)
        uploadResults.push({
          success: false,
          filename: file.name,
          error: '处理失败',
        })
      }
    }

    const successCount = uploadResults.filter(r => r.success).length
    const failCount = uploadResults.filter(r => !r.success).length

    return NextResponse.json({
      message: `成功上传 ${successCount} 张图片${failCount > 0 ? `, ${failCount} 张失败` : ''}`,
      results: uploadResults,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: '上传失败,请稍后重试' },
      { status: 500 }
    )
  }
}
