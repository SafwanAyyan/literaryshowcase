"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, TestTube, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"
import { UnifiedAIService } from "@/lib/unified-ai-service"

interface AIProvidersSettingsProps {
  settings: any
  onSettingChange: (key: string, value: string) => void
  testingProvider: string | null
  setTestingProvider: (provider: string | null) => void
}

export function AIProvidersSettings({ 
  settings, 
  onSettingChange, 
  testingProvider, 
  setTestingProvider 
}: AIProvidersSettingsProps) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; timestamp: number }>>({})

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }))
  }

  const testConnection = async (provider: 'openai' | 'gemini' | 'deepseek') => {
    const apiKey = settings[`${provider}ApiKey`]
    
    if (!apiKey) {
      toast.error(`Please enter ${provider.toUpperCase()} API key first`)
      return
    }

    setTestingProvider(provider)
    setTestResults(prev => ({ 
      ...prev, 
      [provider]: { success: false, message: 'Testing connection...', timestamp: Date.now() } 
    }))
    
    try {
      // Use the API route instead of calling UnifiedAIService directly to avoid server-side issues
      const response = await fetch('/api/admin/test-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          apiKey
        })
      })

      const result = await response.json()
      
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          success: result.success,
          message: result.message || (result.success ? 'Connection successful!' : 'Connection failed'),
          timestamp: Date.now()
        }
      }))

      if (result.success) {
        toast.success(`${provider.toUpperCase()} connection successful!`)
      } else {
        toast.error(`${provider.toUpperCase()} connection failed: ${result.message}`)
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error during connection test'
      
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          success: false,
          message: errorMessage,
          timestamp: Date.now()
        }
      }))
      
      toast.error(`${provider.toUpperCase()} test failed: ${errorMessage}`)
    } finally {
      setTestingProvider(null)
    }
  }

  const providers = [
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT-4o and other OpenAI models',
      models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      defaultModel: 'gpt-4o',
      setupGuide: 'Get your API key from OpenAI Platform (platform.openai.com/api-keys)',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Gemini 2.5 Pro and other Google AI models',
      models: ['gemini-2.5-pro', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'],
      defaultModel: 'gemini-2.5-pro',
      setupGuide: 'Get your API key from Google AI Studio (aistudio.google.com)',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek V3',
      description: 'DeepSeek V3 models via OpenRouter',
      models: ['deepseek-chat-v3', 'deepseek-chat-v3-0324'],
      defaultModel: 'deepseek-chat-v3',
      setupGuide: 'Get your API key from OpenRouter (openrouter.ai/keys) - very cost-effective!',
      color: 'from-purple-500 to-pink-500'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">AI Providers Configuration</h2>
        <p className="text-gray-300">Configure multiple AI providers and switch between them</p>
      </div>

      {/* Default Provider Selection */}
      <div className="glass-card p-4">
        <h3 className="text-white font-medium mb-3">Default AI Provider</h3>
        <div className="grid grid-cols-3 gap-3">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => onSettingChange('defaultAiProvider', provider.id)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                settings.defaultAiProvider === provider.id
                  ? `bg-gradient-to-r ${provider.color} border-white/30 text-white`
                  : 'border-white/20 text-gray-300 hover:border-white/40 hover:text-white'
              }`}
            >
              <div className="text-sm font-medium">{provider.name}</div>
              <div className="text-xs opacity-75">{provider.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Global AI Tuning */}
      <div className="glass-card p-6">
        <h3 className="text-white font-medium mb-4">Global AI Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Temperature</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1.5"
              value={settings.aiTemperature || '0.9'}
              onChange={(e) => onSettingChange('aiTemperature', e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="0.9"
            />
            <p className="text-gray-400 text-xs mt-1">Creativity of responses. Lower = more precise, Higher = more creative.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Tokens</label>
            <input
              type="number"
              min="100"
              max="4000"
              value={settings.aiMaxTokens || '2000'}
              onChange={(e) => onSettingChange('aiMaxTokens', e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="2000"
            />
            <p className="text-gray-400 text-xs mt-1">Upper bound on response length (approx).</p>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.aiEnableProviderFallback !== 'false'}
                onChange={(e) => onSettingChange('aiEnableProviderFallback', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Enable Provider Fallback</span>
            </label>
          </div>
        </div>
      </div>

      {/* Provider Configurations */}
      <div className="space-y-4">
        {providers.map((provider) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${provider.color}`}></div>
                <h3 className="text-white font-medium">{provider.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  settings.defaultAiProvider === provider.id
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {settings.defaultAiProvider === provider.id ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <button
                onClick={() => testConnection(provider.id as any)}
                disabled={testingProvider === provider.id || !settings[`${provider.id}ApiKey`]}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  testingProvider === provider.id
                    ? 'bg-yellow-500/20 text-yellow-300'
                    : testResults[provider.id]?.success === true
                    ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                    : testResults[provider.id]?.success === false
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                }`}
              >
                {testingProvider === provider.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : testResults[provider.id]?.success === true ? (
                  <CheckCircle className="w-4 h-4" />
                ) : testResults[provider.id]?.success === false ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                <span>
                  {testingProvider === provider.id
                    ? 'Testing...'
                    : testResults[provider.id]?.success === true
                    ? 'Connection OK'
                    : testResults[provider.id]?.success === false
                    ? 'Test Failed'
                    : 'Test Connection'
                  }
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKeys[provider.id] ? "text" : "password"}
                    value={settings[`${provider.id}ApiKey`] || ''}
                    onChange={(e) => onSettingChange(`${provider.id}ApiKey`, e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={`Enter ${provider.name} API key...`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility(provider.id)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showKeys[provider.id] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-1">{provider.setupGuide}</p>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Model
                </label>
                <select
                  value={settings[`${provider.id}Model`] || provider.defaultModel}
                  onChange={(e) => onSettingChange(`${provider.id}Model`, e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {provider.models.map((model) => (
                    <option key={model} value={model} className="bg-gray-800">
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status and Test Result */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center space-x-2">
                {settings[`${provider.id}ApiKey`] ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm">API key configured</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">API key missing</span>
                  </>
                )}
              </div>
              
              {/* Test Result Message */}
              {testResults[provider.id] && (
                <div className={`p-3 rounded-lg text-sm border ${
                  testResults[provider.id].success 
                    ? 'bg-green-500/10 text-green-300 border-green-500/30' 
                    : 'bg-red-500/10 text-red-300 border-red-500/30'
                }`}>
                  <div className="flex items-center space-x-2">
                    {testResults[provider.id].success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>{testResults[provider.id].message}</span>
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    Tested {new Date(testResults[provider.id].timestamp).toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cost Information */}
      <div className="glass-card p-4">
        <h3 className="text-white font-medium mb-3">💰 Cost Comparison (approx.)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-green-400 font-medium">OpenAI GPT-4o</div>
            <div className="text-gray-400">$2.50 / 1M input tokens</div>
            <div className="text-gray-400">$10.00 / 1M output tokens</div>
          </div>
          <div>
            <div className="text-blue-400 font-medium">Gemini 2.5 Pro</div>
            <div className="text-gray-400">$1.25 / 1M input tokens</div>
            <div className="text-gray-400">$5.00 / 1M output tokens</div>
          </div>
          <div>
            <div className="text-purple-400 font-medium">DeepSeek V3</div>
            <div className="text-gray-400">$0.27 / 1M input tokens</div>
            <div className="text-gray-400">$0.27 / 1M output tokens</div>
            <div className="text-green-400 text-xs">Most cost-effective!</div>
          </div>
        </div>
      </div>
    </div>
  )
}