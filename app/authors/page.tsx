"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  BookOpen,
  Star,
  Award,
  Link as LinkIcon,
  Twitter,
  Github,
  Globe,
  Bookmark,
  Check,
  Clock,
  Tag as TagIcon,
} from "lucide-react"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

type Author = {
  id: string
  name: string
  bio: string
  expertise: string[]
  followers: number
  guides: number
  avgRating: number
  avatar?: string
  socials?: { type: "x" | "gh" | "web"; url: string }[]
  stats?: { contributions: number; since: string }
  related?: string[] // related authors ids
}

const AUTHORS: Author[] = [
  {
    id: "shakespeare",
    name: "William Shakespeare",
    bio:
      "Playwright and poet of the English Renaissance. Architect of psychological drama and musical language that still feels modern.",
    expertise: ["Drama", "Rhetoric", "Sonnets", "Tragedy", "Comedy"],
    followers: 12450,
    guides: 6,
    avgRating: 4.9,
    avatar: "/assets/authors/shakespeare/shakespeare.jpg",
    socials: [
      { type: "web", url: "/authors/shakespeare/learn" },
    ],
    stats: { contributions: 42, since: "2023-04-10" },
    related: ["dostoevsky"],
  },
  {
    id: "dostoevsky",
    name: "Fyodor Dostoevsky",
    bio:
      "Russian novelist of moral psychology. Explores conscience, suffering, and redemption with philosophical intensity.",
    expertise: ["Novel", "Ethics", "Psychology", "Realism"],
    followers: 9320,
    guides: 4,
    avgRating: 4.8,
    avatar: "/assets/authors/dostoevsky/dostoevsky.jpg",
    socials: [
      { type: "web", url: "/authors/dostoevsky/learn" },
    ],
    stats: { contributions: 24, since: "2023-06-02" },
    related: ["shakespeare"],
  },
]

type FollowMap = Record<string, boolean>
type BookmarkMap = Record<string, boolean>

function usePersistentToggle(key: string): [Record<string, boolean>, (id: string) => void] {
  const [map, setMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        setMap(JSON.parse(raw))
      } catch {
        // ignore
      }
    }
  }, [key])

  const toggle = useCallback((id: string) => {
    setMap((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(next))
      }
      return next
    })
  }, [key])

  return [map, toggle]
}

export default function AuthorsPage() {
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [tag, setTag] = useState<string>("all")
  const [followMap, toggleFollow] = usePersistentToggle("authors:follow") as [FollowMap, (id: string) => void]
  const [bookmarkMap, toggleBookmark] = usePersistentToggle("authors:bookmark") as [BookmarkMap, (id: string) => void]

  const allTags = useMemo(() => {
    const set = new Set<string>()
    AUTHORS.forEach((a) => a.expertise.forEach((t) => set.add(t)))
    return ["all", ...Array.from(set)]
  }, [])

  useEffect(() => {
    // Minimal artificial delay for skeleton demo; in real usage: fetch profiles
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return AUTHORS.filter((a) => {
      const matchesQ =
        q.length === 0 ||
        a.name.toLowerCase().includes(q) ||
        a.bio.toLowerCase().includes(q) ||
        a.expertise.some((e) => e.toLowerCase().includes(q))
      const matchesTag = tag === "all" || a.expertise.includes(tag)
      return matchesQ && matchesTag
    })
  }, [query, tag])

  const onFollow = (a: Author) => {
    toggleFollow(a.id)
    const following = !followMap[a.id]
    toast.success(`${following ? "Following" : "Unfollowed"} ${a.name}`, { id: `follow-${a.id}` })
  }

  const onBookmark = (a: Author) => {
    toggleBookmark(a.id)
    const b = !bookmarkMap[a.id]
    toast.success(`${b ? "Saved" : "Removed"} ${a.name} to bookmarks`, { id: `bookmark-${a.id}` })
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Authors</h1>
                <p className="text-gray-300">Discover author profiles, follow to track updates, and explore related guides.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search authors, expertise..."
                  aria-label="Search authors"
                  className="w-full sm:w-72 pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <BookOpen className="w-4 h-4" />
                </span>
              </div>

              <div className="relative">
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  aria-label="Filter by expertise"
                  className="w-full sm:w-48 pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                >
                  {allTags.map((t) => (
                    <option key={t} value={t}>
                      {t === "all" ? "All expertise" : t}
                    </option>
                  ))}
                </select>
                <TagIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results */}
        <section aria-live="polite" aria-busy={loading}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={`sk-${i}`} className="glass-card border-white/10">
                  <CardHeader className="flex-row items-center gap-4">
                    <Skeleton className="h-14 w-14 rounded-xl" aria-label="Loading author avatar" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-36 rounded-md" aria-label="Loading author name" />
                      <Skeleton className="h-3 mt-2 w-56 rounded-md" aria-label="Loading bio" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" aria-label="Loading tag" />
                      <Skeleton className="h-6 w-20 rounded-full" aria-label="Loading tag" />
                      <Skeleton className="h-6 w-12 rounded-full" aria-label="Loading tag" />
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between">
                    <Skeleton className="h-10 w-28 rounded-xl" aria-label="Loading action" />
                    <Skeleton className="h-10 w-10 rounded-xl" aria-label="Loading action" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                key={query + tag}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {filtered.map((a, idx) => (
                  <AuthorCard
                    key={a.id}
                    author={a}
                    followed={!!followMap[a.id]}
                    bookmarked={!!bookmarkMap[a.id]}
                    onFollow={() => onFollow(a)}
                    onBookmark={() => onBookmark(a)}
                    index={idx}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="glass-card p-8 max-w-md mx-auto">
                <h3 className="text-xl font-semibold text-white mb-2">No authors found</h3>
                <p className="text-gray-300">Try a different search term or filter.</p>
              </div>
            </div>
          )}
        </section>

        <div className="text-center">
          <Link href="/guides" className="text-gray-300 hover:text-white">Explore Guides</Link>
        </div>
      </div>
    </main>
  )
}

