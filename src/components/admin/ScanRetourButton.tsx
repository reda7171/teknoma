'use client'

import React, { useState } from 'react'
import { QrCode } from 'lucide-react'
import QRScannerModal from './QRScannerModal'

export default function ScanRetourButton({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={className || "flex items-center gap-3 px-6 py-3 bg-black text-white rounded-2xl hover:bg-gray-900 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95"}
            >
                <QrCode className="w-4 h-4 text-blue-500" />
                Scan Retour
            </button>

            <QRScannerModal 
                isOpen={isOpen} 
                onClose={() => setIsOpen(false)} 
            />
        </>
    )
}
