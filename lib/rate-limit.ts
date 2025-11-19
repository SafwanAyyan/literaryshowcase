/**
 * Simple in-memory rate limiter
 * Note: In a serverless environment like Vercel, this state is not shared across lambda instances.
 * It provides basic protection but for strict rate limiting, use Redis (e.g., Upstash).
 */

interface RateLimitContext {
    tokens: number
    lastRefill: number
}

export class RateLimiter {
    private limits: Map<string, RateLimitContext>
    private refillRate: number // tokens per second
    private maxTokens: number
    private windowSize: number // in milliseconds

    constructor(options: {
        tokensPerInterval: number
        interval: string | number // "hour", "minute", or ms
        fireImmediately?: boolean
    }) {
        this.limits = new Map()
        this.maxTokens = options.tokensPerInterval

        let intervalMs: number
        if (typeof options.interval === 'string') {
            switch (options.interval) {
                case 'hour': intervalMs = 3600000; break
                case 'minute': intervalMs = 60000; break
                case 'second': intervalMs = 1000; break
                default: throw new Error('Invalid interval')
            }
        } else {
            intervalMs = options.interval
        }

        this.windowSize = intervalMs
        this.refillRate = this.maxTokens / intervalMs
    }

    /**
     * Check if the request is allowed
     * @param key Unique identifier (IP address or User ID)
     * @returns true if allowed, false if limited
     */
    check(key: string): boolean {
        const now = Date.now()
        const record = this.limits.get(key)

        if (!record) {
            this.limits.set(key, {
                tokens: this.maxTokens - 1,
                lastRefill: now
            })
            return true
        }

        // Refill tokens based on time passed
        const timePassed = now - record.lastRefill
        const tokensToAdd = timePassed * this.refillRate

        const newTokens = Math.min(this.maxTokens, record.tokens + tokensToAdd)

        if (newTokens < 1) {
            return false
        }

        this.limits.set(key, {
            tokens: newTokens - 1,
            lastRefill: now
        })

        return true
    }

    /**
     * Clean up old entries to prevent memory leaks
     */
    cleanup() {
        const now = Date.now()
        for (const [key, record] of this.limits.entries()) {
            if (now - record.lastRefill > this.windowSize * 2) {
                this.limits.delete(key)
            }
        }
    }
}

// Singleton instance for API routes
export const apiLimiter = new RateLimiter({
    tokensPerInterval: 100, // 100 requests
    interval: 'minute'      // per minute
})

// Stricter limiter for AI routes
export const aiLimiter = new RateLimiter({
    tokensPerInterval: 10,  // 10 requests
    interval: 'minute'      // per minute
})
