/**
 * Doubao (豆包) AI Service
 * Provides image analysis and chat functionality using Volcano Engine Doubao API
 */

export interface AIAnalysisResult {
  scenes: string[]
  objects: string[]
  people: string[]      // 新增: 人物识别
  text: string[]        // 新增: 文字识别
  emotions: string[]
  details: string[]     // 新增: 其他细节
  confidence: number
  rawResponse?: any
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
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

const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY
const DOUBAO_BASE_URL = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
const DOUBAO_MODEL = process.env.DOUBAO_MODEL || 'doubao-1.5-vision-pro-32k'
const API_TIMEOUT = parseInt(process.env.AI_ANALYSIS_TIMEOUT || '30000')
const CHAT_TIMEOUT = 60000 // 60 seconds for chat

const ANALYSIS_PROMPT = `请作为一位专业的图片分析专家,非常详细地分析这张图片。请尽可能识别具体的内容,而不是泛化的类别。

## 分析要求

1. **场景识别 (SCENES)**:
   - 识别具体的地点或场景类型
   - 如果是著名地标,请说出名称(如"埃菲尔铁塔"、"自由女神像"、"长城")
   - 描述环境特征(室内/室外、时间、天气等)

2. **物体和主体 (OBJECTS)**:
   - 识别所有可见的物体,越具体越好
   - 如果是知名品牌或产品,请说出品牌/型号(如"iPhone"、"特斯拉"、"MacBook")
   - 识别动物的具体种类(如"金毛犬"而不是"狗")
   - 识别植物的具体种类(如"樱花"而不是"花")

3. **人物识别 (PEOPLE)**:
   - 如果能识别出是公众人物,请说出名字(如"埃隆马斯克"、"马云"、"周杰伦")
   - 描述人物特征(年龄段、性别、服装、动作)
   - 如果无法确定身份,描述"男性"、"女性"、"儿童"等
   - 对不确定的识别,加上"疑似"前缀

4. **文字内容 (TEXT)**:
   - 识别图片中的所有可见文字
   - 包括标志、招牌、海报上的文字
   - 按顺序列出所有文字内容

5. **情感氛围 (EMOTIONS)**:
   - 图片传达的情感或氛围
   - 整体色调和感觉

6. **其他细节 (DETAILS)**:
   - 主要颜色和色调
   - 构图风格
   - 特殊效果或滤镜
   - 光线特点

## 输出格式

请严格按照以下JSON格式输出,不要有任何其他文本:

{
  "scenes": ["具体场景1", "具体场景2"],
  "objects": ["具体物体1", "具体物体2"],
  "people": ["人物名称或描述1", "人物描述2"],
  "text": ["识别出的文字1", "文字2"],
  "emotions": ["情感1", "情感2"],
  "details": ["细节1", "细节2"]
}

注意:
- 所有值使用中文
- 尽可能详细和具体
- 如果某个类别没有内容,返回空数组[]
- 对于不确定的识别结果,可以加上"疑似"前缀`

/**
 * Analyzes an image using Doubao Vision API
 * @param imageBuffer The image buffer to analyze
 * @returns Analysis result with scenes, objects, emotions, and confidence
 */
export async function analyzeImage(imageBuffer: Buffer): Promise<AIAnalysisResult> {
  try {
    // Validate API key
    if (!DOUBAO_API_KEY) {
      console.error('[Doubao] API key not configured')
      return {
        scenes: [],
        objects: [],
        people: [],
        text: [],
        emotions: [],
        details: [],
        confidence: 0,
      }
    }

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64')
    const mimeType = detectMimeType(imageBuffer)

    // Check image size (max 10MB for Doubao API)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (imageBuffer.length > maxSize) {
      console.warn('[Doubao] Image too large:', imageBuffer.length, 'bytes (max 10MB)')
      return {
        scenes: [],
        objects: [],
        people: [],
        text: [],
        emotions: [],
        details: [],
        confidence: 0,
      }
    }

    console.log('[Doubao] Starting image analysis...')

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    // Call Doubao API
    const response = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DOUBAO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DOUBAO_MODEL,
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
      console.error(`[Doubao] API error: ${response.status}`, errorText)
      throw new Error(`Doubao API error: ${response.status}`)
    }

    const data: ChatCompletionResponse = await response.json()
    console.log('[Doubao] API response received')

    // Parse response
    const result = parseAnalysisResponse(data)
    console.log('[Doubao] Analysis completed:', {
      scenes: result.scenes.length,
      objects: result.objects.length,
      emotions: result.emotions.length,
      confidence: result.confidence.toFixed(2),
    })

    return result
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[Doubao] Analysis timeout after', API_TIMEOUT, 'ms')
      } else {
        console.error('[Doubao] Analysis failed:', error.message)
      }
    } else {
      console.error('[Doubao] Unknown error:', error)
    }

    return {
      scenes: [],
      objects: [],
      people: [],
      text: [],
      emotions: [],
      details: [],
      confidence: 0,
    }
  }
}

/**
 * Parse Doubao API response and extract structured data
 */
