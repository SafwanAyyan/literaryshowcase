import OpenAI from 'openai'
import type { Category } from '@/types/literary'
import { openai as openaiConfig } from './config'

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

export class OpenAIService {
  private static client: OpenAI | null = null

  private static getClient(): OpenAI {
    if (!this.client) {
      if (!openaiConfig.apiKey) {
        throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.')
      }
      this.client = new OpenAI({ apiKey: openaiConfig.apiKey })
    }
    return this.client
  }

  static async generateContent(params: GenerationParameters): Promise<GeneratedContent[]> {
    try {
      const client = this.getClient()
      const prompt = this.buildPrompt(params)

      const completion = await client.chat.completions.create({
        model: openaiConfig.model,
        messages: [
          {
            role: "system",
            content: "You are a master of literature, poetry, and philosophical wisdom. Generate high-quality, meaningful content that resonates with readers. Always return valid JSON format only, with no additional text before or after the JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: openaiConfig.temperature,
        max_tokens: openaiConfig.maxTokens
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      let parsedResponse
      try {
        // Try to extract JSON from the response if it's wrapped in other text
        let cleanResponse = response.trim()
        
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
        console.error('Failed to parse OpenAI response:', response)
        console.error('Parse error:', parseError)
        throw new Error('Invalid JSON response from OpenAI')
      }

      const items = parsedResponse.items || parsedResponse
      if (!Array.isArray(items)) {
        throw new Error('Expected array of items from OpenAI')
      }

      return items.map((item: any) => ({
        content: item.content || item.text || '',
        author: this.getAuthorForType(params.type, item.author, params.writingMode),
        source: item.source || undefined,
        category: params.category,
        type: params.type
      })).filter(item => item.content.trim().length > 0)

    } catch (error) {
      console.error('Error generating content with OpenAI:', error)
      
      // Return fallback content for demo purposes
      return this.getFallbackContent(params)
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
    }`

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

  // Enhanced fallback content for when AI APIs are not available
  private static getFallbackContent(params: GenerationParameters): GeneratedContent[] {
    // Generate the requested quantity with varied content
    const generatedItems: GeneratedContent[] = []
    
    for (let i = 0; i < params.quantity; i++) {
      let content: string
      
      switch (params.type) {
        case 'quote':
          content = this.generateFallbackQuote(params.theme, params.tone, i)
          break
        case 'poem':
          content = this.generateFallbackPoem(params.theme, params.tone, i)
          break
        case 'reflection':
          content = this.generateFallbackReflection(params.theme, params.tone, i)
          break
        default:
          content = this.generateFallbackQuote(params.theme, params.tone, i)
      }
      
      // Use the same author generation logic as the main function
      const author = this.getAuthorForType(params.type, undefined, params.writingMode || 'original-ai')
      
      generatedItems.push({
        content,
        author,
        category: params.category,
        type: params.type
      })
    }
    
    return generatedItems
  }

  private static generateFallbackQuote(theme: string, tone: string, index: number): string {
    const baseQuotes = [
      "The journey of discovery begins with a single question.",
      "In every ending, there lies the seed of a new beginning.",
      "Courage is not the absence of fear, but action in spite of it.",
      "The strongest hearts are forged in the fires of adversity.",
      "Wisdom whispers where knowledge shouts.",
      "Time heals, but memories make the healing worthwhile.",
      "The depth of your struggle determines the height of your growth.",
      "Every sunset promises a new dawn.",
      "In silence, we find the answers that noise cannot provide.",
      "The art of living is finding beauty in ordinary moments."
    ]
    
    const themeVariations = theme ? [
      `In the realm of ${theme}, `,
      `When contemplating ${theme}, `,
      `The essence of ${theme} teaches us that `,
      `Through ${theme}, we learn that `,
      `${theme} reminds us that `
    ] : [""]
    
    const base = baseQuotes[index % baseQuotes.length]
    const variation = themeVariations[index % themeVariations.length]
    
    return variation + base.toLowerCase()
  }

  private static generateFallbackPoem(theme: string, tone: string, index: number): string {
    const poemTemplates = [
      "In quiet moments of the day,\nWhen thoughts have room to breathe and play,\nI find the truths that matter most\nAre simple gifts, not things to boast.",
      
      "Beneath the vast and starlit sky,\nWhere dreams and wishes learn to fly,\nEach moment holds a sacred space\nFor hope to show its gentle face.",
      
      "The river flows, the seasons turn,\nWith every step, we live and learn,\nThat beauty lives in simple things—\nThe joy that each new morning brings.",
      
      "In gardens where the heart can grow,\nWhere love and kindness gently flow,\nWe plant the seeds of who we are\nAnd tend them like a guiding star.",
      
      "When shadows fall and light grows dim,\nAnd courage feels forever slim,\nRemember that the darkest night\nAlways yields to morning light."
    ]
    
    return poemTemplates[index % poemTemplates.length]
  }

  private static generateFallbackReflection(theme: string, tone: string, index: number): string {
    const reflections = [
      "There's something profound about the way life unfolds in unexpected directions. Each twist and turn teaches us that our greatest growth often comes not from the destinations we planned, but from the detours we never saw coming.",
      
      "In the quiet spaces between our thoughts, wisdom waits patiently. It doesn't announce itself with fanfare or demand immediate attention. Instead, it whispers gentle truths that only become clear when we're ready to receive them.",
      
      "The art of living well isn't about having all the answers—it's about remaining curious enough to keep asking the right questions. Every experience, whether joyful or challenging, becomes a teacher when we approach it with an open heart.",
      
      "Sometimes the most powerful transformations happen in the smallest moments. A kind word, a shared smile, a moment of genuine connection—these seemingly insignificant interactions often carry the power to change everything.",
      
      "We spend so much time looking ahead or behind that we forget the only moment we truly possess is this one. In learning to be present, we discover that life isn't happening to us—it's happening through us."
    ]
    
    return reflections[index % reflections.length]
  }

  // Test API connection
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const client = this.getClient()
      
      const completion = await client.chat.completions.create({
        model: openaiConfig.fallbackModel,
        messages: [{ role: "user", content: "Say 'OpenAI connection successful'" }],
        max_tokens: 10
      })

      const response = completion.choices[0]?.message?.content
      
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
      
      const prompt = `Analyze this text and identify its author and source:

"${content}"

Please provide the author's name and the source (book, movie, speech, etc.) if known. If you're not certain, indicate so. Return your response in JSON format with "author" and "source" fields. If the source is unknown, omit the source field.

Examples:
- For a Shakespeare quote: {"author": "William Shakespeare", "source": "Hamlet"}
- For an unknown quote: {"author": "Unknown"}
- For a movie quote: {"author": "Character Name", "source": "Movie Title"}

Be accurate and only provide information you're confident about.`

      const completion = await client.chat.completions.create({
        model: openaiConfig.model,
        messages: [
          {
            role: "system",
            content: "You are a literary and cultural expert. Identify the author and source of quotes accurately. Return only valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more accurate results
        max_tokens: 200
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
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
      console.error("Error finding source info with OpenAI:", error)
      throw new Error(`Error finding source information: ${error.message}`)
    }
  }
}