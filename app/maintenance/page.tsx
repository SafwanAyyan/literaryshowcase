"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Wrench, Clock, Mail, ArrowLeft } from "lucide-react"
import { FloatingParticles } from "@/components/floating-particles"
import { InteractiveBackground } from "@/components/interactive-background"
import Link from "next/link"

export default function MaintenancePage() {
  const [maintenanceData, setMaintenanceData] = useState({
    message: 'The Literary Showcase is currently undergoing maintenance. Please check back soon!',
    siteName: 'Literary Showcase'
  })

  useEffect(() => {
    // Load maintenance settings
    const loadMaintenanceData = async () => {
      try {
        const response = await fetch('/api/admin/settings')
        const result = await response.json()
        if (result.success) {
          setMaintenanceData({
            message: result.data.maintenanceMessage || maintenanceData.message,
            siteName: result.data.siteName || maintenanceData.siteName
          })
        }
      } catch (error) {
        console.error('Failed to load maintenance data:', error)
      }
    }
    
    loadMaintenanceData()
  }, [])

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <InteractiveBackground />
      <FloatingParticles />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-2xl mx-auto"
        >
          {/* Icon */}
          <motion.div
            variants={itemVariants}
            className="mb-8 flex justify-center"
          >
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center glass-card">
                <Wrench className="w-12 h-12 text-purple-400" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-purple-500/30 rounded-full"
              />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl font-bold text-white mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            Under Maintenance
          </motion.h1>

          {/* Site Name */}
          <motion.p
            variants={itemVariants}
            className="text-xl text-gray-300 mb-8 font-medium"
          >
            {maintenanceData.siteName}
          </motion.p>

          {/* Message */}
          <motion.div
            variants={itemVariants}
            className="glass-card p-8 mb-8 max-w-lg mx-auto"
          >
            <p className="text-gray-200 text-lg leading-relaxed">
              {maintenanceData.message}
            </p>
          </motion.div>

          {/* Status Indicators */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            <div className="glass-card p-4 text-center">
              <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h3 className="text-white font-medium mb-1">Estimated Time</h3>
              <p className="text-gray-400 text-sm">Usually 30-60 minutes</p>
            </div>

            <div className="glass-card p-4 text-center">
              <Wrench className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h3 className="text-white font-medium mb-1">What We're Doing</h3>
              <p className="text-gray-400 text-sm">System improvements</p>
            </div>

            <div className="glass-card p-4 text-center">
              <Mail className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <h3 className="text-white font-medium mb-1">Need Help?</h3>
              <p className="text-gray-400 text-sm">Contact support</p>
            </div>
          </motion.div>

          {/* Animated Progress Bar */}
          <motion.div
            variants={itemVariants}
            className="mb-8"
          >
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 text-sm">Maintenance Progress</span>
                <span className="text-purple-400 text-sm font-medium">In Progress...</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <motion.div
                  className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "75%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </div>
            </div>
          </motion.div>

          {/* Links */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Refresh Page
            </button>

            <Link
              href="/admin"
              className="flex items-center space-x-2 px-6 py-3 glass-card hover:bg-white/20 text-gray-300 hover:text-white rounded-lg transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Admin Panel</span>
            </Link>
          </motion.div>

          {/* Footer */}
          <motion.div
            variants={itemVariants}
            className="mt-12 text-center"
          >
            <p className="text-gray-500 text-sm">
              © 2024 {maintenanceData.siteName}. We'll be back shortly.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Elements */}
      <motion.div
        animate={{ y: [-20, 20, -20] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-20 w-8 h-8 bg-purple-500/20 rounded-full blur-sm"
      />
      <motion.div
        animate={{ y: [20, -20, 20] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-20 right-20 w-12 h-12 bg-pink-500/20 rounded-full blur-sm"
      />
      <motion.div
        animate={{ x: [-15, 15, -15] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-10 w-6 h-6 bg-blue-500/20 rounded-full blur-sm"
      />
    </div>
  )
}