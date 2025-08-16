import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Category } from '@/types/literary'
import { CategoryPromptOverrides, getCategoryOverride } from '@/lib/prompt-overrides'

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
  private static async getCurrentProvider(forcedProvider?: AIProvider, useCase?: 'generate' | 'findSource' | 'explain' | 'analyze'): Promise<{ provider: AIProvider; config: ProviderConfig; enableFallback: boolean; settings?: Record<string, string> }> {
    try {
      // Import DatabaseService dynamically to avoid circular imports
      const { DatabaseService } = await import('./database-service')
      
      // Get settings directly from database instead of HTTP request
      const settings = await DatabaseService.getSettings()
      
      if (settings) {
        // Per-use-case provider override
        const providerOverride =
          useCase === 'generate' ? (settings.aiGenerateProvider as AIProvider) :
          useCase === 'findSource' ? (settings.aiFindSourceProvider as AIProvider) :
          useCase === 'explain' ? (settings.aiExplainProvider as AIProvider) :
          undefined

        const provider = forcedProvider || providerOverride || (settings.defaultAiProvider as AIProvider) || 'openai'
        
        const parsedTemp = settings.aiTemperature ? parseFloat(settings.aiTemperature) : undefined
        const parsedMax = settings.aiMaxTokens ? parseInt(settings.aiMaxTokens) : undefined
        const enableFallback = settings.aiEnableProviderFallback !== 'false'

        // Per-use-case model overrides
        const openaiModelOverride = (useCase === 'generate' ? settings.aiGenerateModel : (useCase === 'findSource' ? settings.aiFindSourceModel : undefined)) || settings.openaiModel
        const geminiModelOverride = (useCase === 'generate' ? settings.aiGenerateModel : (useCase === 'findSource' ? settings.aiFindSourceModel : undefined)) || settings.geminiModel
        const deepseekModelOverride = (useCase === 'generate' ? settings.aiGenerateModel : (useCase === 'findSource' ? settings.aiFindSourceModel : undefined)) || settings.deepseekModel

        const configs = {
          openai: {
            apiKey: settings.openaiApiKey || process.env.OPENAI_API_KEY || '',
            model: openaiModelOverride || 'gpt-4o',
            fallbackModel: 'gpt-3.5-turbo',
            maxTokens: parsedMax || 2000,
            temperature: typeof parsedTemp === 'number' ? parsedTemp : 0.9
          },
          gemini: {
            apiKey: settings.geminiApiKey || process.env.GEMINI_API_KEY || '',
            model: geminiModelOverride || 'gemini-2.0-flash-thinking-exp-1219',  // Latest and best model
            fallbackModel: 'gemini-2.0-flash-exp',
            maxTokens: parsedMax || 2000,
            temperature: typeof parsedTemp === 'number' ? parsedTemp : 0.9
          },
          deepseek: {
            apiKey: settings.deepseekApiKey || process.env.DEEPSEEK_API_KEY || '',
            model: deepseekModelOverride || 'deepseek-chat-v3',
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
        },
        enableFallback: true
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
 * Expose active provider and resolved model for a given use case.
 * Useful for cache keying and metrics without duplicating selection logic.
 */
static async getActiveModel(
  useCase?: 'generate' | 'findSource' | 'explain' | 'analyze'
): Promise<{ provider: AIProvider; model: string }> {
  const { provider, config, settings } = await this.getCurrentProvider(undefined, useCase)
  const override =
    useCase === 'explain'
      ? settings?.aiExplainModel
      : useCase === 'analyze'
      ? settings?.aiAnalyzeModel
      : undefined
  return { provider, model: (override || config.model) as string }
}

/**
 * Load system/base prompt for a use case from configuration store.
 * Falls back to sensible defaults if none are configured.
 */
private static async getSystemPrompt(useCase: 'explain' | 'analyze'): Promise<string> {
  try {
    const { PromptService } = await import('./prompt-service')
    const configured = await PromptService.getActivePrompt(useCase as any)
    if (configured && configured.trim().length > 0) return configured.trim()
  } catch {
    // ignore; fall back to inline defaults
  }
  if (useCase === 'explain') {
    return 'You are a helpful literary assistant. Provide a concise, faithful explanation that clearly answers the meaning behind each metaphor and how it supports the work’s themes. Structure responses with: Quoted metaphor, Meaning (emphasize), Context, and Theme connections with brief evidence. Keep total length reasonable.'
  }
  // analyze
  return 'You are a precise literary analyst. Return only valid JSON and keep sections concise while faithful to the text.'
}
/**
   * Extended system prompt loader that also supports 'generate' and 'findSource'.
   * It first checks PromptService for an active prompt; if absent, returns opinionated defaults.
   * Tokens supported in stored prompts: {{category}}, {{type}}, {{theme}}, {{tone}}, {{quantity}}, {{writingMode}}
   */
  private static async getSystemPromptExtended(
    useCase: 'explain' | 'analyze' | 'generate' | 'findSource'
  ): Promise<string> {
    try {
      const { PromptService } = await import('./prompt-service')
      const configured = await PromptService.getActivePrompt(useCase as any)
      if (configured && configured.trim().length > 0) return configured.trim()
    } catch {
      // ignore and fall through to defaults
    }

    if (useCase === 'explain') {
      return 'You are a helpful literary assistant. Provide a concise, faithful explanation that clearly answers the meaning behind each metaphor and how it supports the work’s themes. Structure responses with: Quoted metaphor, Meaning (emphasize), Context, and Theme connections with brief evidence. Keep total length reasonable.'
    }
    if (useCase === 'analyze') {
      return 'You are a precise literary analyst. Return only valid JSON and keep sections concise while faithful to the text.'
    }
    if (useCase === 'findSource') {
      return [
        'You are a literary and cultural expert with extensive knowledge of quotes, literature, movies, speeches, and famous sayings.',
        'Analyze the provided text and identify its likely author and source with high accuracy. Be conservative with uncertain attributions.',
        'Return ONLY JSON with keys: author, source?, confidence ("high" | "medium" | "low").',
        'Prefer "Unknown" with low confidence when unsure; avoid propagating misattributions.'
      ].join('\n')
    }
    // generate
    return [
      'You are a master curator and writer for a prestigious literary showcase.',
      'Write with emotional depth, freshness, and authentic human cadence.',
      'Variables: {{category}}, {{type}}, {{theme}}, {{tone}}, {{quantity}}, {{writingMode}}.',
      'Requirements:',
      '- Diversity: every item must be different in imagery, structure, and angle.',
      '- Human cadence: vary sentence length, avoid filler phrases and overused words.',
      '- No author names in content.',
      'Response: ONLY JSON of shape {"items":[{"content":"...","source":null}]}.',
    ].join('\n')
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
   * Explain helper using selected provider with optional model override (settings.aiExplainModel)
   */
  static async explainText(
    content: string,
    question: string,
    options?: { systemPromptOverride?: string }
  ): Promise<string> {
    const { provider, config, settings } = await this.getCurrentProvider(undefined, 'explain')
    const modelOverride = settings?.aiExplainModel
    const sys = (options?.systemPromptOverride ?? (await this.getSystemPrompt('explain'))).trim()

    if (provider === 'gemini') {
      const client = this.getGeminiClient(config.apiKey)
      const model = client.getGenerativeModel({ model: modelOverride || config.model })
      const result = await model.generateContent([
        sys,
        `Writing:\n"""\n${content}\n"""`,
        `Question: ${question || 'Explain this in simple terms.'}`
      ])
      const text = typeof result.response?.text === 'function' ? result.response.text() : ''
      return (text || '').toString().trim() || 'No explanation available.'
    }

    if (provider === 'openai') {
      const client = this.getOpenAIClient(config.apiKey)
      const completion = await client.chat.completions.create({
        model: modelOverride || config.model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: `Writing:\n"""\n${content}\n"""\nQuestion: ${question || 'Explain this in simple terms.'}` }
        ],
        max_tokens: 600,
        temperature: 0.5
      })
      return completion.choices[0]?.message?.content?.trim() || 'No explanation available.'
    }

    // DeepSeek via OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://literaryshowcase.com',
        'X-Title': 'Literary Showcase',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: `deepseek/${modelOverride || config.model}`,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: `Writing:\n"""\n${content}\n"""\nQuestion: ${question || 'Explain this in simple terms.'}` }
        ],
        max_tokens: 600,
        temperature: 0.5
      })
    })
    if (!response.ok) return 'No explanation available.'
    const data = await response.json().catch(() => null)
    const text = data?.choices?.[0]?.message?.content || ''
    return (text || '').trim() || 'No explanation available.'
  }

  /**
   * Deep literary analysis (structured JSON) using selected provider.
   */
  static async analyzeText(
    content: string,
    meta?: { author?: string; category?: string; type?: string; source?: string },
    options?: { systemPromptOverride?: string }
  ) {
    const { provider, config, settings } = await this.getCurrentProvider(undefined, 'analyze')
    const modelOverride = settings?.aiAnalyzeModel
    const sys = (options?.systemPromptOverride ?? (await this.getSystemPrompt('analyze'))).trim()

    // Helper to normalize structure
    const normalize = (obj: any) => {
      const asArray = (v: any) => Array.isArray(v) ? v : []
      const asString = (v: any) => typeof v === 'string' ? v : ''
      return {
        themes: asArray(obj.themes).slice(0, 6),
        literaryDevices: asArray(obj.literaryDevices).slice(0, 8).map((d: any) => ({
          name: asString(d?.name).slice(0, 80),
          quote: asString(d?.quote).slice(0, 140) || undefined,
          explanation: asString(d?.explanation).slice(0, 280),
        })),
        metaphors: asArray(obj.metaphors).slice(0, 6),
        tone: asString(obj.tone).slice(0, 60),
        style: asString(obj.style).slice(0, 80),
        imagery: asArray(obj.imagery).slice(0, 10),
        summary: asString(obj.summary).slice(0, 800),
      }
    }

    // Provider-specific
    if (provider === 'gemini') {
      const { GeminiService } = await import('./gemini-service')
      return await GeminiService.analyzeLiterary(content, meta, { systemPromptOverride: sys })
    }

    const schemaPrompt = (context: string) => `You are a literary analyst. Analyze the writing and return ONLY valid JSON with this exact schema:
{
  "themes": string[] (3-6 concise core themes),
  "literaryDevices": Array<{ "name": string; "quote"?: string; "explanation": string }>,
  "metaphors": string[] (2-6 short metaphors/paraphrases),
  "tone": string,
  "style": string,
  "imagery": string[] (key images as short phrases),
  "summary": string (3-5 sentences)
}

${context}

TEXT:\n"""\n${content}\n"""`

    const context = [
      meta?.category ? `Category: ${meta.category}` : null,
      meta?.type ? `Type: ${meta.type}` : null,
      meta?.author ? `Author: ${meta.author}` : null,
      meta?.source ? `Source: ${meta.source}` : null,
    ].filter(Boolean).join('\n')

    // OpenAI path
    if (provider === 'openai') {
      const client = this.getOpenAIClient(config.apiKey)
      const completion = await client.chat.completions.create({
        model: modelOverride || config.model,
        messages: [
          { role: 'system', content: `${sys} Return only valid JSON.` },
          { role: 'user', content: schemaPrompt(context) }
        ],
        temperature: 0.4,
        max_tokens: 1200
      })
      const raw = completion.choices[0]?.message?.content || ''
      try {
        const start = raw.indexOf('{'); const end = raw.lastIndexOf('}')
        const body = start >= 0 && end > start ? raw.slice(start, end + 1) : raw
        return normalize(JSON.parse(body))
      } catch {
        return normalize({})
      }
    }

    // DeepSeek (OpenRouter)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://literaryshowcase.com',
        'X-Title': 'Literary Showcase',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: `deepseek/${modelOverride || config.model}`,
        messages: [
          { role: 'system', content: `${sys} Return only valid JSON.` },
          { role: 'user', content: schemaPrompt(context) }
        ],
        temperature: 0.4,
        max_tokens: 1200
      })
    })
    const data = response.ok ? await response.json().catch(() => null) : null
    const raw = data?.choices?.[0]?.message?.content || ''
    try {
      const start = raw.indexOf('{'); const end = raw.lastIndexOf('}')
      const body = start >= 0 && end > start ? raw.slice(start, end + 1) : raw
      return normalize(JSON.parse(body))
    } catch {
      return normalize({})
    }
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
      const { provider, config } = await this.getCurrentProvider(undefined, 'findSource')

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
   * Compose the exact generation prompt (no model call). Useful for UI preview.
   */
  static async composeGenerationPrompt(params: GenerationParameters): Promise<string> {
    const basePrompt = await this.getSystemPromptExtended('generate').catch(() => '')
    const overrideText =
      await getCategoryOverride(params.category as any).catch(() => (CategoryPromptOverrides as any)[params.category] || '')
    return this.buildPrompt(params, basePrompt, overrideText)
  }

  /**
    * Generate content using the selected AI provider
    */
   static async generateContent(params: GenerationParameters, options?: { provider?: AIProvider }): Promise<GeneratedContent[]> {
    try {
      const { provider, config, enableFallback, settings } = await this.getCurrentProvider(options?.provider, 'generate')
      // Apply explain/analyze overrides when invoked from public explain endpoint

      if (!config.apiKey) {
        console.warn(`[UnifiedAI] No API key configured for ${provider}`)
        return this.getFallbackContent(params)
      }

      console.log(`[UnifiedAI] Generating content using ${provider.toUpperCase()}`)
 
      const basePrompt = await this.getSystemPromptExtended('generate').catch(() => '')
      const overrideText =
        await getCategoryOverride(params.category as any).catch(() => (CategoryPromptOverrides as any)[params.category] || '')
      const prompt = this.buildPrompt(params, basePrompt, overrideText)

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
            const basePrompt = await this.getSystemPromptExtended('generate').catch(() => '')
            const overrideText =
              await getCategoryOverride(params.category as any).catch(() => (CategoryPromptOverrides as any)[params.category] || '')
            const prompt = this.buildPrompt(params, basePrompt, overrideText)
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
   * Build enhanced prompt for literary content generation with guaranteed uniqueness.
   * Optionally prepends an admin-configured base prompt (supports tokens) and category override text.
   */
  private static buildPrompt(params: GenerationParameters, basePrompt?: string, overrideText?: string): string {
    const { category, type, theme, tone, quantity, writingMode = 'original-ai' } = params

    // Token replacer for optional base prompt
    const tokenize = (s: string) =>
      (s || '')
        .replaceAll('{{category}}', String(category))
        .replaceAll('{{type}}', String(type))
        .replaceAll('{{theme}}', String(theme ?? 'general'))
        .replaceAll('{{tone}}', String(tone))
        .replaceAll('{{quantity}}', String(quantity))
        .replaceAll('{{writingMode}}', String(writingMode))

    // Multiple layers of randomization to prevent repetitive content
    const timestamp = Date.now()
    const randomSeed = Math.floor(Math.random() * 100000)
    const uniqueId = `${timestamp}-${randomSeed}-${Math.random().toString(36).substring(7)}`

    let systemPrompt = ''
    if (basePrompt && basePrompt.trim().length > 0) {
      systemPrompt += tokenize(basePrompt.trim()) + '\n\n'
    }
 
    // If an admin base prompt already carries strong guidance, add a compact
    // constraint layer to avoid over-constraining the model and lowering quality.
    const compact = (basePrompt?.trim().length || 0) > 600
 
    // Core generation template with strict uniqueness and human cadence constraints
    systemPrompt += compact
      ? `Compose ${quantity} distinct ${type}(s) in a ${tone} tone for "${category}".
- Theme: ${theme || 'general'} | Mode: ${writingMode.toUpperCase()} | Seed: ${uniqueId}
- Human cadence: vary rhythm, use concrete images, avoid clichés and stock advice.
- Guarantee uniqueness across items (ideas, metaphors, structure, phrasing).`
      : `You are a master literary curator and world-class writer, specializing in creating deeply moving, emotionally profound content for a prestigious literary showcase.
 
GENERATION CONTEXT:
- Collection: "${category}"
- Type: ${type}
- Theme: ${theme || 'general'}
- Tone: ${tone}
- Writing Mode: ${writingMode.toUpperCase()}
- Quantity: ${quantity}
- Uniqueness-Seed: ${uniqueId}
 
HUMAN CADENCE REQUIREMENTS:
- Vary sentence length and rhythm; avoid repetitive cadence.
- Limit intensifiers/adverbs; prefer concrete imagery over abstractions.
- Avoid cliché and generic motivational language (e.g., "unlock your potential", "embrace the journey", "follow your dreams").
- Prefer specificity: tangible details, sensory images, precise verbs.
 
UNIQUENESS GUARANTEES:
- ${quantity} COMPLETELY DIFFERENT ${type}(s) in a ${tone} tone.
- No recycling of metaphors, structures, or phrasing across items.
- Each item must explore a distinct angle, image system, or emotional stance.`

    if (theme) {
      systemPrompt += `\n- Honor the requested theme: ${theme}.`
    }

    systemPrompt += `
 
 WRITING MODE RULES:
 ${writingMode === 'known-writers'
   ? compact
     ? `- Emulate general techniques of renowned authors without naming or quoting.`
     : `- Emulate the general techniques of renowned authors in this genre without naming or directly quoting them.
- Mirror high-level stylistic traits (syntax, pacing, imagery strategies) without imitation of specific passages.`
   : compact
     ? `- Produce wholly original work; do not imitate or reference specific authors or lines.`
     : `- Produce wholly original work from your own understanding and creativity.
- Do not imitate, reference, or hint at specific authors or famous lines.`}
- Do NOT include author names in content; attribution is handled separately.

CATEGORY GUIDANCE:`

    switch (category) {
      case 'found-made':
        systemPrompt += `
- Bittersweet insights about impermanence, memory, and time’s quiet edits.
- Imagery: fading light, rooms after departures, worn objects, long shadows.`
        break
      case 'cinema':
        systemPrompt += `
- Lines that feel like pivotal dialogue from intimate films; restrained, devastating, precise.
- Imagery: rain-lit streets, afterglow in empty theaters, a last look before the door closes.`
        break
      case 'literary-masters':
        systemPrompt += `
- Existential clarity with emotional gravity; philosophical yet vivid.
- Evoke themes of alienation, moral struggle, and the ache of consciousness.`
        break
      case 'spiritual':
        systemPrompt += `
- Sacred melancholy; the tenderness of awakening and letting go.
- Imagery: dawn after the longest night, holy water of tears, silence as teacher.`
        break
      case 'original-poetry':
        systemPrompt += `
- Lyrical, image-driven, line breaks that breathe meaning.
- Avoid ornamentation for its own sake; pursue clarity that wounds and heals.`
        break
      case 'heartbreak':
        systemPrompt += `
 - Exquisite honesty about loss; the world recolored by absence.
 - Imagery: unreturned messages, a cup left in the sink, the phone that won’t light up.`
        break
    }

    // Optional category-specific override (editable via config/prompt-overrides.json)
    if (overrideText && overrideText.trim().length > 0) {
      systemPrompt += `

CATEGORY OVERRIDE:
${overrideText.trim()}
`
    }
 
    if (tone.toLowerCase().includes('inspirational')) {
      systemPrompt += compact
        ? `\nTONE (Inspirational): Earn uplift; transform pain into clarity and agency; avoid sermon.`
        : `
TONE OVERRIDE (Inspirational):
- Balance depth with earned uplift; transform pain into lucid strength.
- Prefer verbs of agency; show resilience without sermon or cliché.`
    }

    systemPrompt += `

TYPE-SPECIFIC REQUIREMENTS:`
    switch (type) {
      case 'quote':
        systemPrompt += compact
          ? `\n- 1–3 sentences; one precise insight; no hashtags/emojis/self‑help tone.`
          : `\n- 1–3 sentences; quotable and precise; one core insight.\n- No hashtags, emojis, or imperative self-help phrasing.`
        break
      case 'poem':
        systemPrompt += compact
          ? `\n- 4–16 lines (use \\n); ≥2 concrete images; allow a subtle turn.`
          : `\n- 4–16 lines; use \\n for line breaks.\n- At least 2–3 concrete images; allow a subtle turn or reveal.`
        break
      case 'reflection':
        systemPrompt += compact
          ? `\n- 2–5 sentences; contemplative; show thinking, not slogans.`
          : `\n- 2–5 sentences; contemplative, universal yet intimate.\n- Show thinking on the page rather than conclusions alone.`
        break
    }

    systemPrompt += `

OUTPUT FORMAT (JSON ONLY):
{
  "items": [
    { "content": "Generated ${type} text here (use \\n for poem line breaks)", "source": null }
  ]
}

FINAL SAFETY/QUALITY CHECK:
- Remove stock phrases and repetition across items.
- Ensure each item stands alone with distinct imagery and angle.
- Keep language natural; avoid obvious AI tells.`

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