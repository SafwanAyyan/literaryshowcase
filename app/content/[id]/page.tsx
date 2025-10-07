import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PoemDisplay } from '@/components/poem-display'
import { ArrowLeft, Heart, Eye } from 'lucide-react'
import { ContentDetailClient } from '@/components/content-detail-client'

async function getContentItem(id: string) {
  const item = await prisma.contentItem.findUnique({ where: { id } })
  if (!item || !item.published) return null
  return item
}

export default async function ContentDetail({ params }: { params: { id: string } }) {
  const item = await getContentItem(params.id)
  if (!item) return notFound()

  // server-trigger view count once when page is loaded (cookie will prevent repeats)
  // Note: cannot call our own route on the server; counting is done client-side for accuracy

  const isPoem = item.type === 'poem'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-gray-300 hover:text-white inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-4 text-gray-300">
            <span className="inline-flex items-center gap-1"><Eye className="w-4 h-4" /> {item.views}</span>
            <span className="inline-flex items-center gap-1"><Heart className="w-4 h-4" /> {item.likes}</span>
          </div>
        </div>

        <div className="rounded-2xl p-[1.5px] bg-gradient-to-br from-white/10 via-purple-500/20 to-transparent">
          <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10">
          <div className="mb-3 text-sm text-gray-400">
            <span className="px-2 py-1 rounded bg-white/5 border border-white/10 mr-2">{item.category}</span>
            <span className="italic">{item.source || 'Unknown source'}</span>
          </div>

          {isPoem ? (
            <PoemDisplay content={item.content} title={item.source || ''} author={item.author} isExpanded />
          ) : (
            <blockquote className="text-gray-100 leading-relaxed font-medium text-lg whitespace-pre-line">{item.content}</blockquote>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="text-gray-300">— {item.author}</div>
            <ContentDetailClient id={item.id} content={item.content} author={item.author} category={item.category} source={item.source || undefined} type={item.type} variant="like-only" />
          </div>
          </div>
        </div>

        <div className="mt-10">
          <ContentDetailClient id={item.id} content={item.content} author={item.author} category={item.category} source={item.source || undefined} type={item.type} variant="ai-only" />
        </div>
      </div>
    </div>
  )
}

