"use client"

import { motion } from 'framer-motion'

export default function ContentDetailLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="glass-card w-full max-w-2xl p-6 rounded-2xl text-center"
      >
        <div className="mx-auto h-6 w-36 rounded-full bg-white/10 shimmer mb-4" />
        <div className="space-y-3 text-left">
          <div className="h-4 w-5/6 rounded-md bg-white/10 shimmer" />
          <div className="h-4 w-11/12 rounded-md bg-white/10 shimmer" />
          <div className="h-4 w-3/4 rounded-md bg-white/10 shimmer" />
          <div className="h-4 w-10/12 rounded-md bg-white/10 shimmer" />
        </div>
        <div className="mt-6 h-10 w-full rounded-xl bg-white/10 shimmer" />
        <p className="mt-4 text-sm text-gray-300">Loading content…</p>
      </motion.div>
    </div>
  )
}


