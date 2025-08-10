"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Eye, Settings, Zap, Shield, RefreshCw, CheckCircle, AlertCircle, Info } from "lucide-react"
import toast from 'react-hot-toast'

interface OCRSettingsProps {
  settings: Record<string, string>
  onSettingChange: (key: string, value: string) => void
  testingProvider?: string | null
  setTestingProvider?: (provider: string | null) => void
}

export function OCRSettings({ 
  settings, 
  onSettingChange, 
  testingProvider, 
  setTestingProvider 
}: OCRSettingsProps) {
  const [ocrProviderStatus, setOcrProviderStatus] = useState<Record<string, boolean>>({})
  const [testingOcr, setTestingOcr] = useState(false)

  useEffect(() => {
    checkProviderStatus()
  }, [])

  const checkProviderStatus = async () => {
    try {
      const response = await fetch('/api/admin/ocr-status')
      const result = await response.json()
      if (result.success) {
        const statusMap = result.providers.reduce((acc: Record<string, boolean>, provider: any) => {
          acc[provider.provider] = provider.available
          return acc
        }, {})
        setOcrProviderStatus(statusMap)
      }
    } catch (error) {
      console.error('Failed to check OCR provider status:', error)
    }
  }

  const testOcrProvider = async (provider: string) => {
    setTestingOcr(true)
    try {
      const response = await fetch('/api/admin/test-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      })
      
      const result = await response.json()
      if (result.success) {
        toast.success(`${provider} OCR test successful!`)
      } else {
        toast.error(`${provider} OCR test failed: ${result.error}`)
      }
    } catch (error) {
      toast.error('OCR test failed')
    } finally {
      setTestingOcr(false)
    }
  }

  const ocrProviders = [
    {
      id: 'ocr-space',
      name: 'OCR.space',
      description: 'Free tier with 25,000 requests/month. Best for general text recognition.',
      features: ['Multi-language support', 'High accuracy', 'Free tier available'],
      status: ocrProviderStatus['ocr-space'],
      settingKey: 'ocrSpaceEnabled'
    },
    {
      id: 'gemini',
      name: 'Google Gemini Vision',
      description: 'Advanced AI vision model. Excellent for complex layouts and handwriting.',
      features: ['AI-powered', 'Handles complex layouts', 'Good with handwriting'],
      status: ocrProviderStatus['gemini'],
      settingKey: 'geminiOcrEnabled'
    },
    {
      id: 'free-ocr-ai',
      name: 'FreeOCR.AI',
      description: 'Latest VLM technology. Best for preserving formatting.',
      features: ['VLM technology', 'Format preservation', 'No sign-up required'],
      status: ocrProviderStatus['free-ocr-ai'],
      settingKey: 'freeOcrAiEnabled'
    }
  ]

  const ocrSettings = [
    {
      key: 'ocrDefaultProvider',
      label: 'Default OCR Provider',
      type: 'select',
      options: [
        { value: 'ocr-space', label: 'OCR.space (Recommended)' },
        { value: 'gemini', label: 'Google Gemini Vision' },
        { value: 'free-ocr-ai', label: 'FreeOCR.AI' },
        { value: 'auto', label: 'Auto-select (Best Available)' }
      ],
      description: 'Primary OCR provider to use for text extraction'
    },
    {
      key: 'ocrFallbackEnabled',
      label: 'Enable Provider Fallbacks',
      type: 'toggle',
      description: 'Automatically try other providers if the primary fails'
    },
    {
      key: 'ocrLanguage',
      label: 'OCR Language',
      type: 'select',
      options: [
        { value: 'eng', label: 'English' },
        { value: 'auto', label: 'Auto-detect' },
        { value: 'spa', label: 'Spanish' },
        { value: 'fre', label: 'French' },
        { value: 'ger', label: 'German' },
        { value: 'chs', label: 'Chinese (Simplified)' },
        { value: 'jpn', label: 'Japanese' },
        { value: 'ara', label: 'Arabic' }
      ],
      description: 'Language for OCR text recognition'
    },
    {
      key: 'ocrQuality',
      label: 'Processing Quality',
      type: 'select',
      options: [
        { value: 'fast', label: 'Fast (Lower quality)' },
        { value: 'balanced', label: 'Balanced (Recommended)' },
        { value: 'accurate', label: 'Accurate (Slower)' }
      ],
      description: 'Balance between speed and accuracy'
    },
    {
      key: 'ocrEnhanceImage',
      label: 'Image Enhancement',
      type: 'toggle',
      description: 'Automatically enhance image quality before OCR processing'
    },
    {
      key: 'ocrDetectOrientation',
      label: 'Auto-rotate Images',
      type: 'toggle',
      description: 'Automatically detect and correct image orientation'
    },
    {
      key: 'ocrMaxFileSize',
      label: 'Max File Size (MB)',
      type: 'number',
      min: 1,
      max: 50,
      description: 'Maximum allowed image file size for OCR processing'
    },
    {
      key: 'ocrTimeout',
      label: 'Processing Timeout (seconds)',
      type: 'number',
      min: 10,
      max: 120,
      description: 'Maximum time to wait for OCR processing'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Provider Status Overview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="w-5 h-5" />
            OCR Provider Status
          </h3>
          <button
            onClick={checkProviderStatus}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-white rounded-md border hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          {ocrProviders.map((provider) => (
            <motion.div
              key={provider.id}
              className="bg-white rounded-lg p-4 border"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{provider.name}</h4>
                <div className="flex items-center gap-2">
                  {provider.status ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    provider.status 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {provider.status ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{provider.description}</p>
              
              <div className="space-y-1 mb-3">
                {provider.features.map((feature, index) => (
                  <div key={index} className="text-xs text-gray-500 flex items-center gap-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    {feature}
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => testOcrProvider(provider.id)}
                  disabled={testingOcr || !provider.status}
                  className="flex-1 text-xs py-1 px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
                >
                  {testingOcr ? 'Testing...' : 'Test'}
                </button>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings[provider.settingKey] !== 'false'}
                    onChange={(e) => onSettingChange(provider.settingKey, e.target.checked ? 'true' : 'false')}
                    className="w-3 h-3 text-blue-600"
                  />
                  <span className="ml-1 text-xs text-gray-600">Enable</span>
                </label>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* OCR Configuration */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          OCR Configuration
        </h3>
        
        <div className="grid gap-6 md:grid-cols-2">
          {ocrSettings.map((setting) => (
            <div key={setting.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  {setting.label}
                </label>
                {setting.description && (
                  <div className="group relative">
                    <Info className="w-4 h-4 text-gray-400" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {setting.description}
                    </div>
                  </div>
                )}
              </div>
              
              {setting.type === 'select' ? (
                <select
                  value={settings[setting.key] || (setting.options ? setting.options[0].value : '')}
                  onChange={(e) => onSettingChange(setting.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {setting.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : setting.type === 'toggle' ? (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings[setting.key] !== 'false'}
                    onChange={(e) => onSettingChange(setting.key, e.target.checked ? 'true' : 'false')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    {settings[setting.key] !== 'false' ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              ) : setting.type === 'number' ? (
                <input
                  type="number"
                  min={setting.min}
                  max={setting.max}
                  value={settings[setting.key] || '5'}
                  onChange={(e) => onSettingChange(setting.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={settings[setting.key] || ''}
                  onChange={(e) => onSettingChange(setting.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              
              {setting.description && (
                <p className="text-xs text-gray-500">{setting.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Performance Optimization */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          Performance & Security
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">OCR Cache Duration (minutes)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings['ocrCacheDuration'] || '30'}
              onChange={(e) => onSettingChange('ocrCacheDuration', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">How long to cache OCR results for identical images</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Rate Limit (requests/hour)</label>
            <input
              type="number"
              min="10"
              max="1000"
              value={settings['ocrRateLimit'] || '100'}
              onChange={(e) => onSettingChange('ocrRateLimit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">Maximum OCR requests per user per hour</p>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings['ocrLogRequests'] !== 'false'}
                onChange={(e) => onSettingChange('ocrLogRequests', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Log OCR Requests</span>
            </label>
            <p className="text-xs text-gray-500">Keep logs of OCR usage for analytics and debugging</p>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings['ocrSecureMode'] !== 'false'}
                onChange={(e) => onSettingChange('ocrSecureMode', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Secure Mode</span>
            </label>
            <p className="text-xs text-gray-500">Enhanced security checks and data sanitization</p>
          </div>
        </div>
      </div>
    </div>
  )
}