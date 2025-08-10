// Enhanced OCR Service with multiple free providers for high reliability
// Supports OCR.space, FreeOCR.AI, and Gemini as fallbacks

interface OCRResult {
  text: string
  confidence?: number
  processingTime: number
  provider: string
}

interface OCRError {
  message: string
  provider: string
  code?: string
}

export class OCRService {
  private static readonly FREE_PROVIDERS = [
    'ocr-space',
    'gemini'
  ] as const

  private static readonly OCR_SPACE_API_KEY = 'helloworld' // Free tier key
  private static readonly RATE_LIMITS = new Map<string, { count: number; resetTime: number }>()

  /**
   * Extract text from image using multiple OCR providers with fallbacks
   */
  static async extractText(
    imageBuffer: Buffer, 
    mimeType: string,
    userEmail: string = 'anonymous'
  ): Promise<OCRResult> {
    const startTime = Date.now()
    const errors: OCRError[] = []

    // Try each provider in order until one succeeds
    for (const provider of this.FREE_PROVIDERS) {
      try {
        // Check rate limits per provider
        if (this.isRateLimited(provider, userEmail)) {
          continue
        }

        let result: OCRResult
        
        switch (provider) {
          case 'ocr-space':
            result = await this.extractWithOCRSpace(imageBuffer, mimeType)
            break
          // 'free-ocr-ai' removed because the service is unavailable
          case 'gemini':
            result = await this.extractWithGemini(imageBuffer, mimeType)
            break
          default:
            continue
        }

        // Update rate limits
        this.updateRateLimit(provider, userEmail)
        
        result.processingTime = Date.now() - startTime
        return result

      } catch (error: any) {
        console.warn(`OCR provider ${provider} failed:`, error.message)
        errors.push({
          message: error.message,
          provider,
          code: error.code
        })
        continue
      }
    }

    // All providers failed
    throw new Error(`All OCR providers failed. Errors: ${errors.map(e => `${e.provider}: ${e.message}`).join(', ')}`)
  }

  /**
   * OCR.space API - Free tier with 25,000 requests/month
   */
  private static async extractWithOCRSpace(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    // Enhanced validation
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Invalid image buffer')
    }

    if (imageBuffer.length > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Image too large for OCR.space (max 5MB)')
    }

    const base64Image = imageBuffer.toString('base64')
    
    const requestBody = {
      apikey: this.OCR_SPACE_API_KEY,
      base64Image: `data:${mimeType};base64,${base64Image}`,
      language: 'eng',
      isOverlayRequired: false,
      detectOrientation: true,
      scale: true,
      OCREngine: 2,
      isTable: false,
      filetype: mimeType.split('/')[1]?.toUpperCase() || 'AUTO'
    }

    const response = await Promise.race([
      fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Literary-Showcase/1.0'
        },
        body: JSON.stringify(requestBody)
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('OCR.space request timeout')), 30000)
      )
    ])

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`OCR.space API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    
    if (result.IsErroredOnProcessing) {
      const errorMessage = Array.isArray(result.ErrorMessage) 
        ? result.ErrorMessage.join(', ') 
        : result.ErrorMessage || 'Unknown processing error'
      throw new Error(`OCR.space processing error: ${errorMessage}`)
    }

    if (!result.ParsedResults?.[0]?.ParsedText) {
      throw new Error('No readable text found in image')
    }

    const extractedText = result.ParsedResults[0].ParsedText.trim()
    
    if (extractedText.length === 0) {
      throw new Error('Empty text extracted from image')
    }

    return {
      text: extractedText,
      confidence: this.calculateConfidence(result.ParsedResults[0]),
      processingTime: 0,
      provider: 'ocr-space'
    }
  }

  /**
   * Calculate confidence score based on OCR results
   */
  private static calculateConfidence(result: any): number {
    try {
      if (result.TextOverlay?.Lines) {
        const lines = result.TextOverlay.Lines
        const avgConfidence = lines.reduce((sum: number, line: any) => {
          const lineConfidence = line.Words?.reduce((wordSum: number, word: any) => {
            return wordSum + (word.WordText ? 0.9 : 0.3)
          }, 0) / (line.Words?.length || 1)
          return sum + lineConfidence
        }, 0) / lines.length
        return Math.round(avgConfidence * 100) / 100
      }
      
      // Fallback confidence based on text length and characteristics
      const textLength = result.ParsedText?.length || 0
      if (textLength > 100) return 0.9
      if (textLength > 50) return 0.7
      if (textLength > 10) return 0.5
      return 0.3
    } catch (error) {
      return 0.5 // Default confidence
    }
  }

  /**
   * FreeOCR.AI API - Latest VLM technology, free to use
   */
  // FreeOCR.AI integration removed

  /**
   * Gemini API fallback - enhanced with better error handling
   */
  private static async extractWithGemini(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    try {
      // Enhanced validation
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer')
      }

      if (imageBuffer.length > 10 * 1024 * 1024) { // 10MB limit for Gemini
        throw new Error('Image too large for Gemini (max 10MB)')
      }

      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      
      // Try to get API key from multiple sources
      let geminiApiKey = process.env.GEMINI_API_KEY
      
      if (!geminiApiKey) {
        try {
          const { DatabaseService } = await import('./database-service')
          const settings = await DatabaseService.getSettings()
          geminiApiKey = settings?.geminiApiKey
        } catch (error) {
          console.warn('Could not load Gemini API key from settings:', error)
        }
      }

      if (!geminiApiKey || geminiApiKey.length < 10) {
        throw new Error('Gemini API key not configured or invalid')
      }

      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.1,
        }
      })

      const enhancedPrompt = `You are a professional OCR system. Extract ALL visible text from this image with maximum accuracy.

