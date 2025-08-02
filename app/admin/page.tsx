"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session) {
      router.push("/admin/login")
      return
    }

    if ((session.user as any)?.role !== "admin") {
      router.push("/admin/login")
      return
    }
  }, [session, status, router])

  if (status === "loading") {
    return <LoadingSpinner />
  }

  if (!session || (session.user as any)?.role !== "admin") {
    return <LoadingSpinner />
  }

  return <AdminDashboard />
}