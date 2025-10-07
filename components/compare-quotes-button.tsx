"use client"

import { useState } from 'react'
import { GitCompare, X, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import toast from 'react-hot-toast'
import type { ContentItem } from '@/types/literary'

interface CompareQuotesButtonProps {
  currentItem: ContentItem
  compact?: boolean
}

export function CompareQuotesButton({ currentItem, compact = false }: CompareQuotesButtonProps) {
  const [open, setOpen] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [comparison, setComparison] = useState<string | null>(null)

  const handleCompare = async () => {
    // For now, we'll implement a simple version
    // In future, user can select which item to compare with
    toast('Compare feature - select second item to compare', {
      icon: '🔄',
    })
    setOpen(true)
  }

  return (
    <>
      <Button
        variant="brand"
        size={compact ? "sm" : "default"}
        className="gap-2"
        onClick={handleCompare}
      >
        <GitCompare className="w-4 h-4" />
        {!compact && <span>Compare</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <GitCompare className="w-6 h-6 text-purple-400" />
              Compare Literary Pieces
            </DialogTitle>
          </DialogHeader>

          <div className="py-6">
            <p className="text-gray-400">
              Feature coming soon! You'll be able to select two pieces and see an AI-powered comparison of their themes, styles, and meanings.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
