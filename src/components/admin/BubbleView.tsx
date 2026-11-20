'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Bubble {
    id: number
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    color: string
    label: string
    value: string
    opacity: number
    pulsePhase: number
}

interface BubbleViewProps {
    stats: Array<{ name: string; value: string | number; color: string }>
    onClose: () => void
}

// Couleurs riches sans mauve/violet
const COLORS = [
    '#2563eb', // blue
    '#16a34a', // green
    '#ea580c', // orange
    '#dc2626', // red
    '#0891b2', // cyan
    '#b45309', // amber
    '#0f766e', // teal
    '#9f1239', // rose
    '#1d4ed8', // indigo-blue
    '#15803d', // dark green
]

export default function BubbleView({ stats, onClose }: BubbleViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const bubblesRef = useRef<Bubble[]>([])
    const animFrameRef = useRef<number>(0)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Dimension du canvas = fenêtre
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight

        const W = canvas.width
        const H = canvas.height

        // Créer les bulles
        bubblesRef.current = stats.map((s, i) => {
            const isMobile = W < 768;
            const baseRadius = isMobile ? 35 : 70;
            const randomRadius = isMobile ? 30 : 60;
            const radius = baseRadius + Math.random() * randomRadius;
            return {
                id: i,
                x: radius + Math.random() * (W - radius * 2),
                y: radius + Math.random() * (H - radius * 2),
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                radius,
                color: COLORS[i % COLORS.length],
                label: s.name,
                value: String(s.value),
                opacity: 0,
                pulsePhase: Math.random() * Math.PI * 2,
            }
        })

        setReady(true)

        // Fade-in
        let fadeTimer = 0
        const fadeIn = setInterval(() => {
            bubblesRef.current.forEach(b => {
                b.opacity = Math.min(1, b.opacity + 0.05)
            })
            fadeTimer++
            if (fadeTimer > 20) clearInterval(fadeIn)
        }, 30)

        function draw(time: number) {
            if (!canvas || !ctx) return
            const W = canvas.width
            const H = canvas.height

            ctx.clearRect(0, 0, W, H)

            // Fond sombre
            ctx.fillStyle = '#050a14'
            ctx.fillRect(0, 0, W, H)

            // Grille subtile
            ctx.strokeStyle = 'rgba(255,255,255,0.03)'
            ctx.lineWidth = 1
            for (let x = 0; x < W; x += 60) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
            }
            for (let y = 0; y < H; y += 60) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
            }

            bubblesRef.current.forEach((b, idx) => {
                // Mouvement
                b.x += b.vx
                b.y += b.vy
                b.pulsePhase += 0.02

                // Rebond sur les bords
                if (b.x - b.radius < 0) { b.x = b.radius; b.vx = Math.abs(b.vx) }
                if (b.x + b.radius > W) { b.x = W - b.radius; b.vx = -Math.abs(b.vx) }
                if (b.y - b.radius < 0) { b.y = b.radius; b.vy = Math.abs(b.vy) }
                if (b.y + b.radius > H) { b.y = H - b.radius; b.vy = -Math.abs(b.vy) }

                // Collision entre bulles
                for (let j = idx + 1; j < bubblesRef.current.length; j++) {
                    const b2 = bubblesRef.current[j]
                    const dx = b2.x - b.x
                    const dy = b2.y - b.y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    const minDist = b.radius + b2.radius + 8
                    if (dist < minDist && dist > 0) {
                        const nx = dx / dist
                        const ny = dy / dist
                        const overlap = (minDist - dist) / 2
                        b.x -= nx * overlap
                        b.y -= ny * overlap
                        b2.x += nx * overlap
                        b2.y += ny * overlap
                        // Échanger vitesses
                        const dvx = b.vx - b2.vx
                        const dvy = b.vy - b2.vy
                        const dot = dvx * nx + dvy * ny
                        b.vx -= dot * nx * 0.8
                        b.vy -= dot * ny * 0.8
                        b2.vx += dot * nx * 0.8
                        b2.vy += dot * ny * 0.8
                    }
                }

                // Pulse radius
                const pulseR = b.radius + Math.sin(b.pulsePhase) * 4

                // Glow externe
                const glow = ctx.createRadialGradient(b.x, b.y, pulseR * 0.6, b.x, b.y, pulseR * 1.8)
                glow.addColorStop(0, b.color + '30')
                glow.addColorStop(1, 'transparent')
                ctx.beginPath()
                ctx.arc(b.x, b.y, pulseR * 1.8, 0, Math.PI * 2)
                ctx.fillStyle = glow
                ctx.globalAlpha = b.opacity
                ctx.fill()

                // Cercle principal gradient
                const grad = ctx.createRadialGradient(b.x - pulseR * 0.3, b.y - pulseR * 0.3, pulseR * 0.1, b.x, b.y, pulseR)
                grad.addColorStop(0, b.color + 'ff')
                grad.addColorStop(0.6, b.color + 'cc')
                grad.addColorStop(1, b.color + '44')

                ctx.beginPath()
                ctx.arc(b.x, b.y, pulseR, 0, Math.PI * 2)
                ctx.fillStyle = grad
                ctx.globalAlpha = b.opacity * 0.9
                ctx.fill()

                // Bordure brillante
                ctx.beginPath()
                ctx.arc(b.x, b.y, pulseR, 0, Math.PI * 2)
                ctx.strokeStyle = b.color + 'aa'
                ctx.lineWidth = 2
                ctx.globalAlpha = b.opacity
                ctx.stroke()

                // Reflet interne
                const reflet = ctx.createRadialGradient(b.x - pulseR * 0.35, b.y - pulseR * 0.35, 0, b.x - pulseR * 0.2, b.y - pulseR * 0.2, pulseR * 0.5)
                reflet.addColorStop(0, 'rgba(255,255,255,0.4)')
                reflet.addColorStop(1, 'rgba(255,255,255,0)')
                ctx.beginPath()
                ctx.arc(b.x, b.y, pulseR, 0, Math.PI * 2)
                ctx.fillStyle = reflet
                ctx.globalAlpha = b.opacity
                ctx.fill()

                // Texte valeur
                ctx.globalAlpha = b.opacity
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillStyle = '#ffffff'
                ctx.font = `bold ${Math.max(12, pulseR * 0.32)}px "Inter", sans-serif`
                ctx.shadowColor = 'rgba(0,0,0,0.5)'
                ctx.shadowBlur = 6
                ctx.fillText(b.value, b.x, b.y - (pulseR * 0.15))

                // Texte label
                ctx.font = `bold ${Math.max(8, pulseR * 0.15)}px "Inter", sans-serif`
                ctx.fillStyle = 'rgba(255,255,255,0.75)'
                ctx.shadowBlur = 3
                ctx.fillText(b.label.toUpperCase(), b.x, b.y + pulseR * 0.35)

                ctx.shadowBlur = 0
                ctx.globalAlpha = 1
            })

            animFrameRef.current = requestAnimationFrame(draw)
        }

        animFrameRef.current = requestAnimationFrame(draw)

        // Resize
        const handleResize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        window.addEventListener('resize', handleResize)

        return () => {
            cancelAnimationFrame(animFrameRef.current)
            clearInterval(fadeIn)
            window.removeEventListener('resize', handleResize)
        }
    }, [stats])

    return (
        <div className="fixed inset-0" style={{ background: '#050a14', zIndex: 99999 }}>
            <canvas ref={canvasRef} className="absolute inset-0" style={{ display: 'block' }} />

            {/* Bouton fermer */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-10 flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
            >
                <X className="w-4 h-4" />
                Fermer
            </button>

            {/* Label titre */}
            <div className="absolute top-6 left-6 z-10" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '10px 20px' }}>
                <span className="text-white font-black text-[10px] uppercase tracking-[0.3em] opacity-60">Tekno Store</span>
                <span className="text-white font-black text-[10px] uppercase tracking-[0.3em] ml-2">Dashboard Live</span>
            </div>
        </div>
    )
}
