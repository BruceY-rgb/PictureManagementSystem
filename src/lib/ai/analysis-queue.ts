/**
 * AI Analysis Queue - Database-backed persistent queue
 * Manages async processing of image AI analysis using database for persistence
 */

import { prisma } from '@/lib/prisma'
import { analyzeImage } from './doubao'
import { TagType, AITaskStatus, Prisma } from '@prisma/client'

// Configuration
const MAX_RETRIES = parseInt(process.env.AI_RETRY_ATTEMPTS || '3')

/**
 * Queue an image for AI analysis (database-backed)
 */
export async function queueImageAnalysis(imageId: string, userId: string): Promise<void> {
  try {
    // Check if task already exists for this image
    const existingTask = await prisma.aIAnalysisTask.findFirst({
      where: {
        imageId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    })

    if (existingTask) {
      console.log(`[AI Queue] Task already exists for image ${imageId}`)
      return
    }

    // Check if image already analyzed
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      select: { aiAnalyzed: true },
    })

    if (image?.aiAnalyzed) {
      console.log(`[AI Queue] Image ${imageId} already analyzed`)
      return
    }

    // Create new task in database
    await prisma.aIAnalysisTask.create({
      data: {
        imageId,
        userId,
        status: 'PENDING',
      },
    })

    console.log(`[AI Queue] Created task for image ${imageId}`)
  } catch (error) {
    console.error(`[AI Queue] Failed to create task for image ${imageId}:`, error)
    throw error
  }
}

/**
 * Process a single image immediately (synchronous processing)
 * Call this directly after creating a task for immediate processing
 */
