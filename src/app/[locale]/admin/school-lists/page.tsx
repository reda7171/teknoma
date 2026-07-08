'use client'

import { useState, useEffect } from 'react'
import { getSchoolLists, updateSchoolListStatus, deleteSchoolList } from '@/lib/actions/admin-school-lists'
import { FileText, Loader2, Download, Trash2 } from 'lucide-react'
import { useUIStore } from '@/store/ui'

export default function AdminSchoolListsPage() {
    const [lists, setLists] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const { showNotification } = useUIStore()

    useEffect(() => {
        loadLists()
    }, [])

    const loadLists = async () => {
        try {
            const data = await getSchoolLists()
            setLists(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer cette liste ?")) return
        try {
            await deleteSchoolList(id)
            setLists(lists.filter(l => l.id !== id))
            showNotification("Liste supprimée", "success")
        } catch (error) {
            showNotification("Erreur lors de la suppression", "error")
        }
    }

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await updateSchoolListStatus(id, status)
            setLists(lists.map(l => l.id === id ? { ...l, status } : l))
            showNotification("Statut mis à jour", "success")
        } catch (error) {
            showNotification("Erreur", "error")
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>

    return (
        <div className="p-6">
            <h1 className="text-2xl font-black mb-6">Listes Scolaires Reçues</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 font-bold text-sm text-gray-500">Date</th>
                            <th className="p-4 font-bold text-sm text-gray-500">Client</th>
                            <th className="p-4 font-bold text-sm text-gray-500">Fichier</th>
                            <th className="p-4 font-bold text-sm text-gray-500">Statut</th>
                            <th className="p-4 font-bold text-sm text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lists.map(list => (
                            <tr key={list.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-4 text-sm text-gray-600">
                                    {new Date(list.createdAt).toLocaleDateString('fr-FR', {
                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                </td>
                                <td className="p-4">
                                    <p className="font-bold">{list.name}</p>
                                    <p className="text-sm text-gray-500">{list.phone}</p>
                                </td>
                                <td className="p-4">
                                    <a href={list.fileUrl} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100">
                                        <Download className="w-4 h-4" />
                                        Télécharger
                                    </a>
                                </td>
                                <td className="p-4">
                                    <select 
                                        value={list.status}
                                        onChange={(e) => handleStatusUpdate(list.id, e.target.value)}
                                        className="text-sm border border-gray-300 rounded-lg p-2 bg-white"
                                    >
                                        <option value="PENDING">En attente</option>
                                        <option value="PROCESSING">En traitement</option>
                                        <option value="COMPLETED">Terminée</option>
                                        <option value="CANCELLED">Annulée</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    <button onClick={() => handleDelete(list.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {lists.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">Aucune liste reçue pour le moment.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
