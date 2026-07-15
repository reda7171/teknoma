'use client'

import { useEffect, useRef } from 'react'
import { logPostReadTime } from '@/lib/actions/blog'

export default function PostTimeTracker({ postId }: { postId: string }) {
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        // Log 15 seconds every 15 seconds while the page is open and focused
        intervalRef.current = setInterval(() => {
            if (document.visibilityState === 'visible') {
                logPostReadTime(postId, 15).catch(() => {})
            }
        }, 15000)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [postId])

    return null
}
