"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FileText, Quote, BookOpen, Sparkles, TrendingUp, BarChart3, Bot, Users, Clock, CheckCircle, XCircle } from "lucide-react"
import type { Category } from "@/types/literary"

export function DashboardStats() {
  const [stats, setStats] = useState({
    total: 0,
    byCategory: {} as Record<Category, number>,
    byType: {} as Record<string, number>,
    recentCount: 0,
    totals: { likes: 0, views: 0 },
    submissions: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    }
  })
  const [metrics, setMetrics] = useState<{ metrics: { date: string; visits: number; pageviews: number }[]; totals: { visits: number; pageviews: number } } | null>(null)

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
    const loadMetrics = async () => {
      try {
        const res = await fetch('/api/admin/metrics?days=30')
        const data = await res.json()
        if (data.success) setMetrics(data.data)
      } catch (e) {
        console.error('Failed to load metrics', e)
      }
    }
    
    loadStats(); loadMetrics()

    // Listen for content updates to refresh stats
    const handleContentUpdate = () => {
      loadStats()
    }

    window.addEventListener('content-updated', handleContentUpdate)
    return () => window.removeEventListener('content-updated', handleContentUpdate)
  }, [])

  const totalContent = stats.total
  const categories = stats.byCategory as Record<string, number>
  const types = stats.byType

  const statCards = [
    {
      label: "Total Content",
      value: totalContent,
      icon: FileText,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Total Views",
      value: stats.totals.views || 0,
      icon: TrendingUp,
      color: "from-indigo-500 to-purple-500",
    },
    {
      label: "Total Likes",
      value: stats.totals.likes || 0,
      icon: Sparkles,
      color: "from-pink-500 to-rose-500",
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

  const submissionCards = [
    {
      label: "Pending Review",
      value: stats.submissions.pending,
      icon: Clock,
      color: "from-yellow-500 to-orange-500",
      urgent: stats.submissions.pending > 0
    },
    {
      label: "Total Submissions",
      value: stats.submissions.total,
      icon: Users,
      color: "from-blue-500 to-indigo-500",
    },
    {
      label: "Approved",
      value: stats.submissions.approved,
      icon: CheckCircle,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Rejected",
      value: stats.submissions.rejected,
      icon: XCircle,
      color: "from-red-500 to-rose-500",
    },
  ]

  const categoryStats = [
    { name: "Found/Made", count: categories["found-made"] || 0 },
    { name: "Cinema", count: categories.cinema || 0 },
    { name: "Literary Masters", count: categories["literary-masters"] || 0 },
    { name: "Spiritual", count: categories.spiritual || 0 },
    { name: "Original Poetry", count: categories["original-poetry"] || 0 },
    { name: "Heartbreak", count: categories["heartbreak"] || 0 },
  ]

  return (
    <div className="space-y-8">
      {/* Traffic chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> Traffic (last 30 days)
        </h3>
        {metrics ? (
          <MiniAreaChart series={[
            { name: 'Pageviews', color: 'rgba(168, 85, 247, 0.9)', points: metrics.metrics.map((m) => m.pageviews) },
            { name: 'Visits', color: 'rgba(236, 72, 153, 0.9)', points: metrics.metrics.map((m) => m.visits) },
          ]} labels={metrics.metrics.map((m)=>m.date)} />
        ) : (
          <div className="text-gray-400">Loading metrics…</div>
        )}
      </div>
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

      {/* Submissions Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">User Submissions</h2>
          {stats.submissions.pending > 0 && (
            <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-medium border border-yellow-500/30 animate-pulse">
              {stats.submissions.pending} pending review
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {submissionCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className={`glass-card p-4 hover:scale-105 transition-transform duration-300 ${
                  stat.urgent ? 'ring-2 ring-yellow-500/50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {stat.urgent && (
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="text-gray-300 text-xs">{stat.label}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
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

// Tiny inline SVG chart (no external deps) for performance
function MiniAreaChart({ series, labels }: { series: { name: string; color: string; points: number[] }[]; labels: string[] }) {
  const width = 800
  const height = 220
  const padding = 24
  const max = Math.max(1, ...series.flatMap(s => s.points))
  const step = (width - padding * 2) / Math.max(1, labels.length - 1)

  const toPath = (points: number[]) => {
    return points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${padding + i * step} ${height - padding - (v / max) * (height - padding * 2)}`).join(' ')
  }

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="w-full h-[220px]">
        {/* Grid */}
        <g opacity="0.15">
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={i} x1={padding} x2={width - padding} y1={padding + i * ((height - padding * 2) / 4)} y2={padding + i * ((height - padding * 2) / 4)} stroke="white" />
          ))}
        </g>
        {/* Series */}
        {series.map((s, idx) => (
          <g key={idx}>
            <path d={toPath(s.points)} fill="none" stroke={s.color} strokeWidth={2} />
          </g>
        ))}
      </svg>
    </div>
  )
}