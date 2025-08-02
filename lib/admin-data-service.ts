import type { ContentItem } from "@/types/literary"
import { literaryData } from "./data"

// Simple in-memory storage for demo - in production, use a database
let contentData = [...literaryData]

export class AdminDataService {
  // Get all content
  static getAllContent(): ContentItem[] {
    return [...contentData]
  }

  // Add new content
  static addContent(item: Omit<ContentItem, "id">): ContentItem {
    const newId = (Math.max(...contentData.map((item) => parseInt(item.id))) + 1).toString()
    const newItem: ContentItem = { ...item, id: newId }
    contentData.push(newItem)
    this.saveToLocalStorage()
    return newItem
  }

  // Update existing content
  static updateContent(id: string, updates: Partial<Omit<ContentItem, "id">>): ContentItem | null {
    const index = contentData.findIndex((item) => item.id === id)
    if (index === -1) return null
    
    contentData[index] = { ...contentData[index], ...updates }
    this.saveToLocalStorage()
    return contentData[index]
  }

  // Delete content
  static deleteContent(id: string): boolean {
    const initialLength = contentData.length
    contentData = contentData.filter((item) => item.id !== id)
    const deleted = contentData.length < initialLength
    if (deleted) {
      this.saveToLocalStorage()
    }
    return deleted
  }

  // Bulk add content
  static bulkAddContent(items: Omit<ContentItem, "id">[]): ContentItem[] {
    const startId = Math.max(...contentData.map((item) => parseInt(item.id))) + 1
    const newItems: ContentItem[] = items.map((item, index) => ({
      ...item,
      id: (startId + index).toString(),
    }))
    
    contentData.push(...newItems)
    this.saveToLocalStorage()
    return newItems
  }

  // Get content statistics
  static getStatistics(): {
    total: number
    byCategory: Record<string, number>
    byType: Record<string, number>
  } {
    const byCategory: Record<string, number> = {}
    const byType: Record<string, number> = {}

    contentData.forEach((item) => {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1
      byType[item.type] = (byType[item.type] || 0) + 1
    })

    return {
      total: contentData.length,
      byCategory,
      byType,
    }
  }

  // Search content
  static searchContent(query: string, category?: string): ContentItem[] {
    return contentData.filter((item) => {
      const matchesQuery =
        item.content.toLowerCase().includes(query.toLowerCase()) ||
        item.author.toLowerCase().includes(query.toLowerCase()) ||
        (item.source && item.source.toLowerCase().includes(query.toLowerCase()))
      
      const matchesCategory = !category || category === "all" || item.category === category
      
      return matchesQuery && matchesCategory
    })
  }

  // Save to localStorage for persistence across sessions
  private static saveToLocalStorage(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("literary-showcase-data", JSON.stringify(contentData))
        localStorage.setItem("literary-showcase-backup", JSON.stringify({
          data: contentData,
          timestamp: new Date().toISOString(),
        }))
      } catch (error) {
        console.error("Failed to save to localStorage:", error)
      }
    }
  }

  // Load from localStorage
  static loadFromLocalStorage(): void {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("literary-showcase-data")
        if (saved) {
          const parsedData = JSON.parse(saved)
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            contentData = parsedData
          }
        }
      } catch (error) {
        console.error("Failed to load from localStorage:", error)
      }
    }
  }

  // Export data as JSON
  static exportData(): string {
    return JSON.stringify({
      data: contentData,
      metadata: {
        exported: new Date().toISOString(),
        version: "1.0",
        total: contentData.length,
      },
    }, null, 2)
  }

  // Import data from JSON
  static importData(jsonData: string): { success: boolean; message: string; imported?: number } {
    try {
      const parsed = JSON.parse(jsonData)
      
      if (!parsed.data || !Array.isArray(parsed.data)) {
        return { success: false, message: "Invalid data format" }
      }

      // Validate data structure
      const isValid = parsed.data.every((item: any) => 
        item.id && item.content && item.author && item.category && item.type
      )

      if (!isValid) {
        return { success: false, message: "Invalid content structure" }
      }

      contentData = parsed.data
      this.saveToLocalStorage()
      
      return { 
        success: true, 
        message: "Data imported successfully", 
        imported: parsed.data.length 
      }
    } catch (error) {
      return { success: false, message: "Failed to parse JSON data" }
    }
  }

  // Reset to original data
  static resetToDefault(): void {
    contentData = [...literaryData]
    this.saveToLocalStorage()
  }

  // Get backup info
  static getBackupInfo(): { hasBackup: boolean; timestamp?: string; count?: number } {
    if (typeof window !== "undefined") {
      try {
        const backup = localStorage.getItem("literary-showcase-backup")
        if (backup) {
          const parsed = JSON.parse(backup)
          return {
            hasBackup: true,
            timestamp: parsed.timestamp,
            count: parsed.data?.length || 0,
          }
        }
      } catch (error) {
        console.error("Failed to get backup info:", error)
      }
    }
    return { hasBackup: false }
  }
}

// Initialize data from localStorage on import
if (typeof window !== "undefined") {
  AdminDataService.loadFromLocalStorage()
}