'use client'

import { useState, useTransition } from 'react'
import { Eye, Trash2, Power, PowerOff, Edit } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { deleteSellerBook, toggleSellerBookStatus } from '@/lib/actions/seller/books'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface SellerBookActionsClientProps {
    bookId: string
    isActive: boolean
}

export default function SellerBookActionsClient({ bookId, isActive }: SellerBookActionsClientProps) {
    const [isPending, startTransition] = useTransition()
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handleToggleStatus = () => {
        startTransition(async () => {
            try {
                await toggleSellerBookStatus(bookId, isActive)
                toast.success(isActive ? 'Livre désactivé' : 'Livre activé')
                router.refresh()
            } catch (error) {
                toast.error('Erreur lors du changement de statut')
            }
        })
    }

    const handleDelete = () => {
        if (!window.confirm('Voulez-vous vraiment supprimer ce livre ? Cette action est irréversible.')) {
            return
        }

        setIsDeleting(true)
        startTransition(async () => {
            try {
                await deleteSellerBook(bookId)
                toast.success('Livre supprimé avec succès')
                router.refresh()
            } catch (error) {
                toast.error('Erreur lors de la suppression')
                setIsDeleting(false)
            }
        })
    }

    return (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap content-center items-center justify-center gap-3 p-4">
            <Link 
                href={`/books/${bookId}`} 
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
                title="Voir sur le site"
            >
                <Eye className="w-4 h-4 text-black" />
            </Link>

            <Link 
                href={`/seller/books/${bookId}/edit`} 
                className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl text-white"
                title="Modifier le livre"
            >
                <Edit className="w-4 h-4" />
            </Link>
            
            <button 
                disabled={isPending || isDeleting}
                onClick={handleToggleStatus}
                className={`w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl ${isActive ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'}`}
                title={isActive ? 'Désactiver le livre' : 'Activer le livre'}
            >
                {isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            </button>
            
            <button 
                disabled={isPending || isDeleting}
                onClick={handleDelete}
                className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl text-white disabled:opacity-50"
                title="Supprimer"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    )
}
