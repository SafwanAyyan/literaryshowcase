"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, Send, User, Bot, Loader2, X, Minimize2, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import toast from "react-hot-toast"

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

interface AuthorChatDialogProps {
  authorId: string
  authorName: string
  authorAvatar?: string
  trigger?: React.ReactNode
}

export function AuthorChatDialog({ 
  authorId, 
  authorName, 
  authorAvatar,
  trigger 
}: AuthorChatDialogProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (open && messages.length === 0) {
      // Add welcome message when chat opens
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        content: `Greetings! I am ${authorName}. What would you like to discuss about my works or the human condition?`,
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [open, authorName, messages.length])

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: currentMessage.trim(),
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat/author', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorId,
          message: userMessage.content,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      if (data.success) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          content: data.response,
          role: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message. Please try again.')
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "I apologize, but I'm having difficulty responding right now. Please try again in a moment.",
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    const welcomeMessage: Message = {
      id: `welcome-${Date.now()}`,
      content: `Greetings! I am ${authorName}. What would you like to discuss about my works or the human condition?`,
      role: 'assistant',
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }

  const defaultTrigger = (
    <Button 
      variant="brand" 
      size="lg"
    >
      <MessageCircle className="w-5 h-5 mr-2" />
      Chat with {authorName}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent 
        className={`glass-card border-white/10 bg-black/20 backdrop-blur-xl text-white max-w-2xl h-[600px] flex flex-col ${
          isMinimized ? 'h-16' : ''
        }`}
      >
        <DialogHeader className="flex-shrink-0 border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {authorAvatar ? (
                <img 
                  src={authorAvatar} 
                  alt={authorName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {authorName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
              )}
              <div>
                <DialogTitle className="text-white text-lg">
                  Chat with {authorName}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-600/20 text-green-300 border-green-500/30">
                    <div className="w-2 h-2 rounded-full bg-green-400 mr-1" />
                    Online
                  </Badge>
                  <span className="text-xs text-gray-400">Powered by AI</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-gray-400 hover:text-white"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="text-gray-400 hover:text-white"
              >
                Clear
              </Button>
            </div>
          </div>
        </DialogHeader>

        {!isMinimized && (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[75%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white ml-auto'
                            : 'bg-white/10 text-gray-100 border border-white/10'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <div className="mt-2 text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>

                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white/10 text-gray-100 border border-white/10 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="flex-shrink-0 border-t border-white/10 p-4">
              <div className="flex gap-2">
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask ${authorName} about their works, philosophy, or writing...`}
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder-gray-400 resize-none"
                  rows={2}
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isLoading}
                  variant="brand"
                  className="px-6"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
