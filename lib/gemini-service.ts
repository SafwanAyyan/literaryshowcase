import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from './config'
import type { Category, GenerationParameters } from '@/types/literary'

interface GeneratedContent {
  content: string
  author: string
  source?: string
  category: Category
  type: "quote" | "poem" | "reflection"
}

const geminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  model: 'gemini-2.0-flash-exp', // Latest Gemini 2.0 model
  fallbackModel: 'gemini-1.5-pro',
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
        author: this.getAuthorForType(params.type, item.author),
        source: item.source || undefined,
        category: params.category,
        type: params.type
      })).filter(item => item.content.trim().length > 0)

    } catch (error) {
      console.error('Error generating content with Gemini:', error)
      throw error // Re-throw to allow fallback handling in the API route
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