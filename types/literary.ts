export type Category = "found-made" | "cinema" | "literary-masters" | "spiritual" | "original-poetry" | "heartbreak"

export interface ContentItem {
  id: string
  content: string
  author: string
  source?: string
  category: Category
  type: "quote" | "poem" | "reflection"
  tags?: string[]
}

export type AIDraftStatus =
  | 'pending'
  | 'in_review'
  | 'needs_revision'
  | 'approved'

export interface AIDraftItem {
  id: string
  content: string
  author: string
  source?: string
  category: Category
  type: "quote" | "poem" | "reflection"
  tags: string[]
  status: AIDraftStatus
  theme?: string | null
  tone?: string | null
  writingMode?: 'known-writers' | 'original-ai'
  prompt?: string | null
  provider?: string | null
  model?: string | null
  reviewNotes?: string | null
  createdAt: string
  updatedAt: string
  createdBy?: string | null
  createdByName?: string | null
  reviewedBy?: string | null
  reviewedByName?: string | null
  publishedBy?: string | null
  publishedByName?: string | null
  publishedAt?: string | null
  history?: DraftEvent[]
}

export interface DraftEvent {
  id: string
  action: string
  actorId?: string | null
  actorName?: string | null
  payload?: Record<string, any> | null
  createdAt: string
}

// Sorting options for public listings
export type OrderByOption =
  | 'newest'
  | 'oldest'
  | 'author-asc'
  | 'author-desc'
  | 'likes'
  | 'views'
