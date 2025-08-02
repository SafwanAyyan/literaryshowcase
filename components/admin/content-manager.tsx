"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Edit, Trash2, Search, Filter, Save, X, Wand2 } from "lucide-react"
import type { Category, ContentItem } from "@/types/literary"
import { ContentRefresh } from "@/lib/content-refresh"
import toast from 'react-hot-toast'

export function ContentManager() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isFindingSource, setIsFindingSource] = useState(false)
  const itemsPerPage = 10

  const [newItem, setNewItem] = useState<Omit<ContentItem, "id">>({
    content: "",
    author: "", // Optional - will default to "Anonymous" if empty
    source: "",
    category: "found-made",
    type: "quote",
  })

  // Load content from API on component mount
  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch('/api/content')
        const result = await response.json()
        if (result.success) {
          setContent(result.data)
        } else {
          toast.error('Failed to load content')
        }
      } catch (error) {
        toast.error('Failed to load content')
      }
    }
    loadContent()
  }, [])

  const filteredContent = content.filter((item) => {
    const matchesSearch =
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.author.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "all" || item.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const paginatedContent = filteredContent.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  const totalPages = Math.ceil(filteredContent.length / itemsPerPage)

  const handleSaveNew = async () => {
    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      })

      const result = await response.json()
      if (result.success) {
        setContent([...content, result.data])
        setNewItem({
          content: "",
          author: "", // Will default to Anonymous on backend
          source: "",
          category: "found-made",
          type: "quote",
        })
        setIsAddingNew(false)
        
        // Notify that content has been updated
        ContentRefresh.notifyContentChange()
        
        toast.success('Content added successfully! It will appear on the main website.')
      } else {
        toast.error(result.error || 'Failed to add content')
      }
    } catch (error) {
      toast.error('Failed to add content')
    }
  }

  const handleEdit = (item: ContentItem) => {
    setEditingId(item.id)
    setNewItem({
      content: item.content,
      author: item.author,
      source: item.source || "",
      category: item.category,
      type: item.type,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    try {
      const response = await fetch(`/api/content/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      })

      const result = await response.json()
      if (result.success) {
        setContent(
          content.map((item) =>
            item.id === editingId ? result.data : item,
          ),
        )
        
        // Notify that content has been updated
        ContentRefresh.notifyContentChange()
        
        toast.success('Content updated successfully!')
      } else {
        toast.error(result.error || 'Failed to update content')
      }
      
      setEditingId(null)
      setNewItem({
        content: "",
        author: "", // Will default to Anonymous on backend
        source: "",
        category: "found-made",
        type: "quote",
      })
    } catch (error) {
      toast.error('Failed to update content')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this content?")) {
      try {
        const response = await fetch(`/api/content/${id}`, {
          method: 'DELETE',
        })

        const result = await response.json()
        if (result.success) {
          setContent(content.filter((item) => item.id !== id))
          
          // Notify that content has been updated
          ContentRefresh.notifyContentChange()
          
          toast.success('Content deleted successfully!')
        } else {
          toast.error(result.error || 'Failed to delete content')
        }
      } catch (error) {
        toast.error('Failed to delete content')
      }
    }
  }

  const handleCancel = () => {
    setIsAddingNew(false)
    setEditingId(null)
    setNewItem({
      content: "",
      author: "", // Will default to Anonymous on backend
      source: "",
      category: "found-made",
      type: "quote",
    })
  }

  const handleFindSource = async () => {
    if (!newItem.content.trim()) {
      toast.error('Please enter some content first to find its source')
      return
    }

    setIsFindingSource(true)
    try {
      const response = await fetch('/api/ai/find-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newItem.content }),
      })

      const result = await response.json()
      if (result.success) {
        setNewItem({
          ...newItem,
          author: result.data.author || '',
          source: result.data.source || '',
        })
        toast.success('Source information found and filled!')
      } else {
        toast.error(result.error || 'Failed to find source information')
      }
    } catch (error) {
      toast.error('Failed to find source information')
    } finally {
      setIsFindingSource(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Content Manager</h1>
          <p className="text-gray-300">Add, edit, and organize your literary content</p>
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          <span>Add New</span>
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search content or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as Category | "all")}
              className="bg-white/10 border border-white/20 rounded-lg text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              <option value="found-made">Found/Made</option>
              <option value="cinema">Cinema</option>
              <option value="literary-masters">Literary Masters</option>
              <option value="spiritual">Spiritual</option>
              <option value="original-poetry">Original Poetry</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(isAddingNew || editingId) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6">
              {editingId ? "Edit Content" : "Add New Content"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                <textarea
                  value={newItem.content}
                  onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Enter the literary content..."
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleFindSource}
                    disabled={isFindingSource || !newItem.content.trim()}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all duration-300"
                  >
                    <Wand2 className={`w-4 h-4 ${isFindingSource ? 'animate-spin' : ''}`} />
                    <span>{isFindingSource ? 'Finding Source...' : 'Find Source'}</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Author <span className="text-gray-500 font-normal">(Optional - defaults to "Anonymous")</span>
                </label>
                <input
                  type="text"
                  value={newItem.author}
                  onChange={(e) => setNewItem({ ...newItem, author: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Leave empty for Anonymous"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Source (Optional)</label>
                <input
                  type="text"
                  value={newItem.source}
                  onChange={(e) => setNewItem({ ...newItem, source: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Book, movie, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value as Category })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="found-made">Found/Made</option>
                  <option value="cinema">Cinema</option>
                  <option value="literary-masters">Literary Masters</option>
                  <option value="spiritual">Spiritual</option>
                  <option value="original-poetry">Original Poetry</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value as "quote" | "poem" | "reflection" })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="quote">Quote</option>
                  <option value="poem">Poem</option>
                  <option value="reflection">Reflection</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={handleCancel}
                className="flex items-center space-x-2 px-6 py-3 border border-white/20 text-gray-300 hover:text-white hover:border-white/40 rounded-lg transition-all duration-300"
              >
                <X className="w-5 h-5" />
                <span>Cancel</span>
              </button>
              <button
                onClick={editingId ? handleSaveEdit : handleSaveNew}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg transition-all duration-300"
              >
                <Save className="w-5 h-5" />
                <span>{editingId ? "Update" : "Save"}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content List */}
      <div className="glass-card p-6">
        <div className="space-y-4">
          {paginatedContent.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                      {item.category}
                    </span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-white text-sm mb-2 line-clamp-3">{item.content}</p>
                  <p className="text-gray-400 text-xs">
                    By {item.author} {item.source && `• ${item.source}`}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all duration-300"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  currentPage === page
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}