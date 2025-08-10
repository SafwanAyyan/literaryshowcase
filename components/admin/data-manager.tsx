"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Download, Upload, RefreshCw, Database, AlertTriangle, CheckCircle } from "lucide-react"
import toast from 'react-hot-toast'

export function DataManager() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)


  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/admin/export')
      const result = await response.json()
      
      if (result.success) {
        const data = JSON.stringify(result.data, null, 2)
        const blob = new Blob([data], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement("a")
        a.href = url
        a.download = result.filename || `literary-showcase-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast.success("Data exported successfully!")
      } else {
        toast.error(result.error || "Failed to export data")
      }
    } catch (error) {
      toast.error("Failed to export data")
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    
    setIsImporting(true)
    try {
      const text = await importFile.text()
      const parsed = JSON.parse(text)
      
      if (!parsed.data || !Array.isArray(parsed.data)) {
        throw new Error("Invalid data format")
      }

      // Use the API endpoint instead of direct database service
      const response = await fetch('/api/content/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: parsed.data }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to import data via API')
      }
      
      toast.success(`Successfully imported ${parsed.data.length} items!`)
      setImportFile(null)
      
      // Use content refresh system instead of page reload
      setTimeout(() => {
        // Trigger content refresh for real-time updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-updated'))
        }
      }, 1000)
    } catch (error: any) {
      toast.error(error.message || "Failed to import data")
    } finally {
      setIsImporting(false)
    }
  }

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset all data to default? This cannot be undone!")) {
      try {
        const response = await fetch('/api/admin/reset', {
          method: 'POST',
        })
        
        if (response.ok) {
          toast.success("Data reset to defaults successfully!")
          // Trigger content refresh
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('content-updated'))
            }
          }, 1000)
        } else {
          throw new Error('Reset operation failed')
        }
      } catch (error) {
        toast.error("Reset functionality is not yet implemented")
      }
    }
  }

  const [stats, setStats] = useState({ total: 0, byCategory: {}, byType: {} })

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/admin/stats')
        const result = await response.json()
        if (result.success) {
          setStats(result.data)
        }
      } catch (error) {
        console.error('Failed to load statistics:', error)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Data Management</h2>
        <p className="text-gray-300">Backup, restore, and manage your content data</p>
      </div>



      {/* Statistics */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Database className="w-5 h-5" />
          <span>Current Data Status</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-gray-300 text-sm">Total Items</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-2xl font-bold text-white">{Object.keys(stats.byCategory).length}</p>
            <p className="text-gray-300 text-sm">Categories</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-2xl font-bold text-white">{Object.keys(stats.byType).length}</p>
            <p className="text-gray-300 text-sm">Content Types</p>
          </div>
        </div>
      </div>



      {/* Export Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Export Data</h3>
        <p className="text-gray-300 mb-4">
          Download your content data as a JSON file for backup or migration purposes.
        </p>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-all duration-300"
        >
          {isExporting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Export Data</span>
            </>
          )}
        </button>
      </div>

      {/* Import Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Import Data</h3>
        <p className="text-gray-300 mb-4">
          Upload a JSON file to import content data. This will replace all current data.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select JSON File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500 file:text-white hover:file:bg-purple-600 file:cursor-pointer cursor-pointer"
            />
          </div>
          <button
            onClick={handleImport}
            disabled={!importFile || isImporting}
            className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all duration-300"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Import Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reset Section (removed for safety) */}
    </div>
  )
}