function AuthorCard({
  author,
  followed,
  bookmarked,
  onFollow,
  onBookmark,
  index,
}: {
  author: Author
  followed: boolean
  bookmarked: boolean
  onFollow: () => void
  onBookmark: () => void
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.25) }}
    >
      <Card className="glass-card border-white/10 focus-within:ring-2 focus-within:ring-purple-400/40 rounded-2xl">
        <CardHeader className="flex-row items-center gap-4">
          <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-white/10 border border-white/15">
            {author.avatar ? (
              <Image
                src={author.avatar}
                alt={`${author.name} avatar`}
                fill
                sizes="56px"
                className="object-cover"
                priority={false}
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-white/80 text-lg">
                {author.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="text-white">{author.name}</CardTitle>
            <CardDescription className="text-gray-300">{author.bio}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="flex flex-wrap gap-2 mb-3">
            {author.expertise.map((t) => (
              <Badge key={t} className="bg-white/10 text-purple-200 border-white/10">{t}</Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
            <span className="inline-flex items-center gap-1">
              <Users className="w-4 h-4" /> {Intl.NumberFormat().format(author.followers)}
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className="w-4 h-4" /> {author.guides} guides
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-300" /> {author.avgRating.toFixed(1)}
            </span>
            {author.stats?.since && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-4 h-4" /> since {new Date(author.stats.since).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter className="justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={onFollow}
              aria-pressed={followed}
              aria-label={`${followed ? "Unfollow" : "Follow"} ${author.name}`}
              title={followed ? "Unfollow" : "Follow"}
              variant="brand"
              className="px-4"
            >
              {followed ? <Check className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              {followed ? "Following" : "Follow"}
            </Button>
            <Button
              onClick={onBookmark}
              aria-pressed={bookmarked}
              aria-label={`${bookmarked ? "Remove bookmark" : "Bookmark"} ${author.name}`}
              title={bookmarked ? "Remove bookmark" : "Bookmark"}
              variant="secondary"
              className="px-3"
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? "text-pink-300" : ""}`} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {author.socials?.map((s, i) => {
              const Icon = s.type === "x" ? Twitter : s.type === "gh" ? Github : Globe
              return (
                <Link
                  key={`${author.id}-soc-${i}`}
                  href={s.url}
                  target={s.type === "web" ? "_self" : "_blank"}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
                  aria-label={`${author.name} ${s.type === "web" ? "page" : s.type.toUpperCase()}`}
                >
                  <Icon className="w-4 h-4 text-white/90" />
                </Link>
              )
            })}

            <AuthorDetails author={author} />
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

function AuthorDetails({ author }: { author: Author }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="px-3">
          <LinkIcon className="w-4 h-4" />
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/10 bg-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{author.name}</DialogTitle>
          <DialogDescription className="text-gray-300">{author.bio}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Followers" value={Intl.NumberFormat().format(author.followers)} />
            <Stat label="Guides" value={String(author.guides)} />
            <Stat label="Avg. Rating" value={author.avgRating.toFixed(1)} />
            <Stat label="Contributions" value={String(author.stats?.contributions ?? 0)} />
          </div>

          <div>
            <div className="text-white/90 font-medium mb-2">Expertise</div>
            <div className="flex flex-wrap gap-2">
              {author.expertise.map((t) => (
                <Badge key={`d-${author.id}-${t}`} className="bg-white/10 text-purple-200 border-white/10">{t}</Badge>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="text-white/90 font-medium mb-2">Related</div>
            <div className="flex flex-wrap gap-2">
              {(author.related || []).map((rid) => {
                const r = AUTHORS.find((x) => x.id === rid)
                if (!r) return null
                return (
                  <Link
                    key={`r-${rid}`}
                    href={`/authors/${rid}/learn`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
                  >
                    <Award className="w-4 h-4 text-pink-300" />
                    <span className="text-white/90">{r.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="text-white/90 font-medium mb-2">Jump to guides</div>
            <div className="flex gap-2">
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1e1e1f] to-[#2a0a37] text-white hover:from-[#252526] hover:to-[#3a0f4d] transition-all duration-200"
              >
                <BookOpen className="w-4 h-4" /> View Guides
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="text-xs text-gray-300">{label}</div>
      <div className="text-white font-semibold">{value}</div>
    </div>
  )
}