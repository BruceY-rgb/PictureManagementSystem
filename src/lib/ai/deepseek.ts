/**
 * DeepSeek AI Service
 * Provides image analysis functionality using DeepSeek Vision API
 */

export interface AIAnalysisResult {
  scenes: string[]
  objects: string[]
  emotions: string[]
  confidence: number
  rawResponse?: any
}

interface DeepSeekResponse {
  choices?: Array<{
    message: {
      content: string
    }
  }>
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const API_TIMEOUT = parseInt(process.env.AI_ANALYSIS_TIMEOUT || '30000')

const ANALYSIS_PROMPT = `Analyze this image and provide detailed information in the following categories:

1. SCENES: What type of scene is this? (e.g., beach, city, mountains, indoor, outdoor, park, forest, ocean, sunset, sunrise, night, etc.)
2. OBJECTS: What objects or subjects are visible? (e.g., people, person, animal, dog, cat, building, car, tree, food, flower, etc.)
3. EMOTIONS: What emotion or atmosphere does this image convey? (e.g., happy, peaceful, sad, tense, energetic, calm, joyful, romantic, mysterious, etc.)

Provide your analysis in the following JSON format only, without any additional text:
{
  "scenes": ["scene1", "scene2"],
  "objects": ["object1", "object2"],
  "emotions": ["emotion1", "emotion2"]
}

Be specific and list multiple values for each category if applicable. Use lowercase for all values.`

/**
 * Analyzes an image using DeepSeek Vision API
 * @param imageBuffer The image buffer to analyze
 * @returns Analysis result with scenes, objects, emotions, and confidence
 */
export async function analyzeImage(imageBuffer: Buffer): Promise<AIAnalysisResult> {
  try {
    // Validate API key
    if (!DEEPSEEK_API_KEY) {
      console.error('[DeepSeek] API key not configured')
      return {
        scenes: [],
        objects: [],
        emotions: [],
        confidence: 0,
      }
    }

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64')
    const mimeType = detectMimeType(imageBuffer)

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    console.log('[DeepSeek] Starting image analysis...')

    // Call DeepSeek API
    const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
              {
                type: 'text',
                text: ANALYSIS_PROMPT,
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[DeepSeek] API error: ${response.status}`, errorText)
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const data: DeepSeekResponse = await response.json()
    console.log('[DeepSeek] API response received')

    // Parse response
    const result = parseDeepSeekResponse(data)
    console.log('[DeepSeek] Analysis completed:', {
      scenes: result.scenes.length,
      objects: result.objects.length,
      emotions: result.emotions.length,
      confidence: result.confidence.toFixed(2),
    })

    return result
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[DeepSeek] Analysis timeout after', API_TIMEOUT, 'ms')
      } else {
        console.error('[DeepSeek] Analysis failed:', error.message)
      }
    } else {
      console.error('[DeepSeek] Unknown error:', error)
    }

    return {
      scenes: [],
      objects: [],
      emotions: [],
      confidence: 0,
    }
  }
}

/**
 * Parse DeepSeek API response and extract structured data
 */
function parseDeepSeekResponse(data: DeepSeekResponse): AIAnalysisResult {
  try {
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.warn('[DeepSeek] No content in response')
      return {
        scenes: [],
        objects: [],
        emotions: [],
        confidence: 0,
        rawResponse: data,
      }
    }

    // Try to extract JSON from response
    // DeepSeek might wrap JSON in markdown code blocks
    let jsonContent = content.trim()

    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    // Parse JSON
    const parsed = JSON.parse(jsonContent)

    // Normalize data
    const scenes = Array.isArray(parsed.scenes)
      ? parsed.scenes.map((s: string) => s.toLowerCase().trim()).filter(Boolean)
      : []
    const objects = Array.isArray(parsed.objects)
      ? parsed.objects.map((o: string) => o.toLowerCase().trim()).filter(Boolean)
      : []
    const emotions = Array.isArray(parsed.emotions)
      ? parsed.emotions.map((e: string) => e.toLowerCase().trim()).filter(Boolean)
      : []

    // Calculate confidence based on number of detected items
    const totalItems = scenes.length + objects.length + emotions.length
    const confidence = totalItems > 0
      ? Math.min(0.95, 0.5 + (totalItems * 0.05)) // 0.5 base + 0.05 per item, max 0.95
      : 0

    return {
      scenes: scenes.slice(0, 10), // Limit to 10 items per category
      objects: objects.slice(0, 10),
      emotions: emotions.slice(0, 5), // Fewer emotions
      confidence,
      rawResponse: data,
    }
  } catch (error) {
    console.error('[DeepSeek] Failed to parse response:', error)
    console.error('[DeepSeek] Raw content:', data.choices?.[0]?.message?.content)

    return {
      scenes: [],
      objects: [],
      emotions: [],
      confidence: 0,
      rawResponse: data,
    }
  }
}

/**
 * Detect MIME type from buffer
 */
function detectMimeType(buffer: Buffer): string {
  // Check magic numbers
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg'
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png'
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif'
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp'
  }

  // Default to JPEG
  return 'image/jpeg'
}

// ==================== Chat Completion API ====================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

const CHAT_TIMEOUT = 60000 // 60 seconds for chat

/**
 * Send a chat completion request to DeepSeek API
 * @param messages Array of chat messages
 * @param options Optional configuration
 * @returns The assistant's reply
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key not configured')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT)

  try {
    console.log('[DeepSeek Chat] Sending chat completion request...')

    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: options?.model || 'deepseek-chat',
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[DeepSeek Chat] API error:', response.status, errorText)
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`)
    }

    const data: ChatCompletionResponse = await response.json()
    console.log('[DeepSeek Chat] Response received, tokens used:', data.usage?.total_tokens)

    const reply = data.choices?.[0]?.message?.content
    if (!reply) {
      throw new Error('No reply content in response')
    }

    return reply
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[DeepSeek Chat] Request timeout after', CHAT_TIMEOUT, 'ms')
        throw new Error('请求超时，请稍后重试')
      }
      console.error('[DeepSeek Chat] Chat completion failed:', error.message)
      throw error
    }

    console.error('[DeepSeek Chat] Unknown error:', error)
    throw new Error('未知错误')
  }
}