export async function processImageAnalysis(imageId: string, userId: string): Promise<boolean> {
  console.log(`[AI Queue] Processing image ${imageId}`)

  try {
    // Fetch image data
    const image = await prisma.image.findUnique({
      where: {
        id: imageId,
        userId,
      },
      select: {
        id: true,
        originalImage: true,
        aiAnalyzed: true,
      },
    })

    if (!image) {
      console.warn(`[AI Queue] Image ${imageId} not found or access denied`)
      return false
    }

    if (image.aiAnalyzed) {
      console.log(`[AI Queue] Image ${imageId} already analyzed, skipping`)
      return true
    }

    if (!image.originalImage) {
      console.warn(`[AI Queue] Image ${imageId} has no image data`)
      await markTaskFailed(imageId, 'No image data')
      return false
    }

    // Analyze image
    const result = await analyzeImage(image.originalImage)

    if (result.confidence === 0) {
      throw new Error('AI analysis returned zero confidence')
    }

    // Store results
    await storeAnalysisResults(imageId, userId, result)

    // Mark task as completed
    await prisma.aIAnalysisTask.updateMany({
      where: { imageId, status: 'PROCESSING' },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    console.log(`[AI Queue] Successfully analyzed image ${imageId}`)
    return true
  } catch (error) {
    console.error(`[AI Queue] Failed to process image ${imageId}:`, error)
    await markTaskFailed(imageId, error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

/**
 * Process pending tasks from the database queue
 * This should be called periodically (e.g., via cron job or API route)
 */
export async function processPendingTasks(batchSize: number = 3): Promise<number> {
  console.log('[AI Queue] Processing pending tasks...')

  // Get pending tasks
  const tasks = await prisma.aIAnalysisTask.findMany({
    where: {
      status: 'PENDING',
      retries: { lt: MAX_RETRIES },
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  })

  if (tasks.length === 0) {
    console.log('[AI Queue] No pending tasks')
    return 0
  }

  console.log(`[AI Queue] Found ${tasks.length} pending tasks`)

  let processed = 0
  for (const task of tasks) {
    // Mark as processing
    await prisma.aIAnalysisTask.update({
      where: { id: task.id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
        retries: task.retries + 1,
      },
    })

    const success = await processImageAnalysis(task.imageId, task.userId)
    if (success) {
      processed++
    }
  }

  return processed
}

/**
 * Mark a task as failed
 */
async function markTaskFailed(imageId: string, error: string): Promise<void> {
  const task = await prisma.aIAnalysisTask.findFirst({
    where: { imageId, status: 'PROCESSING' },
  })

  if (!task) return

  if (task.retries >= MAX_RETRIES) {
    // Max retries reached, mark as failed
    await prisma.aIAnalysisTask.update({
      where: { id: task.id },
      data: {
        status: 'FAILED',
        error,
        completedAt: new Date(),
      },
    })

    // Mark image as analyzed but failed
    await prisma.image.update({
      where: { id: imageId },
      data: {
        aiAnalyzed: true,
        aiConfidence: 0,
      },
    })

    console.log(`[AI Queue] Task for image ${imageId} marked as failed after ${MAX_RETRIES} retries`)
  } else {
    // Reset to pending for retry
    await prisma.aIAnalysisTask.update({
      where: { id: task.id },
      data: {
        status: 'PENDING',
        error,
      },
    })

    console.log(`[AI Queue] Task for image ${imageId} reset to pending (retry ${task.retries}/${MAX_RETRIES})`)
  }
}

/**
 * Store AI analysis results in database
 */
async function storeAnalysisResults(
  imageId: string,
  userId: string,
  result: { scenes: string[]; objects: string[]; people: string[]; text: string[]; emotions: string[]; details: string[]; confidence: number }
): Promise<void> {
  // Prepare AI labels data
  const aiLabels = {
    scenes: result.scenes,
    objects: result.objects,
    people: result.people,
    text: result.text,
    emotions: result.emotions,
    details: result.details,
    analyzedAt: new Date().toISOString(),
    model: 'doubao-vision',
  }

  // Update image with AI results
  await prisma.image.update({
    where: { id: imageId },
    data: {
      aiAnalyzed: true,
      aiLabels: aiLabels as any,
      aiConfidence: result.confidence,
    },
  })

  // Create AUTO_AI tags
  await createAITags(imageId, userId, result)

  console.log(`[AI Queue] Stored analysis results for image ${imageId}`)
}

/**
 * Create AUTO_AI tags from analysis results
 */
async function createAITags(
  imageId: string,
  userId: string,
  result: { scenes: string[]; objects: string[]; people: string[]; text: string[]; emotions: string[]; details: string[] }
): Promise<void> {
  // Collect all tag names
  const tagNames = [
    ...result.scenes,
    ...result.objects,
    ...result.people,
    ...result.emotions,
    // Note: we don't add text and details as tags, they're often too specific
  ].filter(Boolean)

  if (tagNames.length === 0) {
    return
  }

  // Remove duplicates and limit to 15 tags
  const uniqueTagNames = Array.from(new Set(tagNames)).slice(0, 15)

  // Create or get existing tags
  const tags = []
  for (const name of uniqueTagNames) {
    try {
      // Find existing tag
      let dbTag = await prisma.tag.findUnique({
        where: { name },
      })

      if (!dbTag) {
        // Create new tag
        dbTag = await prisma.tag.create({
          data: {
            name,
            type: TagType.AUTO_AI,
            useCount: 0,
          },
        })
      }

      tags.push(dbTag)

      // Associate tag with image (if not already associated)
      await prisma.imageTag.upsert({
        where: {
          imageId_tagId: {
            imageId,
            tagId: dbTag.id,
          },
        },
        create: {
          imageId,
          tagId: dbTag.id,
        },
        update: {},
      })

      // Increment use count
      await prisma.tag.update({
        where: { id: dbTag.id },
        data: { useCount: { increment: 1 } },
      })
    } catch (error) {
      console.error(`[AI Queue] Failed to create tag "${name}":`, error)
    }
  }

  console.log(`[AI Queue] Created/linked ${tags.length} AUTO_AI tags for image ${imageId}`)
}

/**
 * Get task status for an image
 */
export async function getTaskStatus(imageId: string): Promise<{
  status: AITaskStatus | 'NOT_FOUND'
  retries: number
  error: string | null
}> {
  const task = await prisma.aIAnalysisTask.findFirst({
    where: { imageId },
    orderBy: { createdAt: 'desc' },
  })

  if (!task) {
    return { status: 'NOT_FOUND', retries: 0, error: null }
  }

  return {
    status: task.status,
    retries: task.retries,
    error: task.error,
  }
}

/**
 * Retry a failed task
 */
export async function retryFailedTask(imageId: string, userId: string): Promise<boolean> {
  // Find failed task
  const task = await prisma.aIAnalysisTask.findFirst({
    where: { imageId, status: 'FAILED' },
  })

  if (task) {
    // Reset task
    await prisma.aIAnalysisTask.update({
      where: { id: task.id },
      data: {
        status: 'PENDING',
        retries: 0,
        error: null,
        startedAt: null,
        completedAt: null,
      },
    })
  } else {
    // Create new task
    await queueImageAnalysis(imageId, userId)
  }

  // Reset image AI status
  await prisma.image.update({
    where: { id: imageId },
    data: {
      aiAnalyzed: false,
      aiLabels: Prisma.DbNull,
      aiConfidence: null,
    },
  })

  return true
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number
  processing: number
  completed: number
  failed: number
}> {
  const [pending, processing, completed, failed] = await Promise.all([
    prisma.aIAnalysisTask.count({ where: { status: 'PENDING' } }),
    prisma.aIAnalysisTask.count({ where: { status: 'PROCESSING' } }),
    prisma.aIAnalysisTask.count({ where: { status: 'COMPLETED' } }),
    prisma.aIAnalysisTask.count({ where: { status: 'FAILED' } }),
  ])

  return { pending, processing, completed, failed }
}
