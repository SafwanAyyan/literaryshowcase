import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from './config'
import type { Category } from '@/types/literary'

interface GenerationParameters {
  category: Category
  type: "quote" | "poem" | "reflection"
  theme?: string
  tone: string
  quantity: number
  writingMode?: 'known-writers' | 'original-ai'
}

interface GeneratedContent {
  content: string
  author: string
  source?: string
  category: Category
  type: "quote" | "poem" | "reflection"
}

const geminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  // Use widely-available stable models
  model: 'gemini-1.5-flash',
  proModel: 'gemini-1.5-pro',
  fallbackModel: 'gemini-1.5-flash',
  temperature: 0.8,
  maxOutputTokens: 2000,
}

export class GeminiService {
  private static client: GoogleGenerativeAI | null = null

  private static getClient(): GoogleGenerativeAI {
    if (!this.client) {
      if (!geminiConfig.apiKey) {
        throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your environment variables.')
      }
      this.client = new GoogleGenerativeAI(geminiConfig.apiKey)
    }
    return this.client
  }

  static async generateContent(params: GenerationParameters): Promise<GeneratedContent[]> {
    try {
      const client = this.getClient()
      const model = client.getGenerativeModel({ 
        model: geminiConfig.model,
        generationConfig: {
          temperature: geminiConfig.temperature,
          maxOutputTokens: geminiConfig.maxOutputTokens,
        }
      })
      
      const prompt = this.buildPrompt(params)

      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      if (!text) {
        throw new Error('No response from Gemini')
      }

      let parsedResponse
      try {
        // Try to extract JSON from the response if it's wrapped in other text
        let cleanResponse = text.trim()
        
        // Look for JSON object/array in the response
        const jsonStart = cleanResponse.indexOf('{')
        const jsonArrayStart = cleanResponse.indexOf('[')
        
        if (jsonStart !== -1 && (jsonArrayStart === -1 || jsonStart < jsonArrayStart)) {
          // JSON object found
          const jsonEnd = cleanResponse.lastIndexOf('}')
          if (jsonEnd !== -1) {
            cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1)
          }
        } else if (jsonArrayStart !== -1) {
          // JSON array found
          const jsonEnd = cleanResponse.lastIndexOf(']')
          if (jsonEnd !== -1) {
            cleanResponse = cleanResponse.substring(jsonArrayStart, jsonEnd + 1)
          }
        }
        
        parsedResponse = JSON.parse(cleanResponse)
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', text)
        console.error('Parse error:', parseError)
        throw new Error('Invalid JSON response from Gemini')
      }

      const items = parsedResponse.items || parsedResponse
      if (!Array.isArray(items)) {
        throw new Error('Expected array of items from Gemini')
      }

      return items.map((item: any) => ({
        content: item.content || item.text || '',
        author: this.getAuthorForType(params.type, item.author, params.writingMode),
        source: item.source || undefined,
        category: params.category,
        type: params.type
      })).filter(item => item.content.trim().length > 0)

    } catch (error) {
      console.error('Error generating content with Gemini:', error)
      throw error // Re-throw to allow fallback handling in the API route
    }
  }

  /**
   * Freeform explanation helper for a given text and question.
   */
  static async explainText(content: string, question: string): Promise<string> {
    const client = this.getClient()
    const model = client.getGenerativeModel({
      model: geminiConfig.model,
      generationConfig: { temperature: 0.5, maxOutputTokens: 600 },
    })

    const prompt = `You are a helpful literary assistant. Provide a concise, clear explanation in 4-8 sentences. Avoid spoilers when possible.

Writing:\n"""\n${content}\n"""\n
Question: ${question || 'Explain this in simple terms.'}`

    const result = await model.generateContent(prompt)
    const response = result.response?.text?.() || ''
    return (typeof response === 'string' && response.trim().length > 0) ? response.trim() : 'No explanation available.'
  }

  /**
   * Deep literary analysis using Gemini 2.5 Pro.
   * Returns structured JSON with themes, devices, metaphors, tone, style, imagery and summary.
   */
  static async analyzeLiterary(content: string, meta?: { author?: string; category?: string; type?: string; source?: string }) {
    const client = this.getClient()

    const makePrompt = () => {
      const context = [
        meta?.category ? `Category: ${meta.category}` : null,
        meta?.type ? `Type: ${meta.type}` : null,
        meta?.author ? `Author: ${meta.author}` : null,
        meta?.source ? `Source: ${meta.source}` : null,
      ].filter(Boolean).join('\n')

      return `You are a literary analyst. Analyze the writing and produce structured JSON.
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
    }

    const parseJson = (raw: string) => {
      let body = (raw || '').trim()
      // strip code fences if any
      body = body.replace(/^```(json)?/i, '').replace(/```$/i, '').trim()
      // try to find first JSON object
      const start = body.indexOf('{')
      const end = body.lastIndexOf('}')
      if (start >= 0 && end > start) body = body.slice(start, end + 1)
      const obj = JSON.parse(body)
      return obj
    }

    const normalize = (obj: any) => {
      const safeArray = (v: any) => Array.isArray(v) ? v : []
      const safeString = (v: any) => typeof v === 'string' ? v : ''
      const limited = {
        themes: safeArray(obj.themes).slice(0, 6),
        literaryDevices: safeArray(obj.literaryDevices).slice(0, 8).map((d: any) => ({
          name: safeString(d?.name).slice(0, 80),
          quote: safeString(d?.quote).slice(0, 140) || undefined,
          explanation: safeString(d?.explanation).slice(0, 280),
        })),
        metaphors: safeArray(obj.metaphors).slice(0, 6),
        tone: safeString(obj.tone).slice(0, 60),
        style: safeString(obj.style).slice(0, 80),
        imagery: safeArray(obj.imagery).slice(0, 10),
        summary: safeString(obj.summary).slice(0, 800),
      }
      return limited
    }

    const tryOnce = async (modelName: string) => {
      const model = client.getGenerativeModel({ model: modelName })
      const schema = {
        type: 'object',
        properties: {
          themes: { type: 'array', items: { type: 'string' } },
          literaryDevices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quote: { type: 'string' },
                explanation: { type: 'string' },
              },
            },
          },
          metaphors: { type: 'array', items: { type: 'string' } },
          tone: { type: 'string' },
          style: { type: 'string' },
          imagery: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' },
        },
      } as any

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: makePrompt() }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1100,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      } as any)

      const text = typeof result.response?.text === 'function' ? result.response.text() : ''
      const obj = parseJson(text)
      return normalize(obj)
    }

    // Primary attempt
    let analysis: any
    try {
      analysis = await tryOnce(geminiConfig.proModel)
    } catch (e1) {
      try {
        analysis = await tryOnce(geminiConfig.model) // cheaper/stable
      } catch (e2) {
        try {
          analysis = await tryOnce(geminiConfig.fallbackModel)
        } catch {
          analysis = null
        }
      }
    }

    // Gap-filling for any missing fields using small targeted calls with strict schemas
    const ensureList = async (label: string, minItems: number, itemLabel: string): Promise<string[]> => {
      try {
        const model = client.getGenerativeModel({ model: geminiConfig.model }) // cheaper model for fillers
        const schema: any = { type: 'array', items: { type: 'string' } }
        const prompt = `List ${minItems}-${Math.max(minItems + 3, 5)} concise ${label} found in the text. Return JSON array of ${itemLabel} only, no explanations.`
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nTEXT:\n"""\n${content}\n"""` }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.3, maxOutputTokens: 220 },
        } as any)
        const text = typeof result.response?.text === 'function' ? result.response.text() : '[]'
        try { return JSON.parse(text) } catch { return [] }
      } catch {
        return []
      }
    }

    const ensureDevices = async (): Promise<any[]> => {
      try {
        const model = client.getGenerativeModel({ model: geminiConfig.model })
        const schema: any = {
          type: 'array',
          items: { type: 'object', properties: { name: { type: 'string' }, quote: { type: 'string' }, explanation: { type: 'string' } } }
        }
        const prompt = `Extract 2-6 literary devices present in the text. For each, return {name, optional quote from the text, and a one-sentence explanation}. Return JSON array only.`
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nTEXT:\n"""\n${content}\n"""` }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.35, maxOutputTokens: 380 },
        } as any)
        const text = typeof result.response?.text === 'function' ? result.response.text() : '[]'
        try { return JSON.parse(text) } catch { return [] }
      } catch {
        return []
      }
    }

    if (!analysis) {
      const summary = await this.explainText(content, 'Summarize the key themes, devices, tone, style, and imagery in 3-5 sentences.')
      analysis = normalize({ themes: [], literaryDevices: [], metaphors: [], tone: '', style: '', imagery: [], summary })
    }

    // Fill missing fields
    if (!analysis.metaphors || analysis.metaphors.length === 0) {
      const metaphors = await ensureList('metaphors or metaphorical phrases', 3, 'strings')
      analysis.metaphors = metaphors.slice(0, 6)
    }
    if (!analysis.imagery || analysis.imagery.length === 0) {
      const imagery = await ensureList('key images or sensory details', 3, 'short phrases')
      analysis.imagery = imagery.slice(0, 8)
    }
    if (!analysis.literaryDevices || analysis.literaryDevices.length === 0) {
      const devices = await ensureDevices()
      analysis.literaryDevices = normalize({ literaryDevices: devices } as any).literaryDevices
    }
    if (!analysis.tone || analysis.tone.trim().length === 0) {
      const tones = await ensureList('tones', 1, 'tone words')
      analysis.tone = tones[0] || ''
    }
    if (!analysis.style || analysis.style.trim().length === 0) {
      const styles = await ensureList('style descriptors (e.g., minimal, lyrical)', 1, 'style words')
      analysis.style = styles[0] || ''
    }
    if (!analysis.summary || analysis.summary.trim().length === 0) {
      analysis.summary = await this.explainText(content, 'Provide a 3-5 sentence literary summary emphasizing themes, devices, tone, and imagery.')
    }

    return analysis
  }

  /**
   * Classify content into site categories and type using a stable model.
   */
  static async classifyContent(content: string): Promise<{ category: string; type: 'quote'|'poem'|'reflection' }> {
    const client = this.getClient()
    const model = client.getGenerativeModel({ model: geminiConfig.proModel })
    const schema: any = {
      type: 'object',
      properties: {
        category: { type: 'string' },
        type: { type: 'string' },
      },
    }
    const categories = [
      'found-made',
      'cinema',
      'literary-masters',
      'spiritual',
      'original-poetry',
      'heartbreak',
    ]
    const prompt = `Classify the following text for a literary site. Choose a category from this exact list: ${categories.join(', ')}. Choose a type from: quote, poem, reflection.
Return JSON only with keys: category, type.
TEXT:\n"""\n${content}\n"""`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2, maxOutputTokens: 150 },
    } as any)
    const text = typeof result.response?.text === 'function' ? result.response.text() : ''
    try {
      const obj = JSON.parse((text || '').trim())
      const cat = categories.includes(obj.category) ? obj.category : 'found-made'
      const typ = (['quote','poem','reflection'] as const).includes(obj.type) ? obj.type : 'quote'
      return { category: cat, type: typ as any }
    } catch {
      return { category: 'found-made', type: 'quote' }
    }
  }

  private static buildPrompt(params: GenerationParameters): string {
    const { category, type, theme, tone, quantity } = params
    
    let basePrompt = `Generate ${quantity} high-quality ${type}s in a ${tone} tone`
    
    if (theme) {
      basePrompt += ` about ${theme}`
    }

    basePrompt += ` for the "${category}" category. `

    // Category-specific instructions
    switch (category) {
      case 'found-made':
        basePrompt += 'These should be profound, thought-provoking insights about life, relationships, and human nature. Focus on universal truths and wisdom.'
        break
      case 'cinema':
        basePrompt += 'These should be memorable lines from movies, TV shows, or characters. Include the character name and source.'
        break
      case 'literary-masters':
        basePrompt += 'These should be in the style of great authors like Kafka, Dostoevsky, Camus, etc. Deep, philosophical, and literary.'
        break
      case 'spiritual':
        basePrompt += 'These should offer spiritual wisdom, peace, and guidance. Include religious or spiritual context where appropriate.'
        break
      case 'original-poetry':
        basePrompt += 'These should be original poems with emotional depth, vivid imagery, and meaningful themes.'
        break
    }

    // Type-specific instructions
    switch (type) {
      case 'quote':
        basePrompt += ' Each quote should be 1-3 sentences long and deeply meaningful.'
        break
      case 'poem':
        basePrompt += ' Each poem should be 4-12 lines long with proper line breaks and poetic structure.'
        break
      case 'reflection':
        basePrompt += ' Each reflection should be 2-4 sentences that offer deep insights or contemplation.'
        break
    }

    basePrompt += `\n\nReturn a JSON object with an "items" array. Each item should have:
    - "content": the ${type} text (use \\n for line breaks in poems)
    - "author": appropriate author name
    - "source": source if applicable (optional)

    Example format:
    {
      "items": [
        {
          "content": "Your generated content here",
          "author": "Author Name",
          "source": "Source if applicable"
        }
      ]
    }

    IMPORTANT: Return ONLY the JSON object, no additional text before or after.`

    return basePrompt
  }

  private static getAuthorForType(type: string, suggestedAuthor?: string, writingMode: string = 'original-ai'): string {
    // For Original AI mode, use "Anonymous" for all AI-generated content
    if (writingMode === 'original-ai') {
      return 'Anonymous'
    }
    
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

  // Test API connection
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const client = this.getClient()
      const model = client.getGenerativeModel({ model: geminiConfig.fallbackModel })
      
      const result = await model.generateContent("Say 'Gemini connection successful'")
      const response = result.response.text()
      
      return {
        success: response?.includes('successful') || false,
        message: response || 'No response received'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Unknown error occurred'
      }
    }
  }

  /**
   * Find source information (author and source) for a given quote or text
   */
  static async findSourceInfo(content: string): Promise<{ author: string; source?: string }> {
    try {
      const client = this.getClient()
      const model = client.getGenerativeModel({ 
        model: geminiConfig.model,
        generationConfig: {
          temperature: 0.3, // Lower temperature for more accurate results
          maxOutputTokens: 200
        }
      })
      
      const prompt = `Analyze this text and identify its author and source:

"${content}"

Please provide the author's name and the source (book, movie, speech, etc.) if known. If you're not certain, indicate so. Return your response in JSON format with "author" and "source" fields. If the source is unknown, omit the source field.

Examples:
- For a Shakespeare quote: {"author": "William Shakespeare", "source": "Hamlet"}
- For an unknown quote: {"author": "Unknown"}
- For a movie quote: {"author": "Character Name", "source": "Movie Title"}

Be accurate and only provide information you're confident about. Return ONLY the JSON object.`

      const result = await model.generateContent(prompt)
      const response = result.response.text()

      if (!response) {
        throw new Error('No response from Gemini')
      }

      // Extract JSON from response
      let parsedResponse
      try {
        let cleanResponse = response.trim()
        
        // Look for JSON object in the response
        const jsonStart = cleanResponse.indexOf('{')
        const jsonEnd = cleanResponse.lastIndexOf('}')
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1)
        }
        
        parsedResponse = JSON.parse(cleanResponse)
      } catch (parseError) {
        console.error('Failed to parse source lookup response:', response)
        throw new Error('Could not parse source information')
      }

      return {
        author: parsedResponse.author || 'Unknown',
        source: parsedResponse.source || undefined
      }
    } catch (error: any) {
      console.error("Error finding source info with Gemini:", error)
      throw new Error(`Error finding source information: ${error.message}`)
    }
  }
}