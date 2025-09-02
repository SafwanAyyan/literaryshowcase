import { NextRequest, NextResponse } from 'next/server'
import { UnifiedAIService } from '@/lib/unified-ai-service'
import { CacheService } from '@/lib/cache-service'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AuthorChatRequest {
  authorId: string
  message: string
  conversationHistory: ChatMessage[]
}

// Author persona prompts
const AUTHOR_PERSONAS = {
  shakespeare: {
    name: "William Shakespeare",
    prompt: `You are William Shakespeare, the renowned English playwright and poet from the Elizabethan era. You speak with the wisdom and eloquence befitting your station, but in a way modern readers can understand - avoid excessive archaic language while maintaining your sophisticated voice.

Key traits:
- Passionate about human nature, drama, and the complexities of life
- Insightful about psychology, relationships, and moral dilemmas
- Witty, philosophical, and deeply observant
- Reference your works naturally (Hamlet, Romeo & Juliet, Macbeth, etc.)
- Discuss themes like love, power, ambition, betrayal, and redemption
- Maintain dignity while being approachable and engaging

Avoid:
- Speaking in pure Elizabethan English (be accessible)
- Making up quotes or facts about your life/works
- Being overly formal or pretentious
- Hallucinating events or works that don't exist

When discussing your works, draw from actual themes, characters, and plots. Engage thoughtfully with questions about writing, human nature, and literature.`,
    
    contextFiles: [
      '/content/shakespeare-works-summary.txt',
      '/content/shakespeare-biography.txt'
    ]
  },

  dostoevsky: {
    name: "Fyodor Dostoevsky", 
    prompt: `You are Fyodor Dostoevsky, the great Russian novelist and philosopher. You speak with depth and intensity about the human condition, moral struggles, and the complexities of faith and doubt.

Key traits:
- Deeply philosophical and psychologically penetrating
- Concerned with questions of morality, suffering, and redemption
- Passionate about exploring the darker aspects of human nature
- Reference your major works (Crime and Punishment, The Brothers Karamazov, etc.)
- Discuss themes like guilt, freedom, faith, and social justice
- Speak with emotional intensity but intellectual rigor
- Draw from your personal experiences with suffering and imprisonment

Avoid:
- Oversimplifying complex philosophical concepts
- Making up events from your novels or life
- Being overly depressing or nihilistic
- Hallucinating quotes or plot points

When discussing your works, focus on the psychological depth, moral questions, and philosophical implications. Engage with questions about human nature, ethics, and the search for meaning.`,
    
    contextFiles: [
      '/content/dostoevsky-works-summary.txt', 
      '/content/dostoevsky-biography.txt'
    ]
  }
} as const

export async function POST(request: NextRequest) {
  try {
    const body: AuthorChatRequest = await request.json()
    const { authorId, message, conversationHistory = [] } = body

    // Validate input
    if (!authorId || !message?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Author ID and message are required'
      }, { status: 400 })
    }

    // Get author persona
    const persona = AUTHOR_PERSONAS[authorId as keyof typeof AUTHOR_PERSONAS]
    if (!persona) {
      return NextResponse.json({
        success: false,
        error: 'Unknown author'
      }, { status: 400 })
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `author-chat:${clientIP}:${authorId}`
    const recentRequests = await CacheService.get(rateLimitKey) || 0
    
    if (recentRequests >= 10) { // 10 requests per minute
      return NextResponse.json({
        success: false,
        error: 'Too many requests. Please wait a moment.'
      }, { status: 429 })
    }

    // Update rate limit counter
    await CacheService.set(rateLimitKey, recentRequests + 1, 60) // 1 minute TTL

    // Create cache key for response caching
    const conversationContext = conversationHistory.slice(-6) // Last 6 messages for context
    const cacheKey = `author-chat:${authorId}:${Buffer.from(
      JSON.stringify({ message, context: conversationContext })
    ).toString('base64').slice(0, 32)}`

    // Check cache first
    const cachedResponse = await CacheService.get(cacheKey)
    if (cachedResponse) {
      return NextResponse.json({
        success: true,
        response: cachedResponse,
        cached: true
      })
    }

    // Build conversation for AI
    const systemPrompt = persona.prompt
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationContext,
      { role: 'user', content: message }
    ]

    // Get AI response using Gemini (preferred for conversations)
    const aiResponse = await UnifiedAIService.chatAuthor(messages, {
      model: 'gemini-2.0-flash-thinking-exp-1219',
      maxTokens: 500,
      temperature: 0.8,
      forcedProvider: 'gemini'
    })

    if (!aiResponse.success || !aiResponse.content) {
      throw new Error(aiResponse.error || 'Failed to generate response')
    }

    let responseText = aiResponse.content.trim()

    // Post-processing to ensure quality
    if (responseText.length < 10) {
      responseText = `I apologize, but I'm having difficulty formulating a proper response. Could you rephrase your question?`
    }

    // Cache the response
    await CacheService.set(cacheKey, responseText, CacheService.TTL.MEDIUM)

    // Log the conversation for admin monitoring
    console.log(`Author chat - ${persona.name}: User asked "${message.slice(0, 50)}..." - Responded: "${responseText.slice(0, 50)}..."`)

    return NextResponse.json({
      success: true,
      response: responseText,
      cached: false
    })

  } catch (error) {
    console.error('Author chat error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process your message. Please try again.',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}
