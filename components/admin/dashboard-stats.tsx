"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FileText, Quote, BookOpen, Sparkles, TrendingUp, Bot } from "lucide-react"
import type { Category } from "@/types/literary"

export function DashboardStats() {
  const [stats, setStats] = useState({
    total: 0,
    byCategory: {} as Record<Category, number>,
    byType: {} as Record<string, number>,
    recentCount: 0
  })

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

  const totalContent = stats.total
  const categories = stats.byCategory
  const types = stats.byType

  const statCards = [
    {
      label: "Total Content",
      value: totalContent,
      icon: FileText,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Quotes",
      value: types.quote || 0,
      icon: Quote,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Poems",
      value: types.poem || 0,
      icon: BookOpen,
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Reflections",
      value: types.reflection || 0,
      icon: Sparkles,
      color: "from-orange-500 to-red-500",
    },
  ]

  const categoryStats = [
    { name: "Found/Made", count: categories["found-made"] || 0 },
    { name: "Cinema", count: categories.cinema || 0 },
    { name: "Literary Masters", count: categories["literary-masters"] || 0 },
    { name: "Spiritual", count: categories.spiritual || 0 },
    { name: "Original Poetry", count: categories["original-poetry"] || 0 },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-300">Overview of your literary showcase content</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-6 hover:scale-105 transition-transform duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-gray-300 text-sm">{stat.label}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="glass-card p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-6">Content by Category</h2>
        <div className="space-y-4">
          {categoryStats.map((category) => (
            <div key={category.name} className="flex items-center justify-between">
              <span className="text-gray-300">{category.name}</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${(category.count / totalContent) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-white font-semibold min-w-[2rem] text-right">
                  {category.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="glass-card p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg text-white hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300">
            <FileText className="w-6 h-6 mb-2 mx-auto" />
            <span>Add New Content</span>
          </button>
          <button className="p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg text-white hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-300">
            <Bot className="w-6 h-6 mb-2 mx-auto" />
            <span>Generate with AI</span>
          </button>
          <button className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg text-white hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300">
            <TrendingUp className="w-6 h-6 mb-2 mx-auto" />
            <span>View Analytics</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}