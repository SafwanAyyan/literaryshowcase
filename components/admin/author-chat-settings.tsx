"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MessageCircle, TestTube, CheckCircle, XCircle, Loader2, Edit, Save, X } from "lucide-react"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AuthorChatSettingsProps {
  settings: any
  onSettingChange: (key: string, value: string) => void
}

export function AuthorChatSettings({ settings, onSettingChange }: AuthorChatSettingsProps) {
  const [testing, setTesting] = useState<string | null>(null)
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [tempPrompts, setTempPrompts] = useState<Record<string, string>>({})

  const authors = [
    {
      id: 'shakespeare',
      name: 'William Shakespeare',
      avatar: '/assets/authors/shakespeare/shakespeare.jpg',
      defaultPrompt: `You are William Shakespeare, the renowned English playwright and poet from the Elizabethan era. You speak with the wisdom and eloquence befitting your station, but in a way modern readers can understand - avoid excessive archaic language while maintaining your sophisticated voice.

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

When discussing your works, draw from actual themes, characters, and plots. Engage thoughtfully with questions about writing, human nature, and literature.`
    },
    {
      id: 'dostoevsky',
      name: 'Fyodor Dostoevsky',
      avatar: '/assets/authors/dostoevsky/dostoevsky.jpg',
      defaultPrompt: `You are Fyodor Dostoevsky, the great Russian novelist and philosopher. You speak with depth and intensity about the human condition, moral struggles, and the complexities of faith and doubt.

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

When discussing your works, focus on the psychological depth, moral questions, and philosophical implications. Engage with questions about human nature, ethics, and the search for meaning.`
    }
  ]

  const testAuthorChat = async (authorId: string) => {
    setTesting(authorId)

    try {
      const response = await fetch('/api/ai/chat/author', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorId,
          message: 'Hello, can you introduce yourself?',
          conversationHistory: []
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`${authors.find(a => a.id === authorId)?.name} chat test successful!`)
      } else {
        toast.error(`Chat test failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Test error:', error)
      toast.error('Chat test failed. Please check your settings.')
    } finally {
      setTesting(null)
    }
  }

  const startEditingPrompt = (authorId: string) => {
    const currentPrompt = settings[`authorChatPrompt_${authorId}`] ||
      authors.find(a => a.id === authorId)?.defaultPrompt || ''
    setTempPrompts({ ...tempPrompts, [authorId]: currentPrompt })
    setEditingPrompt(authorId)
  }

  const savePrompt = (authorId: string) => {
    const newPrompt = tempPrompts[authorId]
    if (newPrompt) {
      onSettingChange(`authorChatPrompt_${authorId}`, newPrompt)
      toast.success('Prompt updated successfully!')
    }
    setEditingPrompt(null)
    setTempPrompts({ ...tempPrompts, [authorId]: '' })
  }

  const cancelEdit = (authorId: string) => {
    setEditingPrompt(null)
    setTempPrompts({ ...tempPrompts, [authorId]: '' })
  }

  const resetToDefault = (authorId: string) => {
    const defaultPrompt = authors.find(a => a.id === authorId)?.defaultPrompt || ''
    onSettingChange(`authorChatPrompt_${authorId}`, defaultPrompt)
    toast.success('Prompt reset to default!')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="w-6 h-6 text-purple-400" />
        <div>
          <h3 className="text-lg font-semibold text-white">Author Chat Settings</h3>
          <p className="text-gray-400 text-sm">Configure AI personas for author interactions</p>
        </div>
      </div>

      <div className="grid gap-6">
        {authors.map((author) => {
          const isEditing = editingPrompt === author.id
          const currentPrompt = settings[`authorChatPrompt_${author.id}`] || author.defaultPrompt
          const isTesting = testing === author.id

          return (
            <Card key={author.id} className="glass-card border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={author.avatar}
                      alt={author.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                    />
                    <div>
                      <CardTitle className="text-white">{author.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="bg-green-600/20 text-green-300 border-green-500/30">
                          <div className="w-2 h-2 rounded-full bg-green-400 mr-1" />
                          Active
                        </Badge>
                        <span className="text-xs text-gray-400">Gemini 2.5 Flash</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => testAuthorChat(author.id)}
                      disabled={isTesting}
                      variant="secondary"
                      size="sm"
                      className="bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/30"
                    >
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      Test Chat
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-white">
                      Persona Prompt
                    </label>
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <>
                          <Button
                            onClick={() => startEditingPrompt(author.id)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => resetToDefault(author.id)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                          >
                            Reset
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => savePrompt(author.id)}
                            variant="ghost"
                            size="sm"
                            className="text-green-400 hover:text-green-300"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => cancelEdit(author.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <Textarea
                      value={tempPrompts[author.id] || ''}
                      onChange={(e) => setTempPrompts({
                        ...tempPrompts,
                        [author.id]: e.target.value
                      })}
                      className="h-48 bg-white/5 border-white/10 text-white placeholder-gray-400"
                      placeholder="Enter the persona prompt for this author..."
                    />
                  ) : (
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                        {currentPrompt.slice(0, 200)}...
                      </pre>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="text-gray-400">Settings</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Rate Limit</span>
                        <span className="text-gray-300">10/min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Tokens</span>
                        <span className="text-gray-300">500</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Temperature</span>
                        <span className="text-gray-300">0.8</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-gray-400">Cache</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Response Cache</span>
                        <span className="text-green-300">Enabled</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache TTL</span>
                        <span className="text-gray-300">1 hour</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Context Limit</span>
                        <span className="text-gray-300">6 messages</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white">General Chat Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Global Rate Limit (per minute)
              </label>
              <input
                type="number"
                value={settings.authorChatRateLimit || '10'}
                onChange={(e) => onSettingChange('authorChatRateLimit', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                min="1"
                max="60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Cache Duration (minutes)
              </label>
              <input
                type="number"
                value={settings.authorChatCacheDuration || '60'}
                onChange={(e) => onSettingChange('authorChatCacheDuration', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                min="1"
                max="1440"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={settings.authorChatEnabled !== 'false'}
                onChange={(e) => onSettingChange('authorChatEnabled', e.target.checked ? 'true' : 'false')}
                className="rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-400/50"
              />
              Enable Author Chat Feature
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
