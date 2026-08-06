'use client'

import { usePathname } from 'next/navigation'
import { Users } from 'lucide-react'

interface Props {
    url?: string
}

export default function WhatsAppChannelButton({ url }: Props) {
    const pathname = usePathname()

    // Ne pas afficher dans l'admin, le checkout, ni login/register
    // ou s'il n'y a pas d'URL paramétrée, ni sur les pages produit
    if (!url || pathname?.includes('/admin') || pathname?.includes('/checkout') || pathname?.includes('/login')) {
        return null
    }
    if (pathname?.match(/\/(books|packs|mon-enfant|fourniture-bureau)\/[^/]+$/)) {
        return null
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center bg-[#25D366] text-white p-2 sm:p-3 rounded-r-xl shadow-lg hover:bg-[#128C7E] transition-all group"
            aria-label="Rejoindre notre chaîne WhatsApp"
        >
            <Users className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[200px] transition-all duration-500 font-bold ml-0 group-hover:ml-3 text-sm">
                S'abonner à la chaîne
            </span>
        </a>
    )
}
