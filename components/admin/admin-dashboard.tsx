"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { signOut } from "next-auth/react"
import { PlusCircle, FileText, Bot, BarChart3, Database, Settings, LogOut, Home, AlertTriangle, Save, Image, Eye, Activity, Users } from "lucide-react"
import toast from "react-hot-toast"
import { FloatingParticles } from "@/components/floating-particles"
import { InteractiveBackground } from "@/components/interactive-background"
import { ContentManager } from "./content-manager"
import { AIContentGenerator } from "./ai-content-generator"
import { DashboardStats } from "./dashboard-stats"
import { DataManager } from "./data-manager"
import { AIProvidersSettings } from "./ai-providers-settings"
import { ImageToText } from "./image-to-text"
import { SubmissionsPanel } from "./submissions-panel"
import { OCRSettings } from "./ocr-settings"
import { PerformanceMonitor } from "./performance-monitor"
import { ContentImporter } from "./content-importer"
import Link from "next/link"
import { PromptManager } from "./prompt-manager"
import { CategoryPromptOverrides } from "./category-prompt-overrides"
import { Button } from "@/components/ui/button"

type AdminView = "dashboard" | "content" | "ai-generator" | "data-manager" | "image-to-text" | "settings" | "submissions" | "import"

export function AdminDashboard() {
  const [currentView, setCurrentView] = useState<AdminView>("dashboard")

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "content", label: "Manage Content", icon: FileText },
    { id: "import", label: "Bulk Import", icon: Database },
    { id: "ai-generator", label: "AI Generator", icon: Bot },
    { id: "data-manager", label: "Data Manager", icon: Database },
    { id: "image-to-text", label: "Image to Text", icon: Image },
    { id: "submissions", label: "Submissions", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  const renderCurrentView = () => {
    switch (currentView) {
      case "content":
        return <ContentManager />
      case "ai-generator":
        return <AIContentGenerator />
      case "data-manager":
        return <DataManager />
      case "import":
        return <ContentImporter />
      case "image-to-text":
        return <ImageToText />
      case "submissions":
        return <SubmissionsPanel onSubmissionUpdate={() => {
          // Refresh dashboard stats when submissions are updated
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('content-updated'))
          }
        }} />
      case "settings":
        return <AdminSettings />
      default:
        return <DashboardStats />
    }
  }

  const showBackground = currentView === 'dashboard'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      {showBackground && <InteractiveBackground />}
      {showBackground && <FloatingParticles />}

      <div className="relative z-10 flex">
        {/* Sidebar */}
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-64 min-h-screen glass-card rounded-none border-r border-white/10"
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-2">Admin Panel</h2>
            <p className="text-gray-300 text-sm">Literary Showcase</p>
          </div>

          <nav className="px-4 py-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as AdminView)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-all duration-200 ${
                    currentView === item.id
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="absolute bottom-6 left-4 right-4 space-y-2">
            <Link
              href="/"
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <Home className="w-5 h-5" />
              <span>Back to Site</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-8 overflow-hidden">
          <motion.div
            key={currentView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {renderCurrentView()}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function AdminSettings() {
  const [settings, setSettings] = useState({
    maintenanceMode: 'false',
    openaiApiKey: '',
    geminiApiKey: '',
    deepseekApiKey: '',
    defaultAiProvider: 'openai',
    openaiModel: 'gpt-4o',
    geminiModel: 'gemini-2.5-pro',
    deepseekModel: 'deepseek-chat-v3',
    maintenanceMessage: 'The Literary Showcase is currently undergoing maintenance. Please check back soon!',
    siteName: 'Literary Showcase',
    allowedMaintenanceEmails: '',
    // OCR Settings
    ocrDefaultProvider: 'ocr-space',
    ocrFallbackEnabled: 'true',
    ocrLanguage: 'eng',
    ocrQuality: 'balanced',
    ocrEnhanceImage: 'true',
    ocrDetectOrientation: 'true',
    ocrMaxFileSize: '5',
    ocrTimeout: '30',
    ocrCacheDuration: '30',
    ocrRateLimit: '100',
    ocrLogRequests: 'true',
    ocrSecureMode: 'true',
    ocrSpaceEnabled: 'true',
    geminiOcrEnabled: 'true',
    freeOcrAiEnabled: 'false'
    ,
    // AI tuning
    aiTemperature: '0.9',
    aiMaxTokens: '2000',
    aiEnableProviderFallback: 'true'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'prompts' | 'ocr' | 'performance' | 'maintenance'>('general')
  const [testingProvider, setTestingProvider] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Load settings from database
      const response = await fetch('/api/admin/settings')
      const result = await response.json()
      
      if (result.success) {
        setSettings(result.data)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings })
      })
      
      const result = await response.json()
      if (result.success) {
        toast.success('Settings saved successfully!')
      } else {
        toast.error(result.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Removed old testApiConnection function - now handled by AI Providers Settings component

  const handleMaintenanceToggle = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/toggle-maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled,
          allowedEmails: settings.allowedMaintenanceEmails
        })
      })

      const result = await response.json()
      if (result.success) {
        setSettings(prev => ({
          ...prev,
          maintenanceMode: enabled ? 'true' : 'false'
        }))
        
        toast.success(result.message)
        
        if (result.requiresRestart) {
          toast('Changes will take full effect on next server restart', {
            duration: 5000
          })
        }
      } else {
        toast.error(result.error || 'Failed to toggle maintenance mode')
        // Revert checkbox state
        setSettings(prev => ({
          ...prev,
          maintenanceMode: enabled ? 'false' : 'true'
        }))
      }
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error)
      toast.error('Failed to toggle maintenance mode')
      // Revert checkbox state
      setSettings(prev => ({
        ...prev,
        maintenanceMode: enabled ? 'false' : 'true'
      }))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'ai', label: 'AI Providers', icon: Bot },
    { id: 'prompts', label: 'Prompts', icon: FileText },
    { id: 'ocr', label: 'OCR Settings', icon: Eye },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'maintenance', label: 'Maintenance', icon: AlertTriangle }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Settings</h1>
        <p className="text-gray-300">Configure website settings and API integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 glass-card p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Settings Content */}
      <div className="glass-card p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">General Settings</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Site Name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => handleSettingChange('siteName', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Literary Showcase"
              />
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <AIProvidersSettings
            settings={settings}
            onSettingChange={handleSettingChange}
            testingProvider={testingProvider}
            setTestingProvider={setTestingProvider}
          />
        )}

        {activeTab === 'prompts' && (
          <div className="space-y-6">
            <PromptManager />
            <div className="border-t border-white/10 pt-6">
              <CategoryPromptOverrides />
            </div>
          </div>
        )}

        {activeTab === 'ocr' && (
          <OCRSettings 
            settings={settings}
            onSettingChange={handleSettingChange}
            testingProvider={testingProvider}
            setTestingProvider={setTestingProvider}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceMonitor />
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">Maintenance Mode</h2>
            
            <div className="flex items-center space-x-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
              <div>
                <h3 className="text-orange-300 font-medium">Website Status</h3>
                <p className="text-orange-200 text-sm">
                  {settings.maintenanceMode === 'true' 
                    ? 'Maintenance mode is ACTIVE - only admins can access the site'
                    : 'Website is LIVE and accessible to all users'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="maintenanceMode"
                checked={settings.maintenanceMode === 'true'}
                onChange={(e) => handleMaintenanceToggle(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="maintenanceMode" className="text-white font-medium">
                Enable Maintenance Mode
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Maintenance Message</label>
              <textarea
                value={settings.maintenanceMessage}
                onChange={(e) => handleSettingChange('maintenanceMessage', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Message to display during maintenance..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Admin Emails (can access during maintenance)</label>
              <input
                type="text"
                value={settings.allowedMaintenanceEmails}
                onChange={(e) => handleSettingChange('allowedMaintenanceEmails', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="admin@example.com, admin2@example.com"
              />
              <p className="text-gray-400 text-sm mt-1">Separate multiple emails with commas</p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-white/10">
          <Button onClick={saveSettings} disabled={isSaving} variant="brand" size="lg" round="pill">
            {isSaving ? <Save className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving…' : 'Save Settings'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}