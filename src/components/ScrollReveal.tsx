import type { HTMLAttributes, ReactNode } from 'react'

interface ScrollRevealProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode
    className?: string
    animation?: 'animate-reveal-up' | 'animate-reveal-right' | 'animate-reveal-left'
    delay?: number
}

// Content is visible from the server render. CSS handles the entrance animation;
// no observer, effect, or hydration boundary is needed for this wrapper.
export default function ScrollReveal({
    children,
    className = '',
    animation = 'animate-reveal-up',
    delay = 0,
    style,
    ...props
}: ScrollRevealProps) {
    return (
        <div
            {...props}
            className={`${className} ${animation}`}
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards', ...style }}
        >
            {children}
        </div>
    )
}