function parseAnalysisResponse(data: ChatCompletionResponse): AIAnalysisResult {
  try {
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.warn('[Doubao] No content in response')
      return {
        scenes: [],
        objects: [],
        people: [],
        text: [],
        emotions: [],
        details: [],
        confidence: 0,
        rawResponse: data,
      }
    }

    // Try to extract JSON from response
    // Doubao might wrap JSON in markdown code blocks
    let jsonContent = content.trim()

    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    // Parse JSON
    const parsed = JSON.parse(jsonContent)

    // Normalize data
    const scenes = Array.isArray(parsed.scenes)
      ? parsed.scenes.map((s: string) => s.trim()).filter(Boolean)
      : []
    const objects = Array.isArray(parsed.objects)
      ? parsed.objects.map((o: string) => o.trim()).filter(Boolean)
      : []
    const people = Array.isArray(parsed.people)
      ? parsed.people.map((p: string) => p.trim()).filter(Boolean)
      : []
    const text = Array.isArray(parsed.text)
      ? parsed.text.map((t: string) => t.trim()).filter(Boolean)
      : []
    const emotions = Array.isArray(parsed.emotions)
      ? parsed.emotions.map((e: string) => e.trim()).filter(Boolean)
      : []
    const details = Array.isArray(parsed.details)
      ? parsed.details.map((d: string) => d.trim()).filter(Boolean)
      : []

    // Calculate confidence based on number of detected items
    const totalItems = scenes.length + objects.length + people.length + text.length + emotions.length + details.length
    const confidence = totalItems > 0
      ? Math.min(0.95, 0.5 + (totalItems * 0.03)) // 0.5 base + 0.03 per item, max 0.95
      : 0

    return {
      scenes: scenes.slice(0, 10), // Limit to 10 items per category
      objects: objects.slice(0, 10),
      people: people.slice(0, 10),
      text: text.slice(0, 10),
      emotions: emotions.slice(0, 5), // Fewer emotions
      details: details.slice(0, 10),
      confidence,
      rawResponse: data,
    }
  } catch (error) {
    console.error('[Doubao] Failed to parse response:', error)
    console.error('[Doubao] Raw content:', data.choices?.[0]?.message?.content)

    return {
      scenes: [],
      objects: [],
      people: [],
      text: [],
      emotions: [],
      details: [],
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

/**
 * Send a chat completion request to Doubao API
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
  if (!DOUBAO_API_KEY) {
    throw new Error('Doubao API key not configured')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT)

  try {
    console.log('[Doubao Chat] Sending chat completion request...')

    const response = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_API_KEY}`,
      },
      body: JSON.stringify({
        model: options?.model || DOUBAO_MODEL,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Doubao Chat] API error:', response.status, errorText)
      throw new Error(`Doubao API error: ${response.status} - ${errorText}`)
    }

    const data: ChatCompletionResponse = await response.json()
    console.log('[Doubao Chat] Response received, tokens used:', data.usage?.total_tokens)

    const reply = data.choices?.[0]?.message?.content
    if (!reply) {
      throw new Error('No reply content in response')
    }

    return reply
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[Doubao Chat] Request timeout after', CHAT_TIMEOUT, 'ms')
        throw new Error('请求超时,请稍后重试')
      }
      console.error('[Doubao Chat] Chat completion failed:', error.message)
      throw error
    }

    console.error('[Doubao Chat] Unknown error:', error)
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
  // 新增: 用于Vision问答
  imageBuffer?: Buffer
  mimeType?: string
}

/**
 * Build metadata section for system prompt
 * @param imageContext Information about the image
 * @returns Formatted metadata string
 */
function buildMetadataSection(imageContext: ImageContext): string {
  const parts: string[] = []

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
 * Build system prompt for image Q&A
 * @param imageContext Information about the image
 * @returns System prompt string
 */
export function buildImageSystemPrompt(imageContext: ImageContext): string {
  const metadataSection = buildMetadataSection(imageContext)

  // 如果提供了实际图片,使用Vision模式的prompt
  if (imageContext.imageBuffer && imageContext.mimeType) {
    const parts: string[] = [
      '你是一个专业的图片分析助手。用户会向你展示一张图片并提问。',
      '',
      '## 重要规则',
      '1. 仔细观察图片,基于你看到的内容回答问题',
      '2. 如果问题需要的信息在图片中不可见,请诚实说明',
      '3. 回答要准确、详细、有帮助',
      '4. 使用中文回答',
    ]

    if (metadataSection) {
      parts.push('')
      parts.push('## 图片元数据(仅供参考)')
      parts.push(metadataSection)
      parts.push('')
      parts.push('请根据图片内容和元数据来回答用户的问题。')
    } else {
      parts.push('')
      parts.push('请根据图片内容来回答用户的问题。')
    }

    return parts.join('\n')
  }

  // 如果只有元数据,使用传统模式的prompt
  const parts: string[] = [
    '你是一个专业的图片分析助手。用户会向你提问关于一张图片的问题,你需要根据以下图片信息来回答。',
    '',
    '## 重要规则',
    '1. 只根据提供的图片信息回答,不要编造不存在的内容',
    '2. 如果无法从给定信息中得出答案,请诚实说明',
    '3. 回答要简洁、有帮助',
    '4. 使用中文回答',
    '',
    '## 图片信息',
  ]

  if (metadataSection) {
    parts.push(metadataSection)
  } else {
    parts.push('(无可用信息)')
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
  ]

  // 如果提供了图片内容,在用户消息中包含图片
  if (imageContext.imageBuffer && imageContext.mimeType) {
    const base64Image = imageContext.imageBuffer.toString('base64')
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:${imageContext.mimeType};base64,${base64Image}`,
          },
        },
        {
          type: 'text',
          text: question,
        },
      ],
    })
  } else {
    // 如果没有图片,使用纯文本消息
    messages.push({
      role: 'user',
      content: question,
    })
  }

  return chatCompletion(messages)
}
