/**
 * Baidu AI Service
 * Provides image analysis functionality using Baidu Advanced General Recognition API
 */

export interface AIAnalysisResult {
  scenes: string[]
  objects: string[]
  confidence: number
  rawResponse?: any
}

interface BaiduTokenResponse {
  access_token: string
  expires_in: number
}

interface BaiduRecognitionResponse {
  log_id: number
  result_num: number
  result: Array<{
    keyword: string
    score: number
    root: string
  }>
}

const BAIDU_API_KEY = process.env.BAIDU_API_KEY
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY
const API_TIMEOUT = parseInt(process.env.AI_ANALYSIS_TIMEOUT || '30000')

// Token cache
let cachedToken: string | null = null
let tokenExpiresAt: number = 0

/**
 * Get Baidu Access Token (with caching)
 */
async function getBaiduAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 minute buffer)
  const now = Date.now()
  if (cachedToken && tokenExpiresAt > now + 5 * 60 * 1000) {
    return cachedToken
  }

  if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
    throw new Error('Baidu API credentials not configured')
  }

  console.log('[Baidu AI] Fetching new access token...')

  const url = 'https://aip.baidubce.com/oauth/2.0/token'
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: BAIDU_API_KEY,
    client_secret: BAIDU_SECRET_KEY,
  })

  try {
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get access token: ${response.status} ${errorText}`)
    }

    const data: BaiduTokenResponse = await response.json()

    // Cache the token
    cachedToken = data.access_token
    // Token expires in 30 days, but we'll cache for the duration minus 1 hour
    tokenExpiresAt = now + (data.expires_in - 3600) * 1000

    console.log('[Baidu AI] Access token obtained successfully')
    return cachedToken
  } catch (error) {
    console.error('[Baidu AI] Failed to get access token:', error)
    throw error
  }
}

/**
 * Analyzes an image using Baidu Advanced General Recognition API
 * @param imageBuffer The image buffer to analyze
 * @returns Analysis result with scenes, objects, and confidence
 */
export async function analyzeImage(imageBuffer: Buffer): Promise<AIAnalysisResult> {
  try {
    // Validate API credentials
    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
      console.error('[Baidu AI] API credentials not configured')
      return {
        scenes: [],
        objects: [],
        confidence: 0,
      }
    }

    // Check image size (max 4MB for Baidu API)
    const maxSize = 4 * 1024 * 1024 // 4MB
    if (imageBuffer.length > maxSize) {
      console.warn('[Baidu AI] Image too large:', imageBuffer.length, 'bytes (max 4MB)')
      return {
        scenes: [],
        objects: [],
        confidence: 0,
      }
    }

    // Get access token
    const accessToken = await getBaiduAccessToken()

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64')

    console.log('[Baidu AI] Starting image analysis...')

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    // Call Baidu API
    const url = `https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token=${accessToken}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `image=${encodeURIComponent(base64Image)}`,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Baidu AI] API error: ${response.status}`, errorText)
      throw new Error(`Baidu API error: ${response.status}`)
    }

    const data: BaiduRecognitionResponse = await response.json()
    console.log('[Baidu AI] API response received')

    // Parse response
    const result = parseBaiduResponse(data)
    console.log('[Baidu AI] Analysis completed:', {
      scenes: result.scenes.length,
      objects: result.objects.length,
      confidence: result.confidence.toFixed(2),
    })

    return result
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[Baidu AI] Analysis timeout after', API_TIMEOUT, 'ms')
      } else {
        console.error('[Baidu AI] Analysis failed:', error.message)
      }
    } else {
      console.error('[Baidu AI] Unknown error:', error)
    }

    return {
      scenes: [],
      objects: [],
      confidence: 0,
    }
  }
}

/**
 * Parse Baidu API response and extract structured data
 */
function parseBaiduResponse(data: BaiduRecognitionResponse): AIAnalysisResult {
  try {
    const results = data.result || []

    if (results.length === 0) {
      console.warn('[Baidu AI] No results in response')
      return {
        scenes: [],
        objects: [],
        confidence: 0,
        rawResponse: data,
      }
    }

    // Classify results into scenes and objects
    const scenes: string[] = []
    const objects: string[] = []

    for (const item of results) {
      const keyword = item.keyword.trim()
      const root = item.root || ''

      // Classify based on root category
      if (isSceneKeyword(root, keyword)) {
        scenes.push(keyword)
      } else {
        objects.push(keyword)
      }
    }

    // Calculate average confidence
    const confidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0

    return {
      scenes: scenes.slice(0, 10), // Limit to 10 scenes
      objects: objects.slice(0, 10), // Limit to 10 objects
      confidence,
      rawResponse: data,
    }
  } catch (error) {
    console.error('[Baidu AI] Failed to parse response:', error)
    console.error('[Baidu AI] Raw response:', JSON.stringify(data))

    return {
      scenes: [],
      objects: [],
      confidence: 0,
      rawResponse: data,
    }
  }
}

/**
 * Determine if a keyword represents a scene based on its root category
 */
function isSceneKeyword(root: string, keyword: string): boolean {
  // Scene indicators in root category
  const sceneIndicators = [
    '风景', '场景', '环境', '地点', '天气', '时间',
    '自然', '室内', '室外', '户外', '景色', '景观'
  ]

  // Check if root contains any scene indicator
  const isScene = sceneIndicators.some(indicator => root.includes(indicator))

  // Additional keyword-based classification
  const sceneKeywords = [
    '海滩', '沙滩', '海洋', '大海', '山', '山脉', '森林', '树林',
    '天空', '云', '日落', '日出', '夜晚', '夜景', '城市', '街道',
    '公园', '花园', '室内', '户外', '建筑', '风景', '景色'
  ]

  const hasSceneKeyword = sceneKeywords.some(kw => keyword.includes(kw))

  return isScene || hasSceneKeyword
}