/**
 * Image context for building system prompt
 */
export interface ImageContext {
  labels?: string[]
  tags?: string[]
  title?: string | null
  description?: string | null
  takenAt?: string | null
  cameraModel?: string | null
  cameraMake?: string | null
  focalLength?: number | null
  aperture?: number | null
  shutterSpeed?: string | null
  iso?: number | null
  width?: number
  height?: number
}

/**
 * Build system prompt for image Q&A
 * @param imageContext Information about the image
 * @returns System prompt string
 */
export function buildImageSystemPrompt(imageContext: ImageContext): string {
  const parts: string[] = [
    '你是一个专业的图片分析助手。用户会向你提问关于一张图片的问题，你需要根据以下图片信息来回答。',
    '',
    '## 重要规则',
    '1. 只根据提供的图片信息回答，不要编造不存在的内容',
    '2. 如果无法从给定信息中得出答案，请诚实说明',
    '3. 回答要简洁、有帮助',
    '4. 使用中文回答',
    '',
    '## 图片信息',
  ]

  // Add image metadata
  if (imageContext.title) {
    parts.push(`- 标题: ${imageContext.title}`)
  }

  if (imageContext.description) {
    parts.push(`- 描述: ${imageContext.description}`)
  }

  if (imageContext.width && imageContext.height) {
    parts.push(`- 尺寸: ${imageContext.width} × ${imageContext.height} 像素`)
  }

  // Add AI-detected content
  if (imageContext.labels && imageContext.labels.length > 0) {
    parts.push(`- AI识别内容: ${imageContext.labels.join('、')}`)
  }

  if (imageContext.tags && imageContext.tags.length > 0) {
    parts.push(`- 标签: ${imageContext.tags.join('、')}`)
  }

  // Add EXIF data
  if (imageContext.takenAt) {
    parts.push(`- 拍摄时间: ${imageContext.takenAt}`)
  }

  if (imageContext.cameraMake || imageContext.cameraModel) {
    const camera = [imageContext.cameraMake, imageContext.cameraModel].filter(Boolean).join(' ')
    parts.push(`- 拍摄设备: ${camera}`)
  }

  // Add shooting parameters
  const shootingParams: string[] = []
  if (imageContext.focalLength) {
    shootingParams.push(`焦距 ${imageContext.focalLength}mm`)
  }
  if (imageContext.aperture) {
    shootingParams.push(`光圈 f/${imageContext.aperture}`)
  }
  if (imageContext.shutterSpeed) {
    shootingParams.push(`快门 ${imageContext.shutterSpeed}`)
  }
  if (imageContext.iso) {
    shootingParams.push(`ISO ${imageContext.iso}`)
  }

  if (shootingParams.length > 0) {
    parts.push(`- 拍摄参数: ${shootingParams.join('、')}`)
  }

  return parts.join('\n')
}

/**
 * Generate a reply for an image-related question
 * @param question User's question
 * @param imageContext Image information
 * @param conversationHistory Previous messages in the conversation
 * @returns AI-generated reply
 */
export async function generateImageReply(
  question: string,
  imageContext: ImageContext,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  const systemPrompt = buildImageSystemPrompt(imageContext)

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: question },
  ]

  return chatCompletion(messages)
}
