'use client'

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import CatalogImageModal from './CatalogImageModal'

export default function CatalogImageButton() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
                <ImageIcon className="w-5 h-5 mr-2" />
                Catalogue IMAGE
            </button>

            <CatalogImageModal 
                isOpen={isOpen} 
                onClose={() => setIsOpen(false)} 
            />
        </>
    )
}
