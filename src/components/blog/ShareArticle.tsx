'use client'

import { Facebook, Twitter, Linkedin, Link2, MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface Props {
    title: string
    // Mode vertical pour la sidebar
    vertical?: boolean
    translations?: {
        facebook: string
        twitter: string
        linkedin: string
        whatsapp: string
        copyLink: string
        linkCopied: string
        shareTitle: string
    }
}

export default function ShareArticle({ title, vertical = false, translations }: Props) {
    const [url, setUrl] = useState('')
    const [copied, setCopied] = useState(false)
    const tDefault = useTranslations('BlogArticle')
    
    // Fonction helper pour obtenir la traduction (soit via les props soit via le hook)
    const t = (key: string) => {
        if (!translations) return tDefault(key)
        
        switch (key) {
            case 'Share.Facebook': return translations.facebook
            case 'Share.Twitter': return translations.twitter
            case 'Share.LinkedIn': return translations.linkedin
            case 'Share.WhatsApp': return translations.whatsapp
            case 'Share.CopyLink': return translations.copyLink
            case 'Share.LinkCopied': return translations.linkCopied
            case 'ShareTitle': return translations.shareTitle
            default: return tDefault(key)
        }
    }

    useEffect(() => {
        setUrl(window.location.href)
    }, [])

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }

    if (!url) return null

    const encodedUrl = encodeURIComponent(url)
    const encodedTitle = encodeURIComponent(title)

    const platforms = [
        {
            label: t('Share.Facebook'),
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            color: 'hover:bg-[#1877F2] hover:border-[#1877F2]',
            icon: <Facebook className="w-4 h-4" />,
        },
        {
            label: t('Share.Twitter'),
            href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            color: 'hover:bg-black hover:border-black',
            icon: <Twitter className="w-4 h-4" />,
        },
        {
            label: t('Share.LinkedIn'),
            href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
            color: 'hover:bg-[#0A66C2] hover:border-[#0A66C2]',
            icon: <Linkedin className="w-4 h-4" />,
        },
        {
            label: t('Share.WhatsApp'),
            href: `https://wa.me/?text=${encodedTitle} - ${encodedUrl}`,
            color: 'hover:bg-[#25D366] hover:border-[#25D366]',
            icon: <MessageCircle className="w-4 h-4" />,
        },
    ]

    if (vertical) {
        // Mode sidebar : boutons avec label
        return (
            <div className="flex flex-col gap-2 w-full">
                {platforms.map((p) => (
                    <a
                        key={p.label}
                        href={p.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-gray-100 text-gray-500 hover:text-white transition-all text-sm font-bold ${p.color}`}
                        aria-label={p.label}
                    >
                        {p.icon}
                        {p.label}
                    </a>
                ))}
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-gray-100 text-gray-500 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all text-sm font-bold relative"
                    aria-label={t('Share.CopyLink')}
                >
                    <Link2 className="w-4 h-4" />
                    {copied ? t('Share.LinkCopied') : t('Share.CopyLink')}
                </button>
            </div>
        )
    }

    // Mode horizontal (défaut)
    return (
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <span className="text-[10px] rtl:text-xs font-black uppercase tracking-widest rtl:tracking-normal text-gray-400 mr-2 w-full sm:w-auto mb-1 sm:mb-0">{t('ShareTitle')}</span>
            {platforms.map((p) => (
                <a
                    key={p.label}
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center hover:text-white transition-all text-slate-500 ${p.color}`}
                    aria-label={p.label}
                >
                    {p.icon}
                </a>
            ))}
            <button
                onClick={handleCopy}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all text-slate-500 relative"
                aria-label={t('Share.CopyLink')}
            >
                <Link2 className="w-4 h-4" />
                {copied && (
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50">
                        {t('Share.LinkCopied') || 'Copied!'}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                    </span>
                )}
            </button>
        </div>
    )
}
