"use client"

import { motion, useMotionValue, useSpring } from "framer-motion"
import { useEffect } from "react"

export function InteractiveBackground() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 25, stiffness: 700 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const { innerWidth, innerHeight } = window

      mouseX.set((clientX / innerWidth - 0.5) * 100)
      mouseY.set((clientY / innerHeight - 0.5) * 100)
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Interactive gradient that follows mouse */}
      <motion.div
        style={{
          x,
          y,
        }}
        className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"
      />

      {/* Secondary interactive element */}
      <motion.div
        style={{
          x: useSpring(mouseX.get() * -0.5, springConfig),
          y: useSpring(mouseY.get() * -0.5, springConfig),
        }}
        className="absolute top-1/3 left-1/3 w-64 h-64 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-2xl"
      />
    </div>
  )
}
