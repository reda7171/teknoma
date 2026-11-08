'use client'

import { useEffect, useRef, useState } from 'react'

interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    className?: string
    animation?: 'animate-reveal-up' | 'animate-reveal-right' | 'animate-reveal-left'
    delay?: number
}

// Instance unique d'IntersectionObserver pour minimiser la consommation CPU et le TBT
let sharedObserver: IntersectionObserver | null = null
const observerCallbacks = new Map<Element, () => void>()

function getSharedObserver() {
    if (typeof window === 'undefined') return null
    if (!sharedObserver) {
        sharedObserver = new IntersectionObserver(
            (entries) => {
                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i]
                    if (entry.isIntersecting) {
                        const cb = observerCallbacks.get(entry.target)
                        if (cb) {
                            observerCallbacks.delete(entry.target)
                            sharedObserver?.unobserve(entry.target)
                            cb()
                        }
                    }
                }
            },
            {
                threshold: 0.05,
                rootMargin: '50px 0px',
            }
        )
    }
    return sharedObserver
}

export default function ScrollReveal({
    children,
    className = "",
    animation = "animate-reveal-up",
    delay = 0,
    ...props
}: ScrollRevealProps) {
    const [isVisible, setIsVisible] = useState(true)
    const elementRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = elementRef.current
        if (!el) return

        const observer = getSharedObserver()
        if (!observer) {
            setIsVisible(true)
            return
        }

        observerCallbacks.set(el, () => setIsVisible(true))
        observer.observe(el)

        return () => {
            observerCallbacks.delete(el)
            observer.unobserve(el)
        }
    }, [])

    return (
        <div
            ref={elementRef}
            className={`${className} ${!isVisible ? 'reveal-hidden' : animation}`}
            style={{
                animationDelay: `${delay}ms`,
                animationFillMode: 'forwards',
                ...props.style
            }}
            {...props}
        >
            {children}
        </div>
    )
}
