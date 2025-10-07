import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const ExportSchema = z.object({
  collection: z.object({
    name: z.string(),
    description: z.string().optional(),
    items: z.array(z.object({
      id: z.string(),
      content: z.string(),
      author: z.string(),
      source: z.string().optional(),
      category: z.string(),
      type: z.string().optional(),
    })),
  }),
  format: z.enum(['text', 'markdown'])
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = ExportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const { collection, format } = parsed.data
    
    let content = ''
    let filename = ''
    let mimeType = ''

    if (format === 'text') {
      // Plain text format with clean, professional styling
      const divider = '━'.repeat(80)
      const thinDivider = '─'.repeat(80)
      
      content = `╔${'═'.repeat(78)}╗\n`
      content += `║${collection.name.toUpperCase().padStart((78 + collection.name.length) / 2).padEnd(78)}║\n`
      content += `╚${'═'.repeat(78)}╝\n\n`
      
      if (collection.description) {
        content += `${collection.description}\n\n`
      }

      content += `Total Items: ${collection.items.length}\n`
      content += `Generated: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}\n\n`
      content += `${divider}\n\n`

      collection.items.forEach((item, index) => {
        content += `[${index + 1}]\n\n`
        content += `${item.content}\n\n`
        content += `    Author: ${item.author}\n`
        if (item.source) {
          content += `    Source: ${item.source}\n`
        }
        content += `    Category: ${item.category}\n`
        content += `\n${thinDivider}\n\n`
      })

      content += `${divider}\n`
      content += `Literary Showcase Collection\n`
      content += `${process.env.NEXTAUTH_URL || 'https://literaryshowcase.com'}\n`
      
      // Sanitize filename: replace non-alphanumeric with underscore, collapse multiple underscores
      const sanitizedName = collection.name
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()
      filename = `${sanitizedName || 'collection'}.txt`
      mimeType = 'text/plain; charset=utf-8'
    } else {
      // Markdown format with beautiful styling
      content = `# ${collection.name}\n\n`
      
      if (collection.description) {
        content += `> ${collection.description}\n\n`
      }

      content += `---\n\n`
      content += `**Total Items:** ${collection.items.length}  \n`
      content += `**Generated:** ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}\n\n`
      content += `---\n\n`

      collection.items.forEach((item, index) => {
        content += `## ${index + 1}. ${item.category.charAt(0).toUpperCase() + item.category.slice(1).replace(/-/g, ' ')}\n\n`
        content += `> ${item.content}\n\n`
        content += `**Author:** ${item.author}  \n`
        if (item.source) {
          content += `**Source:** *${item.source}*  \n`
        }
        if (item.type) {
          content += `**Type:** ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}\n`
        }
        content += `\n`
        content += `---\n\n`
      })

      content += `<div align="center">\n\n`
      content += `*Collection created with Literary Showcase*  \n`
      content += `[Visit Literary Showcase](${process.env.NEXTAUTH_URL || 'https://literaryshowcase.com'})\n\n`
      content += `</div>\n`
      
      // Sanitize filename: replace non-alphanumeric with underscore, collapse multiple underscores
      const sanitizedName = collection.name
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()
      filename = `${sanitizedName || 'collection'}.md`
      mimeType = 'text/markdown; charset=utf-8'
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting collection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export collection' },
      { status: 500 }
    )
  }
}
