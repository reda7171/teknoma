'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddTransactionModal } from './CashflowActions'

export default function CashflowAddButton() {
    const [open, setOpen] = useState(false)
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 transition-all shadow-xl active:scale-95"
            >
                <Plus className="w-4 h-4" />
                Ajouter
            </button>
            {open && <AddTransactionModal onClose={() => setOpen(false)} />}
        </>
    )
}
