'use client'

import { useState } from 'react'
import { Share2, Loader2, Check } from 'lucide-react'
import { sharePostToN8n } from '@/lib/actions/blog'

interface ShareToN8nButtonProps {
    postId: string
}

export default function ShareToN8nButton({ postId }: ShareToN8nButtonProps) {
    const [isSharing, setIsSharing] = useState(false)
    const [isShared, setIsShared] = useState(false)

    const handleShare = async () => {
        if (!confirm('Partager cet article sur Facebook via n8n ?')) return

        setIsSharing(true)
        try {
            const res = await sharePostToN8n(postId)
            if (res.success) {
                setIsShared(true)
                setTimeout(() => setIsShared(false), 3000)
            } else {
                alert(res.error || 'Erreur lors du partage')
            }
        } catch (error) {
            alert('Erreur réseau lors du partage')
        } finally {
            setIsSharing(false)
        }
    }

    return (
        <button
            onClick={handleShare}
            disabled={isSharing || isShared}
            className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-50"
            title="Partager sur Facebook (n8n)"
        >
            {isSharing ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : isShared ? (
                <Check className="w-4 h-4 text-emerald-600" />
            ) : (
                <Share2 className="w-4 h-4" />
            )}
        </button>
    )
}
