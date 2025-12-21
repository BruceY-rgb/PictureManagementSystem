/**
 * MCP Natural Language Parser
 * Lightweight custom parser to convert natural language queries into structured search criteria
 */

export interface ParsedQuery {
  keywords: string[]
  scenes?: string[]
  objects?: string[]
  emotions?: string[]
  dates?: {
    start?: Date
    end?: Date
  }
  locations?: string[]
  tags?: string[]
  confidence: number
}

// Stop words to remove from queries
const STOP_WORDS = new Set([
  'find', 'show', 'get', 'search', 'me', 'my', 'the', 'a', 'an', 'of', 'in',
  'at', 'on', 'for', 'with', 'from', 'to', 'by', 'and', 'or', 'is', 'are',
  'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'photos', 'photo', 'pictures', 'picture', 'images', 'image', 'pics', 'pic',
])

// Scene keywords mapping
const SCENE_KEYWORDS = new Set([
  'beach', 'sea', 'ocean', 'seaside', 'coast', 'shore',
  'mountain', 'mountains', 'hill', 'hills', 'peak',
  'city', 'urban', 'downtown', 'street', 'cityscape',
  'park', 'garden', 'outdoor', 'outside',
  'indoor', 'inside', 'interior', 'room',
  'forest', 'woods', 'trees', 'jungle',
  'sunset', 'sunrise', 'dawn', 'dusk', 'twilight',
  'night', 'evening', 'nighttime',
  'sky', 'clouds', 'cloudy', 'sunny',
  'snow', 'winter', 'snowy',
  'desert', 'sand', 'dunes',
  'lake', 'river', 'water', 'waterfall',
  'building', 'architecture',
  'landscape', 'nature', 'scenery',
])

// Object keywords mapping
const OBJECT_KEYWORDS = new Set([
  'person', 'people', 'human', 'man', 'woman', 'child', 'kid', 'baby',
  'dog', 'cat', 'animal', 'pet', 'bird', 'horse',
  'car', 'vehicle', 'bike', 'bicycle', 'motorcycle',
  'tree', 'flower', 'plant', 'rose', 'leaf',
  'food', 'meal', 'dish', 'cake', 'dessert',
  'building', 'house', 'home', 'bridge',
  'boat', 'ship', 'plane', 'airplane',
  'phone', 'camera', 'computer', 'laptop',
  'book', 'chair', 'table', 'furniture',
])

// Emotion keywords mapping
const EMOTION_KEYWORDS = new Set([
  'happy', 'joy', 'joyful', 'cheerful', 'glad',
  'sad', 'unhappy', 'depressed', 'gloomy',
  'peaceful', 'calm', 'serene', 'tranquil', 'quiet',
  'tense', 'nervous', 'anxious', 'stressed',
  'energetic', 'active', 'lively', 'dynamic',
  'romantic', 'love', 'lovely',
  'mysterious', 'dark', 'moody',
  'excited', 'exciting', 'thrilling',
  'relaxed', 'relaxing', 'chill',
])

// Synonym mapping for fuzzy matching
const SYNONYMS: Record<string, string> = {
  'seaside': 'beach',
  'coast': 'beach',
  'shore': 'beach',
  'sea': 'ocean',
  'woods': 'forest',
  'hill': 'mountain',
  'peak': 'mountain',
  'downtown': 'city',
  'urban': 'city',
  'cityscape': 'city',
  'outside': 'outdoor',
  'inside': 'indoor',
  'interior': 'indoor',
  'dawn': 'sunrise',
  'dusk': 'sunset',
  'twilight': 'sunset',
  'nighttime': 'night',
  'snowy': 'snow',
  'cloudy': 'clouds',
  'sunny': 'sky',
  'human': 'person',
  'man': 'person',
  'woman': 'person',
  'kid': 'child',
  'baby': 'child',
  'pet': 'animal',
  'bike': 'bicycle',
  'plane': 'airplane',
  'home': 'house',
  'meal': 'food',
  'dish': 'food',
  'dessert': 'food',
  'joy': 'happy',
  'joyful': 'happy',
  'cheerful': 'happy',
  'glad': 'happy',
  'unhappy': 'sad',
  'gloomy': 'sad',
  'calm': 'peaceful',
  'serene': 'peaceful',
  'tranquil': 'peaceful',
  'quiet': 'peaceful',
  'nervous': 'tense',
  'anxious': 'tense',
  'stressed': 'tense',
  'active': 'energetic',
  'lively': 'energetic',
  'dynamic': 'energetic',
  'love': 'romantic',
  'lovely': 'romantic',
  'dark': 'mysterious',
  'moody': 'mysterious',
  'exciting': 'excited',
  'thrilling': 'excited',
  'relaxing': 'relaxed',
  'chill': 'relaxed',
}

// Month names mapping
const MONTHS: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
}

/**
 * Parse natural language query into structured search criteria
 */
