export type Category = "found-made" | "cinema" | "literary-masters" | "spiritual" | "original-poetry"

export interface ContentItem {
  id: string
  content: string
  author: string
  source?: string
  category: Category
  type: "quote" | "poem" | "reflection"
}
