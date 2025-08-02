"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Sparkles, Download, RefreshCw, Plus, Wand2, FileText, AlertCircle } from "lucide-react"
import type { Category, ContentItem } from "@/types/literary"
import { ContentRefresh } from "@/lib/content-refresh"
import toast from 'react-hot-toast'

interface GeneratedContent {
  content: string
  author: string
  source?: string
  category: Category
  type: "quote" | "poem" | "reflection"
}

export function AIContentGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category>("found-made")
  const [selectedType, setSelectedType] = useState<"quote" | "poem" | "reflection">("quote")
  const [quantity, setQuantity] = useState(5)
  const [theme, setTheme] = useState("")
  const [tone, setTone] = useState("inspirational")
  const [provider, setProvider] = useState<"openai" | "gemini" | "both">("openai")

  const handleGenerate = async () => {
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          type: selectedType,
          theme,
          tone,
          quantity,
          provider
        }),
      })

      const result = await response.json()
      if (result.success) {
        setGeneratedContent(result.data)
        toast.success(`Generated ${result.data.length} items successfully!`)
      } else {
        toast.error(result.error || 'Failed to generate content')
      }
    } catch (error: any) {
      console.error("Generation failed:", error)
      toast.error('Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateMockContent = (type: string, theme: string, tone: string) => {
    const baseTheme = theme || "life"
    
    if (type === "quote") {
      const quotes = [
        `The ${baseTheme} we seek is often found in the ${tone} moments we create.`,
        `In every ${baseTheme}, there lies a truth waiting to be discovered with ${tone} eyes.`,
        `${tone.charAt(0).toUpperCase() + tone.slice(1)} hearts find beauty in the simplest forms of ${baseTheme}.`,
        `The journey of ${baseTheme} teaches us that ${tone} souls never truly walk alone.`,
        `When ${baseTheme} challenges us, we must respond with ${tone} courage and unwavering hope.`,
      ]
      return quotes[Math.floor(Math.random() * quotes.length)]
    }
    
    if (type === "poem") {
      return `In the realm of ${baseTheme},
Where ${tone} dreams take flight,
I find myself wandering
Through corridors of light.

Each step reveals a truth,
Each breath, a whispered prayer,
That in this dance of ${baseTheme},
Love is always there.`
    }
    
    // reflection
    return `There's something profoundly ${tone} about ${baseTheme} that speaks to the deepest parts of our being. When we truly embrace this truth, we begin to understand that our experiences, both joyful and challenging, are threads in a larger tapestry of meaning.`
  }

  const handleSelectAll = () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-content-id]')
    checkboxes.forEach(checkbox => {
      (checkbox as HTMLInputElement).checked = true
    })
  }

  const handleAddSelected = async () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-content-id]:checked')
    const selectedItems = Array.from(checkboxes).map((checkbox, index) => {
      const contentId = parseInt((checkbox as HTMLInputElement).dataset.contentId || "0")
      return generatedContent[contentId]
    }).filter(Boolean)
    
    if (selectedItems.length > 0) {
      try {
        const response = await fetch('/api/content/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items: selectedItems }),
        })

        const result = await response.json()
        if (result.success) {
          // Notify that content has been updated
          ContentRefresh.notifyContentChange()
          
          toast.success(`${selectedItems.length} items added to your content library successfully!`)
          // Clear the generated content after adding
          setGeneratedContent([])
        } else {
          toast.error(result.error || 'Failed to add content')
        }
      } catch (error) {
        toast.error('Failed to add content. Please try again.')
      }
    }
  }

  const presetTemplates = [
    {
      name: "Motivational Quotes",
      category: "found-made" as Category,
      type: "quote" as const,
      theme: "motivation",
      tone: "inspirational",
    },
    {
      name: "Philosophical Reflections",
      category: "literary-masters" as Category,
      type: "reflection" as const,
      theme: "philosophy",
      tone: "contemplative",
    },
    {
      name: "Love Poetry",
      category: "original-poetry" as Category,
      type: "poem" as const,
      theme: "love",
      tone: "romantic",
    },
    {
      name: "Spiritual Wisdom",
      category: "spiritual" as Category,
      type: "quote" as const,
      theme: "spirituality",
      tone: "peaceful",
    },
  ]

  const applyTemplate = (template: typeof presetTemplates[0]) => {
    setSelectedCategory(template.category)
    setSelectedType(template.type)
    setTheme(template.theme)
    setTone(template.tone)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Content Generator</h1>
        <p className="text-gray-300">Generate literary content in bulk using AI assistance</p>
      </div>

      {/* Configuration Panel */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
          <Wand2 className="w-5 h-5" />
          <span>Generation Settings</span>
        </h2>

        {/* Preset Templates */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Quick Templates</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {presetTemplates.map((template) => (
              <button
                key={template.name}
                onClick={() => applyTemplate(template)}
                className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg text-white hover:from-purple-500/20 hover:to-pink-500/20 transition-all duration-300 text-sm"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as Category)}
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Content Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as "quote" | "poem" | "reflection")}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="quote">Quote</option>
              <option value="poem">Poem</option>
              <option value="reflection">Reflection</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={5}>5 items</option>
              <option value={10}>10 items</option>
              <option value={15}>15 items</option>
              <option value={20}>20 items</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., love, nature, wisdom..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="inspirational">Inspirational</option>
              <option value="melancholic">Melancholic</option>
              <option value="contemplative">Contemplative</option>
              <option value="romantic">Romantic</option>
              <option value="peaceful">Peaceful</option>
              <option value="mysterious">Mysterious</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">AI Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as "openai" | "gemini" | "both")}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="gemini">Google Gemini</option>
              <option value="both">Both Providers</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Bot className="w-5 h-5" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Content */}
      <AnimatePresence>
        {generatedContent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>Generated Content ({generatedContent.length} items)</span>
              </h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSelectAll}
                  className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={handleAddSelected}
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Selected</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {generatedContent.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      data-content-id={index}
                      className="mt-1 w-4 h-4 text-purple-500 bg-white/10 border-white/20 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                          {item.category}
                        </span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-white text-sm mb-2 whitespace-pre-line">{item.content}</p>
                      <p className="text-gray-400 text-xs">By {item.author}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Disclaimer */}
      <div className="glass-card p-4 border-yellow-500/20">
        <div className="flex items-center space-x-3 text-yellow-300">
          <FileText className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">AI Generation Notice</p>
            <p className="text-xs text-yellow-200/80 mt-1">
              This is a demo implementation. In production, integrate with GPT-4, Claude, or similar AI services for actual content generation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}