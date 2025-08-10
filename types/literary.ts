export type Category = "found-made" | "cinema" | "literary-masters" | "spiritual" | "original-poetry" | "heartbreak"

export interface ContentItem {
  id: string
  content: string
  author: string
  source?: string
  category: Category
  type: "quote" | "poem" | "reflection"
}

// Sorting options for public listings
export type OrderByOption =
  | 'newest'
  | 'oldest'
  | 'author-asc'
  | 'author-desc'
  | 'likes'
  | 'views'
