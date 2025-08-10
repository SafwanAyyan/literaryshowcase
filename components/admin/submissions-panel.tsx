"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  MessageSquare, 
  User, 
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Submission {
  id: string
  content: string
  author: string
  source?: string
  category: string
  type: string
  submitterName?: string
  submitterEmail?: string
  submitterMessage?: string
  status: 'pending' | 'approved' | 'rejected'
  adminNotes?: string
  createdAt: string
  reviewedAt?: string
  reviewedBy?: string
}

interface SubmissionsPanelProps {
  onSubmissionUpdate?: () => void
}

export function SubmissionsPanel({ onSubmissionUpdate }: SubmissionsPanelProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  const loadSubmissions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/submissions?status=${selectedStatus}&page=${currentPage}&limit=10`)
      const result = await response.json()
      
      if (result.success) {
        setSubmissions(result.data.submissions)
        setTotalPages(result.data.pagination.pages)
      } else {
        toast.error('Failed to load submissions')
      }
    } catch (error) {
      console.error('Error loading submissions:', error)
      toast.error('Failed to load submissions')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSubmissions()
  }, [selectedStatus, currentPage])

  const handleReview = async (submissionId: string, action: 'approve' | 'reject') => {
    setIsReviewing(true)
    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          adminNotes: adminNotes.trim() || undefined
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.data.message)
        setSelectedSubmission(null)
        setAdminNotes('')
        loadSubmissions()
        onSubmissionUpdate?.()
      } else {
        toast.error(result.error || 'Failed to review submission')
      }
    } catch (error) {
      console.error('Error reviewing submission:', error)
      toast.error('Failed to review submission')
    } finally {
      setIsReviewing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'approved':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'rejected':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">User Submissions</h2>
          <p className="text-gray-300">Review and manage content submissions from users</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as any)
              setCurrentPage(1)
            }}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Submissions</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <button
            onClick={loadSubmissions}
            className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300">No submissions found</p>
          </div>
        ) : (
          submissions.map((submission) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {getStatusIcon(submission.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(submission.status)}`}>
                      {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-400">
                      {formatDate(submission.createdAt)}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-white font-medium mb-1">{submission.author}</p>
                    <p className="text-gray-300 text-sm">{submission.category} • {submission.type}</p>
                    {submission.source && (
                      <p className="text-gray-400 text-xs mt-1">Source: {submission.source}</p>
                    )}
                  </div>
                  
                  <p className="text-gray-300 mb-4">
                    {truncateText(submission.content, 150)}
                  </p>
                  
                  {/* Submitter Info */}
                  {(submission.submitterName || submission.submitterEmail) && (
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                      {submission.submitterName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {submission.submitterName}
                        </span>
                      )}
                      {submission.submitterEmail && (
                        <span>{submission.submitterEmail}</span>
                      )}
                    </div>
                  )}
                  
                  {submission.submitterMessage && (
                    <div className="flex items-start gap-2 text-sm text-gray-400 mb-3">
                      <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{submission.submitterMessage}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  {submission.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setSelectedSubmission(submission)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </button>
                    </>
                  )}
                  
                  {submission.status !== 'pending' && submission.adminNotes && (
                    <div className="text-xs text-gray-400 max-w-xs">
                      <strong>Admin Notes:</strong> {submission.adminNotes}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Previous
          </button>
          
          <span className="text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedSubmission(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Review Submission</h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Content</label>
                  <div className="p-3 bg-white/5 rounded-lg text-gray-300 whitespace-pre-wrap">
                    {selectedSubmission.content}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Author</label>
                    <p className="text-gray-300">{selectedSubmission.author}</p>
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">Category</label>
                    <p className="text-gray-300">{selectedSubmission.category}</p>
                  </div>
                </div>
                
                {selectedSubmission.source && (
                  <div>
                    <label className="block text-white font-medium mb-2">Source</label>
                    <p className="text-gray-300">{selectedSubmission.source}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-white font-medium mb-2">Admin Notes (Optional)</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this submission..."
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={3}
                    maxLength={500}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleReview(selectedSubmission.id, 'approve')}
                    disabled={isReviewing}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isReviewing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                  
                  <button
                    onClick={() => handleReview(selectedSubmission.id, 'reject')}
                    disabled={isReviewing}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isReviewing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 