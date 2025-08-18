"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Activity, Cpu, Database, Zap, RefreshCw, AlertTriangle, CheckCircle, Clock, Gauge } from "lucide-react"
import toast from 'react-hot-toast'

interface PerformanceMetrics {
  responseTime: number
  memoryUsage: string
  memoryDetails?: { rssMB: number; heapUsedMB: number; heapTotalMB: number; externalMB: number }
  cpuUsage?: { userMs: number; systemMs: number }
  cacheHitRate: number
  activeConnections: number
  requestsPerMinute: number
  errorRate: number
  uptime: string
  lastUpdated: string
  node?: { nodeVersion: string; platform: string; pid: number }
}

// RUM summary types
type VitalName = 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB'
type VitalSummary = { count: number; p50: number | null; p75: number | null; p95: number | null }
type RumData = {
  windowMs: number
  count: number
  overall: Record<VitalName, VitalSummary>
  byPath: Record<string, Record<VitalName, VitalSummary>>
  byDevice: Record<string, Record<VitalName, VitalSummary>>
  generatedAt: string
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [rum, setRum] = useState<RumData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [windowMs, setWindowMs] = useState(24 * 60 * 60 * 1000) // 24h

  useEffect(() => {
    fetchAll()
    if (autoRefresh) {
      const interval = setInterval(fetchAll, 30000) // 30s
      return () => clearInterval(interval)
    }
  }, [autoRefresh, windowMs])

  const fetchAll = async () => {
    await Promise.all([fetchMetrics(), fetchRUM()])
    setIsLoading(false)
  }

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/performance-metrics', { cache: 'no-store' })
      const result = await response.json()
      if (result.success) setMetrics(result.data)
      else toast.error('Failed to load performance metrics')
    } catch (error) {
      console.error('Error fetching performance metrics:', error)
      toast.error('Failed to fetch performance metrics')
    }
  }

  const fetchRUM = async () => {
    try {
      const response = await fetch(`/api/admin/rum/summary?windowMs=${windowMs}`, { cache: 'no-store' })
      const result = await response.json()
      if (result.success) setRum(result.data)
    } catch (error) {
      console.error('Error fetching RUM summary:', error)
    }
  }

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-500 bg-green-100'
    if (value <= thresholds.warning) return 'text-yellow-500 bg-yellow-100'
    return 'text-red-500 bg-red-100'
  }

  const getStatusIcon = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return <CheckCircle className="w-4 h-4" />
    if (value <= thresholds.warning) return <Clock className="w-4 h-4" />
    return <AlertTriangle className="w-4 h-4" />
  }

  const fmtMs = (n: number | null) => (n == null ? '—' : `${Math.round(n)}ms`)
  const clsStr = (n: number | null) => (n == null ? '—' : n.toFixed(3))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600">Unable to load performance metrics</p>
        <button
          onClick={fetchAll}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  const metricCards = [
    {
      title: 'Response Time',
      value: `${metrics.responseTime}ms`,
      icon: <Zap className="w-5 h-5" />,
      status: getStatusColor(metrics.responseTime, { good: 200, warning: 500 }),
      statusIcon: getStatusIcon(metrics.responseTime, { good: 200, warning: 500 }),
      description: 'Average API response time'
    },
    {
      title: 'Heap Used',
      value: metrics.memoryDetails ? `${metrics.memoryDetails.heapUsedMB}/${metrics.memoryDetails.heapTotalMB}MB` : '—',
      icon: <Cpu className="w-5 h-5" />,
      status: 'text-blue-500 bg-blue-100',
      statusIcon: <CheckCircle className="w-4 h-4" />,
      description: 'V8 heap usage'
    },
    {
      title: 'CPU (user/sys)',
      value: metrics.cpuUsage ? `${metrics.cpuUsage.userMs}/${metrics.cpuUsage.systemMs}ms` : '—',
      icon: <Activity className="w-5 h-5" />,
      status: 'text-purple-500 bg-purple-100',
      statusIcon: <CheckCircle className="w-4 h-4" />,
      description: 'CPU time since start'
    },
    {
      title: 'Memory Usage',
      value: metrics.memoryUsage,
      icon: <Cpu className="w-5 h-5" />,
      status: 'text-blue-500 bg-blue-100',
      statusIcon: <CheckCircle className="w-4 h-4" />,
      description: 'Current memory consumption'
    },
    {
      title: 'Cache Hit Rate',
      value: `${metrics.cacheHitRate}%`,
      icon: <Database className="w-5 h-5" />,
      status: getStatusColor(100 - metrics.cacheHitRate, { good: 20, warning: 40 }),
      statusIcon: getStatusIcon(100 - metrics.cacheHitRate, { good: 20, warning: 40 }),
      description: 'Cache effectiveness'
    },
    {
      title: 'Active Connections',
      value: metrics.activeConnections.toString(),
      icon: <Activity className="w-5 h-5" />,
      status: getStatusColor(metrics.activeConnections, { good: 50, warning: 100 }),
      statusIcon: getStatusIcon(metrics.activeConnections, { good: 50, warning: 100 }),
      description: 'Current active connections'
    },
    {
      title: 'Requests/Min',
      value: metrics.requestsPerMinute.toString(),
      icon: <RefreshCw className="w-5 h-5" />,
      status: 'text-green-500 bg-green-100',
      statusIcon: <CheckCircle className="w-4 h-4" />,
      description: 'Requests per minute'
    },
    {
      title: 'Error Rate',
      value: `${metrics.errorRate}%`,
      icon: <AlertTriangle className="w-5 h-5" />,
      status: getStatusColor(metrics.errorRate, { good: 1, warning: 5 }),
      statusIcon: getStatusIcon(metrics.errorRate, { good: 1, warning: 5 }),
      description: 'Error percentage'
    }
  ]

  // Extract vitals
  const lcp = rum?.overall?.LCP?.p75 ?? null
  const inp = rum?.overall?.INP?.p75 ?? null
  const cls = rum?.overall?.CLS?.p75 ?? null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Monitor</h2>
          <p className="text-gray-600">Real-time system performance metrics & Core Web Vitals</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={windowMs}
            onChange={(e) => setWindowMs(parseInt(e.target.value, 10))}
            className="text-sm border rounded-md px-2 py-1"
            aria-label="RUM window"
          >
            <option value={3600000}>Last 1h</option>
            <option value={21600000}>Last 6h</option>
            <option value={43200000}>Last 12h</option>
            <option value={86400000}>Last 24h</option>
            <option value={172800000}>Last 48h</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">System Status</h3>
            <p className="text-gray-600">Uptime: {metrics.uptime}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Operational</span>
          </div>
        </div>
      </div>

      {/* Core Web Vitals (p75 targets: LCP ≤ 2500ms, INP ≤ 200ms, CLS ≤ 0.1) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Core Web Vitals (p75)</h3>
          </div>
          <div className="text-xs text-gray-500">
            Sample size: {rum?.count ?? 0} • Window: {Math.round((windowMs/3600000))}h
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <VitalCard
            title="LCP"
            value={fmtMs(lcp)}
            description="Largest Contentful Paint"
            thresholds={{ good: 2500, warning: 4000 }}
            numeric={lcp ?? Infinity}
          />
          <VitalCard
            title="INP"
            value={fmtMs(inp)}
            description="Interaction to Next Paint"
            thresholds={{ good: 200, warning: 400 }}
            numeric={inp ?? Infinity}
          />
          <VitalCard
            title="CLS"
            value={clsStr(cls)}
            description="Cumulative Layout Shift"
            thresholds={{ good: 0.1, warning: 0.25 }}
            numeric={cls ?? Infinity}
          />
        </div>

        {/* Device breakdown */}
        {rum?.byDevice && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">By device (p75)</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(rum.byDevice).map(([dev, vals]) => (
                <div key={dev} className="rounded-md border border-gray-200 p-3">
                  <div className="text-xs text-gray-500 mb-1 capitalize">{dev}</div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>LCP {fmtMs(vals.LCP.p75)}</span>
                    <span>INP {fmtMs(vals.INP.p75)}</span>
                    <span>CLS {clsStr(vals.CLS.p75)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Backend Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {metric.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{metric.title}</h3>
                  <p className="text-sm text-gray-500">{metric.description}</p>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${metric.status}`}>
                {metric.statusIcon}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {metric.value}
            </div>
            <div className="h-8 bg-gray-50 rounded flex items-end justify-between px-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="w-2 bg-blue-200 rounded-t" style={{ height: `${Math.random() * 100}%` }} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {metrics.lastUpdated} {rum?.generatedAt ? `• RUM: ${rum.generatedAt}` : ''}
      </div>
    </div>
  )
}

// Small vital card component
function VitalCard({
  title,
  value,
  description,
  thresholds,
  numeric,
}: {
  title: string
  value: string
  description: string
  thresholds: { good: number; warning: number }
  numeric: number
}) {
  const status =
    numeric <= thresholds.good
      ? 'text-green-600 bg-green-100'
      : numeric <= thresholds.warning
      ? 'text-yellow-600 bg-yellow-100'
      : 'text-red-600 bg-red-100'

  const Icon =
    numeric <= thresholds.good ? CheckCircle : numeric <= thresholds.warning ? Clock : AlertTriangle

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs text-gray-500">{description}</div>
          <div className="text-lg font-semibold text-gray-900">{title}</div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${status}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-2 h-8 bg-gray-50 rounded flex items-end justify-between px-1">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="w-2 rounded-t" style={{ background: 'rgba(147,51,234,0.25)', height: `${Math.random() * 100}%` }} />
        ))}
      </div>
    </div>
  )
}