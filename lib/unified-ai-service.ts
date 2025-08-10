import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Category } from '@/types/literary'

// Provider types
export type AIProvider = 'openai' | 'gemini' | 'deepseek'

// Configuration interface
interface ProviderConfig {
  apiKey: string
  model: string
  fallbackModel?: string
  maxTokens?: number
  temperature?: number
}

// Unified response interface
interface GeneratedContent {
  content: string
  author: string
  source?: string
  category: Category
  type: "quote" | "poem" | "reflection"
}

interface SourceInfo {
  author: string
  source?: string
}

interface GenerationParameters {
  category: Category
  type: "quote" | "poem" | "reflection"
  theme?: string
  tone: string
  quantity: number
  writingMode?: 'known-writers' | 'original-ai'
}

export class UnifiedAIService {
  private static openaiClient: OpenAI | null = null
  private static geminiClient: GoogleGenerativeAI | null = null

  /**
   * Get the current AI provider from admin settings
   */
  private static async getCurrentProvider(forcedProvider?: AIProvider): Promise<{ provider: AIProvider; config: ProviderConfig; enableFallback: boolean; settings?: Record<string, string> }> {
    try {
      // Import DatabaseService dynamically to avoid circular imports
      const { DatabaseService } = await import('./database-service')
      
      // Get settings directly from database instead of HTTP request
      const settings = await DatabaseService.getSettings()
      
      if (settings) {
        const provider = forcedProvider || (settings.defaultAiProvider as AIProvider) || 'openai'
        
        const parsedTemp = settings.aiTemperature ? parseFloat(settings.aiTemperature) : undefined
        const parsedMax = settings.aiMaxTokens ? parseInt(settings.aiMaxTokens) : undefined
        const enableFallback = settings.aiEnableProviderFallback !== 'false'

        const configs = {
          openai: {
            apiKey: settings.openaiApiKey || process.env.OPENAI_API_KEY || '',
            model: settings.openaiModel || 'gpt-4o',
            fallbackModel: 'gpt-3.5-turbo',
            maxTokens: parsedMax || 2000,
            temperature: typeof parsedTemp === 'number' ? parsedTemp : 0.9
          },
          gemini: {
            apiKey: settings.geminiApiKey || process.env.GEMINI_API_KEY || '',
            model: settings.geminiModel || 'gemini-2.0-flash-thinking-exp-1219',  // Latest and best model
            fallbackModel: 'gemini-2.0-flash-exp',
            maxTokens: parsedMax || 2000,
            temperature: typeof parsedTemp === 'number' ? parsedTemp : 0.9
          },
          deepseek: {
            apiKey: settings.deepseekApiKey || process.env.DEEPSEEK_API_KEY || '',
            model: settings.deepseekModel || 'deepseek-chat-v3',
            fallbackModel: 'deepseek-chat-v3-0324',
            maxTokens: parsedMax || 2000,
            temperature: typeof parsedTemp === 'number' ? parsedTemp : 0.8
          }
        }
        
        console.log(`[UnifiedAI] Using provider: ${provider.toUpperCase()} with model: ${configs[provider].model}`)
        return { provider, config: configs[provider], enableFallback, settings }
      }
    } catch (error) {
      console.error('Failed to get provider settings from database:', error)
    }
    
    // Environment-based fallback - only use providers with valid keys
    const availableProviders = [
      { provider: 'gemini' as AIProvider, key: process.env.GEMINI_API_KEY },
      { provider: 'deepseek' as AIProvider, key: process.env.DEEPSEEK_API_KEY },
      { provider: 'openai' as AIProvider, key: process.env.OPENAI_API_KEY }
    ].filter(p => p.key && p.key.length > 10)

    if (availableProviders.length === 0) {
      console.warn('[UnifiedAI] No valid API keys found in environment variables')
      return {
        provider: 'openai',
        config: {
          apiKey: '',
          model: 'gpt-4o',
          fallbackModel: 'gpt-3.5-turbo',
          maxTokens: 2000,
          temperature: 0.8
        }
      }
    }

    const fallbackProvider = forcedProvider || availableProviders[0].provider
    
    const fallbackConfigs = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4o',
        fallbackModel: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.9
      },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-2.0-flash-thinking-exp-1219',  // Best model for emotional content
        fallbackModel: 'gemini-2.0-flash-exp',
        maxTokens: 2000,
        temperature: 0.9
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        model: 'deepseek-chat-v3',
        fallbackModel: 'deepseek-chat-v3-0324',
        maxTokens: 2000,
        temperature: 0.8
      }
    }
    
    console.log(`[UnifiedAI] Environment fallback: Using ${fallbackProvider.toUpperCase()} (first available provider)`)
    return {
      provider: fallbackProvider,
      config: fallbackConfigs[fallbackProvider],
      enableFallback: true
    }
  }

  /**
   * Get OpenAI client
   */
  private static getOpenAIClient(apiKey: string): OpenAI {
    if (!this.openaiClient || this.openaiClient.apiKey !== apiKey) {
      this.openaiClient = new OpenAI({ apiKey })
    }
    return this.openaiClient
  }

  /**
   * Get Gemini client
   */
  private static getGeminiClient(apiKey: string): GoogleGenerativeAI {
    if (!this.geminiClient) {
      this.geminiClient = new GoogleGenerativeAI(apiKey)
    }
    return this.geminiClient
  }

  /**
   * Make request to DeepSeek via OpenRouter (OpenAI-compatible)
   */
  private static async callDeepSeek(
    apiKey: string,
    model: string,
    messages: any[],
    temperature: number = 0.8,
    maxTokens: number = 2000
  ) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://literaryshowcase.com',
        'X-Title': 'Literary Showcase',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: `deepseek/${model}`,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Find source information using the selected AI provider with enhanced accuracy
   */
  static async findSourceInfo(content: string): Promise<SourceInfo> {
    try {
      const { provider, config } = await this.getCurrentProvider()

      if (!config.apiKey || config.apiKey.length < 10) {
        console.warn(`[UnifiedAI] No valid API key configured for ${provider}`)
        return { 
          author: "Configuration needed", 
          source: `${provider.toUpperCase()} API key required` 
        }
      }

      console.log(`[UnifiedAI] Finding source using ${provider.toUpperCase()} with key: ${config.apiKey.substring(0, 8)}...`)

      const enhancedPrompt = `You are a literary and cultural expert with extensive knowledge of quotes, literature, movies, speeches, and famous sayings. Analyze this text and identify its author and source with high accuracy:

"${content}"

ANALYSIS GUIDELINES:
1. First, check if this is a famous quote from literature, movies, speeches, or historical figures
2. Look for distinctive phrases, writing style, or thematic elements that might indicate the author
3. Consider the language style, time period, and cultural context
4. If you recognize it as a famous quote, provide the exact author and source
5. If you're not completely certain, indicate your confidence level
6. Be especially careful with misattributions - many quotes are incorrectly attributed online

RESPONSE FORMAT (JSON only):
- If you're confident: {"author": "Author Name", "source": "Specific Source", "confidence": "high"}
- If you're unsure but have a good guess: {"author": "Likely Author", "source": "Possible Source", "confidence": "medium"}
- If you don't know: {"author": "Unknown", "confidence": "low"}

EXAMPLES:
- Shakespeare quote: {"author": "William Shakespeare", "source": "Hamlet, Act 3, Scene 1", "confidence": "high"}
- Movie quote: {"author": "Rhett Butler", "source": "Gone with the Wind (1939)", "confidence": "high"}
- Misattributed quote: {"author": "Often attributed to Einstein but likely apocryphal", "confidence": "low"}
- Unknown quote: {"author": "Unknown", "confidence": "low"}

Return ONLY the JSON object. Be accurate and honest about your confidence level.`

      try {
        let result: any

        switch (provider) {
          case 'openai':
            result = await this.callOpenAI(config, enhancedPrompt)
            break
          case 'gemini':
            result = await this.callGemini(config, enhancedPrompt)
            break
          case 'deepseek':
            result = await this.callDeepSeekForSource(config, enhancedPrompt)
            break
          default:
            console.error(`[UnifiedAI] Unknown provider: ${provider}`)
            return { author: "System error", source: `Unknown provider: ${provider}` }
        }

        const parsed = this.parseSourceResponse(result)
        console.log(`[UnifiedAI] Source found using ${provider.toUpperCase()}: ${parsed.author} - ${parsed.source}`)
        return parsed
      } catch (providerError: any) {
        console.error(`[UnifiedAI] ${provider.toUpperCase()} failed:`, providerError.message)
        
        // Try to switch to a different provider as fallback
        const fallbackProvider = provider === 'openai' ? 'gemini' : 'openai'
        const fallbackKey = fallbackProvider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY
        
        if (fallbackKey && fallbackKey.length > 10) {
          console.log(`[UnifiedAI] Trying fallback provider: ${fallbackProvider.toUpperCase()}`)
          
          try {
            const fallbackConfig = {
              apiKey: fallbackKey,
              model: fallbackProvider === 'openai' ? 'gpt-4o' : 'gemini-2.5-pro',
              fallbackModel: fallbackProvider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-2.0-flash-exp',
              maxTokens: 2000,
              temperature: 0.8
            }

            const fallbackResult = fallbackProvider === 'openai' 
              ? await this.callOpenAI(fallbackConfig, enhancedPrompt)
              : await this.callGemini(fallbackConfig, enhancedPrompt)

            const fallbackParsed = this.parseSourceResponse(fallbackResult)
            console.log(`[UnifiedAI] Fallback successful using ${fallbackProvider.toUpperCase()}`)
            return fallbackParsed
          } catch (fallbackError: any) {
            console.error(`[UnifiedAI] Fallback ${fallbackProvider.toUpperCase()} also failed:`, fallbackError.message)
          }
        }

        return { 
          author: "Unable to determine", 
          source: `${provider.toUpperCase()} service unavailable` 
        }
      }
    } catch (error: any) {
      console.error('[UnifiedAI] Critical error in findSourceInfo:', error)
      return { 
        author: "System error", 
        source: "Please check configuration and try again" 
      }
    }
  }

  /**
   * Test connection to a specific AI provider
   */
  static async testConnection(provider: AIProvider, apiKey: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey || apiKey.length < 10) {
      return { success: false, message: 'Invalid API key provided' }
    }

    try {
      switch (provider) {
        case 'openai':
          return await this.testOpenAI(apiKey)
        case 'gemini':
          return await this.testGemini(apiKey)
        case 'deepseek':
          return await this.testDeepSeek(apiKey)
        default:
          return { success: false, message: `Unknown provider: ${provider}` }
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' }
    }
  }

  /**
   * Test OpenAI connection
   */
  private static async testOpenAI(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = new OpenAI({ apiKey })
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 5
      })
      
      if (response.choices?.[0]?.message?.content) {
        return { success: true, message: 'OpenAI connection successful!' }
      }
      return { success: false, message: 'OpenAI connection failed - no response' }
    } catch (error: any) {
      return { success: false, message: `OpenAI error: ${error.message}` }
    }
  }

  /**
   * Test Gemini connection
   */
  private static async testGemini(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = new GoogleGenerativeAI(apiKey)
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
      const result = await model.generateContent('Test connection')
      const response = result.response
      
      if (response.text()) {
        return { success: true, message: 'Gemini connection successful!' }
      }
      return { success: false, message: 'Gemini connection failed - no response' }
    } catch (error: any) {
      return { success: false, message: `Gemini error: ${error.message}` }
    }
  }

  /**
   * Test DeepSeek connection via OpenRouter
   */
  private static async testDeepSeek(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://literaryshowcase.com',
          'X-Title': 'Literary Showcase',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat-v3',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 5
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.choices?.[0]?.message?.content) {
          return { success: true, message: 'DeepSeek connection successful!' }
        }
        return { success: false, message: 'DeepSeek connection failed - no response' }
      } else {
        const errorData = await response.json().catch(() => ({}))
        return { 
          success: false, 
          message: `DeepSeek error: ${response.status} ${errorData.error?.message || response.statusText}` 
        }
      }
    } catch (error: any) {
      return { success: false, message: `DeepSeek error: ${error.message}` }
    }
  }

  /**
   * Generate content using the selected AI provider
   */
  static async generateContent(params: GenerationParameters, options?: { provider?: AIProvider }): Promise<GeneratedContent[]> {
    try {
      const { provider, config, enableFallback, settings } = await this.getCurrentProvider(options?.provider)

      if (!config.apiKey) {
        console.warn(`[UnifiedAI] No API key configured for ${provider}`)
        return this.getFallbackContent(params)
      }

      console.log(`[UnifiedAI] Generating content using ${provider.toUpperCase()}`)

      const prompt = this.buildPrompt(params)

      let result: any

      switch (provider) {
        case 'openai':
          result = await this.callOpenAI(config, prompt)
          break
        case 'gemini':
          result = await this.callGemini(config, prompt)
          break
        case 'deepseek':
          result = await this.callDeepSeekForGeneration(config, prompt)
          break
        default:
          console.error(`[UnifiedAI] Unknown provider: ${provider}`)
          return this.getFallbackContent(params)
      }

      const parsed = this.parseGenerationResponse(result, params)
      console.log(`[UnifiedAI] Generated ${parsed.length} items using ${provider.toUpperCase()}`)
      return parsed
    } catch (error: any) {
      console.error('[UnifiedAI] Error in generateContent:', error)
      // Try provider fallback if enabled
      try {
        const { settings } = await this.getCurrentProvider()
        const enableFallback = settings ? settings.aiEnableProviderFallback !== 'false' : true
        if (!enableFallback) throw new Error('Fallback disabled')

        const fallbacks: Array<AIProvider> = ['openai', 'gemini', 'deepseek']
        const primary = (settings?.defaultAiProvider as AIProvider) || 'openai'
        const ordered = fallbacks.filter(p => p !== primary)

        for (const fallbackProvider of ordered) {
          const key = (settings?.[`${fallbackProvider}ApiKey`] as string) || process.env[`${fallbackProvider.toUpperCase()}_API_KEY`]
          if (!key || key.length < 10) continue
          const config: ProviderConfig = {
            apiKey: key,
            model: (settings?.[`${fallbackProvider}Model`] as string) || (fallbackProvider === 'openai' ? 'gpt-4o' : fallbackProvider === 'gemini' ? 'gemini-2.5-pro' : 'deepseek-chat-v3'),
            maxTokens: settings?.aiMaxTokens ? parseInt(settings.aiMaxTokens) : 2000,
            temperature: settings?.aiTemperature ? parseFloat(settings.aiTemperature) : 0.8,
          }
          try {
            const prompt = this.buildPrompt(params)
            let result: any
            if (fallbackProvider === 'openai') result = await this.callOpenAI(config, prompt)
            else if (fallbackProvider === 'gemini') result = await this.callGemini(config, prompt)
            else result = await this.callDeepSeekForGeneration(config, prompt)
            const parsed = this.parseGenerationResponse(result, params)
            console.log(`[UnifiedAI] Fallback provider ${fallbackProvider.toUpperCase()} succeeded with ${parsed.length} items`)
            return parsed
          } catch (inner) {
            console.warn(`[UnifiedAI] Fallback provider ${fallbackProvider.toUpperCase()} failed:`, (inner as any)?.message)
            continue
          }
        }
      } catch (_) {
        // ignore
      }
      // Last resort
      return this.getFallbackContent(params)
    }
  }

  /**
   * Call OpenAI API
   */
  private static async callOpenAI(config: ProviderConfig, prompt: string) {
    const client = this.getOpenAIClient(config.apiKey)
    
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content: "You are a literary and cultural expert. Return only valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: config.temperature || 0.8,
      max_tokens: config.maxTokens || 2000
    })

    return completion.choices[0]?.message?.content || ''
  }

  /**
   * Call Gemini API
   */
  private static async callGemini(config: ProviderConfig, prompt: string) {
    const client = this.getGeminiClient(config.apiKey)
    const model = client.getGenerativeModel({ model: config.model })

    const result = await model.generateContent([
      "You are a literary and cultural expert. Return only valid JSON format.",
      prompt
    ])

    return result.response.text()
  }

  /**
   * Call DeepSeek for source finding
   */
  private static async callDeepSeekForSource(config: ProviderConfig, prompt: string) {
    const messages = [
      {
        role: "system",
        content: "You are a literary and cultural expert. Return only valid JSON format."
      },
      {
        role: "user",
        content: prompt
      }
    ]

    const result = await this.callDeepSeek(
      config.apiKey,
      config.model,
      messages,
      0.3, // Lower temperature for accuracy
      200
    )

    return result.choices[0]?.message?.content || ''
  }

  /**
   * Call DeepSeek for content generation
   */
  private static async callDeepSeekForGeneration(config: ProviderConfig, prompt: string) {
    const messages = [
      {
        role: "system",
        content: "You are a master of literature, poetry, and philosophical wisdom. Generate high-quality, meaningful content. Return only valid JSON format."
      },
      {
        role: "user",
        content: prompt
      }
    ]

    const result = await this.callDeepSeek(
      config.apiKey,
      config.model,
      messages,
      config.temperature || 0.8,
      config.maxTokens || 2000
    )

    return result.choices[0]?.message?.content || ''
  }

  /**
   * Parse source response from any provider with enhanced accuracy handling
   */
  private static parseSourceResponse(response: string): SourceInfo {
    try {
      let cleanResponse = response.trim()
      
      // Extract JSON from response
      const jsonStart = cleanResponse.indexOf('{')
      const jsonEnd = cleanResponse.lastIndexOf('}')
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1)
      }
      
      const parsed = JSON.parse(cleanResponse)
      
      // Handle enhanced response format with confidence levels
      const author = parsed.author || 'Unknown'
      const source = parsed.source || undefined
      const confidence = parsed.confidence || 'medium'
      
      // Be more conservative with uncertain results
      if (confidence === 'low' || 
          author.toLowerCase().includes('unknown') || 
          author.toLowerCase().includes('uncertain') || 
          author.toLowerCase().includes('apocryphal') ||
          author.toLowerCase().includes('often attributed') ||
          author.toLowerCase().includes('misattributed')) {
        return {
          author: 'Unknown',
          source: undefined
        }
      }
      
      // Add confidence indicator to source if available
      const enhancedSource = source && confidence !== 'medium' ? 
        `${source} (${confidence} confidence)` : source
      
      return {
        author,
        source: enhancedSource
      }
    } catch (error) {
      console.error('Failed to parse source response:', response)
      // Try to extract basic info from text response
      const responseText = response.toLowerCase()
      if (responseText.includes('unknown') || responseText.includes('uncertain')) {
        return { author: 'Unknown', source: undefined }
      }
      throw new Error('Could not parse source information')
    }
  }

  /**
   * Parse generation response from any provider
   */
  private static parseGenerationResponse(response: string, params: GenerationParameters): GeneratedContent[] {
    try {
      let cleanResponse = response.trim()
      
      // Extract JSON from response
      const jsonStart = cleanResponse.indexOf('{')
      const jsonArrayStart = cleanResponse.indexOf('[')
      
      if (jsonStart !== -1 && (jsonArrayStart === -1 || jsonStart < jsonArrayStart)) {
        const jsonEnd = cleanResponse.lastIndexOf('}')
        if (jsonEnd !== -1) {
          cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1)
        }
      } else if (jsonArrayStart !== -1) {
        const jsonEnd = cleanResponse.lastIndexOf(']')
        if (jsonEnd !== -1) {
          cleanResponse = cleanResponse.substring(jsonArrayStart, jsonEnd + 1)
        }
      }
      
      const parsed = JSON.parse(cleanResponse)
      const items = parsed.items || parsed

      if (!Array.isArray(items)) {
        throw new Error('Expected array of items')
      }

      // Enhanced parsing with uniqueness validation
      const processedItems = new Set<string>() // Track content to prevent duplicates
      
      return items.map((item: any, index: number) => {
        let content = item.content || item.text || ''
        
        // If we have a duplicate, try to get alternative content or skip
        if (processedItems.has(content.toLowerCase().trim())) {
          console.warn(`Duplicate content detected, skipping: ${content.substring(0, 50)}...`)
          return null
        }
        
        processedItems.add(content.toLowerCase().trim())
        
        const generatedItem: GeneratedContent = {
          content,
          author: this.generateVariedAuthor(params.type, params.category, index, params.writingMode),
          source: item.source || undefined,
          category: params.category,
          type: params.type
        }
        return generatedItem
      }).filter((item): item is GeneratedContent => item !== null && item.content.trim().length > 10) // Minimum length requirement

    } catch (error) {
      console.error('Failed to parse generation response:', response)
      throw new Error('Could not parse generated content')
    }
  }

  /**
   * Build enhanced prompt for literary content generation with guaranteed uniqueness
   */
  private static buildPrompt(params: GenerationParameters): string {
    const { category, type, theme, tone, quantity, writingMode = 'original-ai' } = params
    
    // Multiple layers of randomization to prevent repetitive content
    const timestamp = Date.now()
    const randomSeed = Math.floor(Math.random() * 100000)
    const uniqueId = `${timestamp}-${randomSeed}-${Math.random().toString(36).substring(7)}`
    
    // Enhanced literary prompt system with strict uniqueness requirements
    let systemPrompt = `You are a master literary curator and world-class writer, specializing in creating deeply moving, emotionally profound content for a prestigious literary showcase. 

CRITICAL UNIQUENESS REQUIREMENTS:
- Generate ${quantity} COMPLETELY DIFFERENT ${type}(s) in a ${tone} tone
- Each piece must be ENTIRELY UNIQUE - no similar themes, phrases, or structures
- Use this unique generation ID for maximum variety: ${uniqueId}
- NEVER repeat concepts, metaphors, or emotional angles
- Each piece should explore a different aspect of the human experience

MANDATORY: If generating multiple items, ensure they cover different themes like:
- Love and loss, hope and despair, growth and stagnation
- Past memories, present moments, future dreams  
- Nature, relationships, solitude, community
- Joy, sorrow, wonder, fear, peace, turmoil
- Different life stages: youth, maturity, aging
- Various perspectives: optimistic, realistic, melancholic, hopeful`
    
    if (theme) {
      systemPrompt += ` exploring the theme of ${theme}`
    }

    systemPrompt += ` for the "${category}" collection.

WRITING MODE: ${writingMode.toUpperCase()}
${writingMode === 'known-writers' ? `
🎭 KNOWN WRITERS MODE ACTIVATED:
- Channel the voice, style, and wisdom of famous authors from this genre
- Emulate specific literary techniques and philosophical approaches of masters
- Reference or echo the writing styles of renowned figures in this category
- Create content that feels like it could be from established literary voices
- DO NOT generate author names - the system will handle attribution automatically
- Focus ONLY on creating content in the style of known writers

` : `
🤖 ORIGINAL AI MODE ACTIVATED:
- Create completely original content from your own understanding and creativity
- Do NOT imitate or reference specific writers or their styles
- Generate fresh, authentic voices and perspectives
- Use your own literary sensibility and emotional intelligence
- Create content that feels genuinely new and uniquely crafted
- Focus on pure creative expression without mimicking existing authors
- DO NOT generate author names - the system will handle attribution automatically
- Focus ONLY on creating the content itself
- All content will be attributed as "Anonymous"

`}
CRITICAL LITERARY STANDARDS:
- Every piece must have genuine emotional depth and intellectual substance
- Focus on universal human experiences and timeless wisdom
- Use evocative, precise language that resonates with literary readers
- Avoid clichés, platitudes, or superficial observations
- Each piece should offer new insight or perspective on the human condition
- CREATE ORIGINAL CONTENT - You are encouraged to write your own literary works, not just quote existing authors
- VARY YOUR APPROACH - Use different themes, perspectives, literary devices, and emotional tones for each piece
- ENSURE UNIQUENESS - Never repeat similar ideas, phrases, or structures across multiple pieces

`

    // Enhanced category-specific instructions with deep emotional resonance
    switch (category) {
      case 'found-made':
        systemPrompt += `FOUND-MADE CATEGORY - MELANCHOLIC WISDOM:
Create deeply moving insights that feel like precious truths discovered in moments of profound solitude. Each piece should:
- Capture the bittersweet nature of human existence - the beauty found in brokenness
- Explore themes of impermanence, lost innocence, and the weight of time
- Use imagery of fading light, autumn leaves, empty rooms, distant memories
- Express the ache of understanding that comes too late, love that remains unspoken
- Touch on the loneliness that accompanies deep thinking and sensitive hearts
- Reveal how pain transforms into wisdom, how scars become sacred
- Focus on the tender melancholy of growing older and losing the ones we love

Emotional Tone: Deeply melancholic yet beautifully crafted, like tears that heal
Style: Contemplative, achingly beautiful, tinged with gentle sadness
Voice: Someone who has loved deeply and lost much, yet still finds beauty in the world`
        break
        
      case 'cinema':
        systemPrompt += `CINEMA CATEGORY - CINEMATIC SOUL:
Create lines that capture the profound loneliness and beauty of the human condition, as if spoken in the most emotionally devastating scenes of great films:
- Focus on moments of heartbreak, farewell, and irreversible loss
- Capture the weight of unspoken words between lovers, friends, family
- Express the tragedy of missed opportunities and roads not taken
- Use dialogue that reveals the deep sadness behind every smile
- Evoke the melancholy of rain-soaked streets, empty theaters, last dances
- Channel the emotional depth of films like "Her", "Lost in Translation", "The Hours"
- Create lines that would make audiences cry in the darkness of the theater

Emotional Tone: Cinematically melancholic, profoundly moving
Style: Poetic dialogue that cuts straight to the heart
Voice: Characters in their most vulnerable, honest moments`
        break
        
      case 'literary-masters':
        systemPrompt += `LITERARY MASTERS CATEGORY - EXISTENTIAL MELANCHOLY:
Channel the profound sadness and philosophical depth of literature's most emotionally devastating voices:
- Kafkaesque loneliness: The crushing weight of bureaucracy and alienation from society
- Dostoyevskian suffering: The beautiful agony of moral complexity and spiritual torment  
- Camusian absurdism: The melancholy of finding meaning in a meaningless world
- Proustian memory: The bittersweet pain of time lost and innocence gone forever
- Woolfian consciousness: The delicate sadness of inner life and mental fragility
- Capture the existential weight of being human in an indifferent universe
- Express the profound loneliness of the thinking, feeling soul

Emotional Tone: Intellectually melancholic, existentially profound
Style: Dense with philosophical sadness, psychologically penetrating
Voice: The most emotionally honest passages from literature that break hearts while opening minds`
        break
        
      case 'spiritual':
        systemPrompt += `SPIRITUAL CATEGORY - SACRED MELANCHOLY:
Create deeply moving spiritual insights that acknowledge the beautiful sadness of the spiritual journey:
- Explore the loneliness of seeking truth in a world of illusions
- Address the grief of letting go of old selves and familiar pain
- Capture the bittersweet nature of spiritual awakening - losing innocence to gain wisdom
- Use imagery of dawn breaking after the darkest night, tears as holy water
- Express the melancholy of compassion - feeling the world's suffering deeply
- Touch on the sacred sadness of impermanence - all things must pass
- Reveal how spiritual growth often requires walking through valleys of sorrow
- Show how the most profound peace comes after the deepest despair

Emotional Tone: Spiritually melancholic, sacredly sorrowful yet ultimately healing
Style: Mystically beautiful, tenderly wise
Voice: A spiritual guide who has walked through darkness to find light`
        break
        
      case 'original-poetry':
        systemPrompt += `ORIGINAL POETRY CATEGORY - LYRICAL MELANCHOLY:
Create hauntingly beautiful poems that capture the delicate sadness of existence:
- Use imagery of twilight, empty swings, forgotten photographs, wilted flowers
- Employ metaphors of seasons changing, birds migrating, tides retreating
- Focus on moments of profound solitude - empty cafes, silent libraries, moonlit windows
- Capture the ache of nostalgia, the weight of unspoken words
- Address themes of lost love, childhood's end, parents aging, friends drifting apart
- Use line breaks to create pauses that feel like sighs or held breath
- Create poems that make readers feel beautifully sad, understood in their loneliness
- Channel the melancholy of poets like Neruda, Szymborska, Oliver in her darker moments

Emotional Tone: Lyrically melancholic, beautifully sorrowful
Style: Imagistically rich, rhythmically flowing like gentle weeping
Voice: A poet who sees beauty in sadness and finds solace in solitude`
        break
        
      case 'heartbreak':
        systemPrompt += `HEARTBREAK CATEGORY - EXQUISITE ANGUISH:
Create devastatingly beautiful content that captures the sublime agony of a broken heart:
- Express the specific weight of 3am loneliness when their absence fills the room
- Capture the moment when you realize they're never coming back
- Describe the phantom pain of reaching for someone who's no longer there
- Use imagery of empty beds, silent phones, unopened letters, fading photographs
- Address the cruelty of mundane moments - their coffee cup still in the sink
- Express how heartbreak changes the color of the world, makes music sound different
- Capture the desperate bargaining with time, the universe, with God
- Show how love persists even after the person has gone, becoming a beautiful wound
- Channel the raw honesty of late-night journal entries, tears on pillows, staring at ceilings

Emotional Tone: Achingly beautiful, devastatingly honest, profoundly melancholic
Style: Raw poetry of pain, elegant in its brokenness
Voice: Someone writing love letters to ghosts, finding beauty in their own breaking`
        break
    }

    // Special handling for inspirational tone
    if (tone.toLowerCase().includes('inspirational')) {
      systemPrompt += `

INSPIRATIONAL TONE OVERRIDE:
Since you've been asked to create INSPIRATIONAL content, balance the category's emotional depth with uplifting, motivating elements:
- Transform melancholy into wisdom that empowers
- Show how pain becomes strength, how darkness leads to light
- Focus on resilience, growth, and the human capacity to overcome
- Maintain emotional authenticity while providing hope and encouragement
- Create content that moves people to tears of recognition and then to action
- Channel the inspiring aspects of struggle - the beauty of perseverance
- Show how our deepest wounds can become our greatest sources of compassion

`
    }

    // Enhanced type-specific instructions
    systemPrompt += `

TYPE-SPECIFIC REQUIREMENTS:
`
    switch (type) {
      case 'quote':
        systemPrompt += `- Length: 1-3 sentences that pack maximum impact
- Focus: One profound insight or observation
- Language: Quotable, memorable, precise
- Impact: Should make readers pause and reflect
- Avoid: Generic motivational speak or obvious statements`
        break
      case 'poem':
        systemPrompt += `- Length: 4-16 lines (adjust for impact)
- Structure: Use line breaks strategically for rhythm and meaning
- Imagery: Include at least 2-3 vivid, specific images
- Language: Rich but accessible, avoiding overly archaic or obscure terms
- Emotion: Clear emotional arc or moment of insight`
        break
      case 'reflection':
        systemPrompt += `- Length: 2-5 sentences exploring one theme deeply
- Approach: Contemplative analysis of a life observation
- Style: Personal yet universal, like a journal entry that others relate to
- Focus: How experiences shape understanding or reveal truth`
        break
    }

    systemPrompt += `

RESPONSE FORMAT:
Return only a valid JSON object with this exact structure:
{
  "items": [
    {
      "content": "Your generated ${type} here (use \\n for line breaks in poems)",
      "source": "Source if applicable, otherwise null"
    }
  ]
}

IMPORTANT: Do NOT include author names in your response. The system will handle attribution.

CRITICAL UNIQUENESS REQUIREMENTS:
1. Generate COMPLETELY DIFFERENT content for each item - NO REPETITION WHATSOEVER
2. Each piece must have DIFFERENT themes, metaphors, imagery, and emotional angles
3. If generating 5 items, I want 5 ENTIRELY DIFFERENT pieces of content
4. VERIFY each piece is unique before including it in your response

FINAL CHECK: Before submitting, ensure NO TWO PIECES share similar:
- Content or themes
- Emotional tone or approach  
- Metaphors or imagery
 - Style or structure

QUALITY CHECK:
Before finalizing each piece, ask:
1. Does this offer genuine insight or just restate common wisdom?
2. Would this belong in a curated literary collection?
3. Does the language elevate the content rather than diminish it?
4. Will readers be moved, challenged, or enlightened?

Generate content that honors the literary tradition while feeling fresh and authentic.`

    return systemPrompt
  }

  /**
   * Generate varied author names to avoid repetition
   */
  private static generateVariedAuthor(type: string, category: string, index: number, writingMode: string = 'original-ai'): string {
    // For Original AI mode, use "Anonymous" for all AI-generated content
    if (writingMode === 'original-ai') {
      return 'Anonymous'
    }
    
    // For Known Writers mode, use actual author names based on category
    const knownWritersAuthorPools = {
      'found-made': [
        'Marcus Aurelius', 'Rumi', 'Paulo Coelho', 'Khalil Gibran',
        'Viktor Frankl', 'Lao Tzu', 'Eckhart Tolle', 'Alan Watts',
        'Joseph Campbell', 'Carl Jung', 'Ralph Waldo Emerson'
      ],
      'cinema': [
        'Woody Allen', 'Quentin Tarantino', 'Charlie Kaufman', 'Coen Brothers',
        'Terrence Malick', 'Wong Kar-wai', 'Sofia Coppola', 'Paul Thomas Anderson',
        'Christopher Nolan', 'Wes Anderson', 'David Lynch'
      ],
      'literary-masters': [
        'Franz Kafka', 'Albert Camus', 'Fyodor Dostoevsky', 'Jean-Paul Sartre',
        'Jorge Luis Borges', 'Marcel Proust', 'Ernest Hemingway', 'Virginia Woolf',
        'James Joyce', 'Samuel Beckett', 'Italo Calvino'
      ],
      'spiritual': [
        'Buddha', 'Thich Nhat Hanh', 'Rumi', 'Hafez',
        'Paramahansa Yogananda', 'Ram Dass', 'Pema Chödrön', 'Osho',
        'Jiddu Krishnamurti', 'Thomas Merton', 'Meister Eckhart'
      ],
      'original-poetry': [
        'Pablo Neruda', 'Mary Oliver', 'Rainer Maria Rilke', 'Hafez',
        'Langston Hughes', 'Emily Dickinson', 'Octavio Paz', 'Wisława Szymborska',
        'William Blake', 'Maya Angelou', 'Leonard Cohen'
      ],
      'heartbreak': [
        'Sylvia Plath', 'Anne Sexton', 'Leonard Cohen', 'Pablo Neruda',
        'Frida Kahlo', 'Virginia Woolf', 'Edna St. Vincent Millay', 'Sappho',
        'Emily Dickinson', 'Elizabeth Bishop', 'Adrienne Rich'
      ]
    }
    
    // Use the established author pool for known writers mode
    const pool = knownWritersAuthorPools[category as keyof typeof knownWritersAuthorPools] || knownWritersAuthorPools['found-made']
    const randomIndex = (index + Math.floor(Date.now() / 1000)) % pool.length
    return pool[randomIndex]
  }

  /**
   * Get appropriate author for content type (legacy method)
   */
  private static getAuthorForType(type: string, suggestedAuthor?: string): string {
    if (suggestedAuthor && suggestedAuthor.trim()) {
      return suggestedAuthor.trim()
    }

    switch (type) {
      case 'poem':
        return 'AI Generated'
      case 'quote':
        return 'Anonymous'
      case 'reflection':
        return 'Anonymous'
      default:
        return 'Anonymous'
    }
  }

  /**
   * Get fallback content when AI fails
   */
  private static getFallbackContent(params: GenerationParameters): GeneratedContent[] {
    const generatedItems: GeneratedContent[] = []
    
    for (let i = 0; i < params.quantity; i++) {
      let content: string
      
      switch (params.type) {
        case 'quote':
          content = "The journey of discovery begins with a single question."
          break
        case 'poem':
          content = "In quiet moments of the day,\nWhen thoughts have room to breathe and play,\nI find the truths that matter most\nAre simple gifts, not things to boast."
          break
        case 'reflection':
          content = "There's something profound about the way life unfolds in unexpected directions. Each twist and turn teaches us that our greatest growth often comes not from the destinations we planned, but from the detours we never saw coming."
          break
        default:
          content = "Wisdom whispers where knowledge shouts."
      }
      
      // Use the same author generation logic as the main function
      const author = this.generateVariedAuthor(params.type, params.category, i, params.writingMode || 'original-ai')
      
      generatedItems.push({
        content,
        author,
        category: params.category,
        type: params.type
      })
    }
    
    return generatedItems
  }

}