export function parseNaturalLanguage(query: string): ParsedQuery {
  if (!query || query.trim().length === 0) {
    return {
      keywords: [],
      confidence: 0,
    }
  }

  const normalizedQuery = query.toLowerCase().trim()

  const result: ParsedQuery = {
    keywords: [],
    scenes: [],
    objects: [],
    emotions: [],
    confidence: 0,
  }

  // Extract dates first (before tokenization)
  const dates = extractDates(normalizedQuery)
  if (dates) {
    result.dates = dates
  }

  // Extract locations (capitalized words)
  const locations = extractLocations(query) // Use original query for capitalization
  if (locations.length > 0) {
    result.locations = locations
  }

  // Tokenize query (split by spaces and punctuation)
  const tokens = normalizedQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0 && !STOP_WORDS.has(token))

  // Categorize tokens
  for (const token of tokens) {
    // Apply synonyms
    const normalizedToken = SYNONYMS[token] || token

    // Check categories
    if (SCENE_KEYWORDS.has(normalizedToken)) {
      if (!result.scenes!.includes(normalizedToken)) {
        result.scenes!.push(normalizedToken)
      }
    }

    if (OBJECT_KEYWORDS.has(normalizedToken)) {
      if (!result.objects!.includes(normalizedToken)) {
        result.objects!.push(normalizedToken)
      }
    }

    if (EMOTION_KEYWORDS.has(normalizedToken)) {
      if (!result.emotions!.includes(normalizedToken)) {
        result.emotions!.push(normalizedToken)
      }
    }

    // Add to keywords if not categorized
    if (
      !SCENE_KEYWORDS.has(normalizedToken) &&
      !OBJECT_KEYWORDS.has(normalizedToken) &&
      !EMOTION_KEYWORDS.has(normalizedToken) &&
      !result.keywords.includes(token)
    ) {
      result.keywords.push(token)
    }
  }

  // Calculate confidence score
  result.confidence = calculateConfidence(result)

  // Clean up empty arrays
  if (result.scenes!.length === 0) delete result.scenes
  if (result.objects!.length === 0) delete result.objects
  if (result.emotions!.length === 0) delete result.emotions
  if (result.locations && result.locations.length === 0) delete result.locations
  if (!result.dates) delete result.dates

  return result
}

/**
 * Extract dates from query
 */
function extractDates(query: string): { start?: Date; end?: Date } | null {
  const now = new Date()
  const currentYear = now.getFullYear()

  // Year pattern: "from 2023", "in 2024", "2023"
  const yearMatch = query.match(/\b(from\s+)?(\d{4})\b/)
  if (yearMatch) {
    const year = parseInt(yearMatch[2])
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31, 23, 59, 59),
    }
  }

  // Month pattern: "in december", "from january"
  const monthNames = Object.keys(MONTHS).join('|')
  const monthPattern = new RegExp(`\\b(?:in|from)\\s+(${monthNames})\\b`, 'i')
  const monthMatch = query.match(monthPattern)
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase()
    const month = MONTHS[monthName]
    const year = currentYear
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0, 23, 59, 59),
    }
  }

  // Relative date patterns
  if (query.includes('last week')) {
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    return { start, end: now }
  }

  if (query.includes('last month')) {
    const start = new Date(now)
    start.setMonth(start.getMonth() - 1)
    return { start, end: now }
  }

  if (query.includes('last year')) {
    const start = new Date(now)
    start.setFullYear(start.getFullYear() - 1)
    return { start, end: now }
  }

  if (query.includes('this week')) {
    const start = new Date(now)
    start.setDate(start.getDate() - now.getDay())
    return { start, end: now }
  }

  if (query.includes('this month')) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start, end: now }
  }

  if (query.includes('this year')) {
    const start = new Date(now.getFullYear(), 0, 1)
    return { start, end: now }
  }

  if (query.includes('today')) {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { start, end: now }
  }

  return null
}

/**
 * Extract location names (capitalized words)
 */
function extractLocations(query: string): string[] {
  // Match capitalized words (potential place names)
  const locationPattern = /\b(?:at|in|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
  const results: string[] = []
  let match: RegExpExecArray | null
  while ((match = locationPattern.exec(query)) !== null) {
    results.push(match[1])
  }
  return results
}

/**
 * Calculate confidence score based on parsed results
 */
function calculateConfidence(result: ParsedQuery): number {
  let score = 0.3 // Base confidence

  // Categorized items increase confidence
  const categorizedCount =
    (result.scenes?.length || 0) +
    (result.objects?.length || 0) +
    (result.emotions?.length || 0)

  score += categorizedCount * 0.15 // +0.15 per categorized item

  // Dates increase confidence
  if (result.dates) {
    score += 0.1
  }

  // Locations increase confidence
  if (result.locations && result.locations.length > 0) {
    score += 0.1
  }

  // Keywords provide some confidence
  score += Math.min(result.keywords.length * 0.05, 0.15)

  // Cap at 0.95
  return Math.min(score, 0.95)
}

/**
 * Get query suggestions based on common patterns
 */
export function getQuerySuggestions(): string[] {
  return [
    'beach photos',
    'sunset pictures',
    'photos with people',
    'mountain landscapes',
    'city photos at night',
    'photos from last month',
    'peaceful nature images',
    'happy moments',
    'food pictures',
    'photos with animals',
  ]
}