Instructions:
1. Return ONLY the extracted text, nothing else
2. Preserve original line breaks and paragraph structure
3. Maintain spacing between words and sentences
4. If text is in multiple columns, read left to right, top to bottom
5. Include punctuation exactly as shown
6. Do not add explanations, descriptions, or commentary
7. If no readable text exists, return exactly: "No readable text found"

Extract the text now:`

      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType
        }
      }

      const result = await Promise.race([
        model.generateContent([enhancedPrompt, imagePart]),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Gemini request timeout (30s)')), 30000)
        )
      ])

      const response = await result.response
      const text = response.text()

      if (!text || text.trim() === '') {
        throw new Error('Gemini returned empty response')
      }

      const cleanedText = text.trim()
      
      if (cleanedText.toLowerCase().includes('no readable text found') || 
          cleanedText.toLowerCase().includes('no text') ||
          cleanedText.length < 3) {
        throw new Error('No readable text found in image')
      }

      // Calculate confidence based on response characteristics
      const confidence = this.calculateGeminiConfidence(cleanedText)

      return {
        text: cleanedText,
        confidence,
        processingTime: 0,
        provider: 'gemini'
      }
    } catch (error: any) {
      // Enhanced error handling
      if (error.message?.includes('API key')) {
        throw new Error('Invalid or missing Gemini API key')
      }
      if (error.message?.includes('quota') || error.message?.includes('limit')) {
        throw new Error('Gemini API quota exceeded')
      }
      if (error.message?.includes('safety') || error.message?.includes('SAFETY')) {
        throw new Error('Image content blocked by safety filters')
      }
      throw error
    }
  }

  /**
   * Calculate confidence for Gemini results
   */
  private static calculateGeminiConfidence(text: string): number {
    // Heuristics for Gemini confidence
    let confidence = 0.7 // Base confidence for Gemini
    
    // Length bonus
    if (text.length > 100) confidence += 0.1
    if (text.length > 500) confidence += 0.1
    
    // Structure bonus
    if (text.includes('\n') || text.includes('.')) confidence += 0.05
    
    // No obvious AI artifacts penalty
    if (text.includes('I cannot') || text.includes('Unable to')) confidence -= 0.3
    
    return Math.min(0.95, Math.max(0.3, confidence))
  }

  /**
   * Check if provider is rate limited for user
   */
  private static isRateLimited(provider: string, userEmail: string): boolean {
    const key = `${provider}-${userEmail}`
    const now = Date.now()
    const userRequest = this.RATE_LIMITS.get(key)
    
    if (!userRequest) return false
    
    if (now < userRequest.resetTime) {
      // Different limits per provider
      const limits = {
        'ocr-space': 50, // Per hour
        'free-ocr-ai': 20, // Per hour  
        'gemini': 10 // Per hour
      }
      
      return userRequest.count >= (limits[provider as keyof typeof limits] || 10)
    }
    
    return false
  }

  /**
   * Update rate limit for provider and user
   */
  private static updateRateLimit(provider: string, userEmail: string): void {
    const key = `${provider}-${userEmail}`
    const now = Date.now()
    const hourInMs = 60 * 60 * 1000
    
    const existing = this.RATE_LIMITS.get(key)
    
    if (existing && now < existing.resetTime) {
      existing.count++
    } else {
      this.RATE_LIMITS.set(key, {
        count: 1,
        resetTime: now + hourInMs
      })
    }
  }

  /**
   * Get available providers status
   */
  static async getProvidersStatus(): Promise<Array<{provider: string, available: boolean, error?: string}>> {
    const status = []
    
    // Check OCR.space
    try {
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apikey: 'test' })
      })
      status.push({ 
        provider: 'ocr-space', 
        available: response.status !== 500 
      })
    } catch (error) {
      status.push({ 
        provider: 'ocr-space', 
        available: false, 
        error: 'Network error' 
      })
    }

    // Check Gemini
    const geminiApiKey = process.env.GEMINI_API_KEY
    status.push({
      provider: 'gemini',
      available: !!geminiApiKey,
      error: !geminiApiKey ? 'API key not configured' : undefined
    })

    // FreeOCR.AI status removed

    return status
  }
}