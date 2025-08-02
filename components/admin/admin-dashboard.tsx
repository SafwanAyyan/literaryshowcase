"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { signOut } from "next-auth/react"
import { PlusCircle, FileText, Bot, BarChart3, Database, Settings, LogOut, Home, AlertTriangle, Save } from "lucide-react"
import { toast } from "react-hot-toast"
import { FloatingParticles } from "@/components/floating-particles"
import { InteractiveBackground } from "@/components/interactive-background"
import { ContentManager } from "./content-manager"
import { AIContentGenerator } from "./ai-content-generator"
import { DashboardStats } from "./dashboard-stats"
import { DataManager } from "./data-manager"
import Link from "next/link"

type AdminView = "dashboard" | "content" | "ai-generator" | "data-manager" | "settings"

export function AdminDashboard() {
  const [currentView, setCurrentView] = useState<AdminView>("dashboard")

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "content", label: "Manage Content", icon: FileText },
    { id: "ai-generator", label: "AI Generator", icon: Bot },
    { id: "data-manager", label: "Data Manager", icon: Database },
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
      case "settings":
        return <AdminSettings />
      default:
        return <DashboardStats />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      <InteractiveBackground />
      <FloatingParticles />

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
        <div className="flex-1 p-8">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
    defaultAiProvider: 'openai',
    maintenanceMessage: 'The Literary Showcase is currently undergoing maintenance. Please check back soon!',
    siteName: 'Literary Showcase',
    allowedMaintenanceEmails: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'maintenance'>('general')

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

  const testApiConnection = async (provider: 'openai' | 'gemini') => {
    try {
      const apiKey = provider === 'openai' ? settings.openaiApiKey : settings.geminiApiKey
      if (!apiKey) {
        toast.error(`Please enter ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key first`)
        return
      }

      // Test the connection
      toast.info(`Testing ${provider} connection...`)
      
      const response = await fetch('/api/admin/test-api', {
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
      
      if (result.success) {
        toast.success(`${provider.toUpperCase()} connection test successful!`)
      } else {
        toast.error(`${provider.toUpperCase()} connection test failed: ${result.error}`)
      }
    } catch (error: any) {
      console.error(`${provider} test failed:`, error)
      toast.error(`${provider.toUpperCase()} connection test failed: ${error.message}`)
    }
  }

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
          toast.info('Changes will take full effect on next server restart', {
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
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">AI Provider Settings</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Default AI Provider</label>
              <select
                value={settings.defaultAiProvider}
                onChange={(e) => handleSettingChange('defaultAiProvider', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="gemini">Google Gemini</option>
                <option value="both">Both Providers</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">OpenAI API Key</label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={settings.openaiApiKey}
                  onChange={(e) => handleSettingChange('openaiApiKey', e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="sk-..."
                />
                <button
                  onClick={() => testApiConnection('openai')}
                  className="px-4 py-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-500/30 transition-all duration-200"
                >
                  Test
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Gemini API Key</label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={settings.geminiApiKey}
                  onChange={(e) => handleSettingChange('geminiApiKey', e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="AIza..."
                />
                <button
                  onClick={() => testApiConnection('gemini')}
                  className="px-4 py-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-500/30 transition-all duration-200"
                >
                  Test
                </button>
              </div>
            </div>
          </div>
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
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all duration-300"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}