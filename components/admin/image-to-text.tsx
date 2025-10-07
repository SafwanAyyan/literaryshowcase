"use client"

import { useState, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Upload, Clipboard, Copy, Send, Image as ImageIcon, X, CheckCircle, Loader2 } from "lucide-react"
import toast from 'react-hot-toast'

export function ImageToText() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit for better performance
      toast.error('Image size must be less than 5MB')
      return
    }

    setSelectedImage(file)
    setExtractedText("")

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handlePaste = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read()
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type)
            const file = new File([blob], `pasted-image.${type.split('/')[1]}`, { type })
            handleFileSelect(file)
            toast.success('Image pasted from clipboard!')
            return
          }
        }
      }
      toast.error('No image found in clipboard')
    } catch (error) {
      console.error('Failed to paste from clipboard:', error)
      toast.error('Failed to paste from clipboard. Try uploading the image instead.')
    }
  }, [handleFileSelect])

  const extractText = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first')
      return
    }

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('image', selectedImage)

      const response = await fetch('/api/ai/image-to-text', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setExtractedText(result.text)
        toast.success('Text extracted successfully!')
      } else {
        toast.error(result.error || 'Failed to extract text')
      }
    } catch (error: any) {
      console.error('Error extracting text:', error)
      toast.error('Failed to extract text from image')
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = async () => {
    if (!extractedText) return
    
    try {
      await navigator.clipboard.writeText(extractedText)
      setShowCopySuccess(true)
      toast.success('Text copied to clipboard!')
      setTimeout(() => setShowCopySuccess(false), 2000)
    } catch (error) {
      toast.error('Failed to copy text')
    }
  }

  const sendToContentManager = () => {
    if (!extractedText) return
    
    // Store the extracted text in localStorage to be picked up by content manager
    localStorage.setItem('literary-extracted-text', extractedText)
    
    // Dispatch a custom event to notify the content manager
    window.dispatchEvent(new CustomEvent('textExtracted', { 
      detail: { text: extractedText } 
    }))
    
    toast.success('Text sent to Content Manager! Switch to Content Manager and click "Add New" to use it.')
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setExtractedText("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Image to Text</h2>
        <p className="text-gray-300">
          Upload screenshots or images to extract text using AI. Perfect for converting quotes from videos, websites, or documents.
        </p>
      </div>

      {/* Image Upload Area */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Upload or Paste Image</h3>
        
        {!selectedImage ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-white/50 transition-colors"
          >
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-white mb-4">Drag and drop an image here, or</p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Choose File</span>
              </button>
              
              <button
                onClick={handlePaste}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Clipboard className="w-4 h-4" />
                <span>Paste from Clipboard</span>
              </button>
            </div>
            
            <p className="text-gray-400 text-sm mt-4">
              Supports JPG, PNG, GIF, WebP (max 5MB)
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={imagePreview!}
                alt="Selected image"
                className="max-w-full h-auto max-h-96 rounded-lg border border-white/20"
              />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={extractText}
                disabled={isProcessing}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting Text...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    <span>Extract Text</span>
                  </>
                )}
              </button>
              
              <button
                onClick={clearImage}
                className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Extracted Text Area */}
      {extractedText && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Extracted Text</h3>
          
          <div className="relative">
            <textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              className="w-full h-40 p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Extracted text will appear here..."
            />
            
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={copyToClipboard}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {showCopySuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
              
              <button
                onClick={sendToContentManager}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Send to Content Manager</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Usage Tips */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">💡 Tips for Best Results</h3>
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-start space-x-2">
            <span className="text-green-400 mt-1">•</span>
            <span>Use high-quality, clear images with good contrast</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-400 mt-1">•</span>
            <span>Ensure text is not too small or blurry</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-400 mt-1">•</span>
            <span>Screenshots from videos or websites work great</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-400 mt-1">•</span>
            <span>You can edit the extracted text before copying or sending to Content Manager</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-400 mt-1">•</span>
            <span>Powered by Google Gemini Vision AI for accurate text recognition</span>
          </li>
        </ul>
      </div>
    </div>
  )
}