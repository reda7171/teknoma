'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, AlertCircle, ChevronDown, ChevronRight, Edit2, Loader2 } from 'lucide-react'
import { updateCategoryTree } from '@/lib/actions/category-tree'
import type { CategoryTree } from '@/lib/constants/categories'
import { useRouter } from 'next/navigation'

export default function CategoryTreeForm({ 
    initialTree,
    counts = {}
}: { 
    initialTree: CategoryTree,
    counts?: Record<string, number>
}) {
    const [tree, setTree] = useState<CategoryTree>(initialTree)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const router = useRouter()

    const handleSave = async () => {
        setLoading(true)
        setError(null)
        setSuccess(false)
        try {
            const res = await updateCategoryTree(tree)
            if (res.success) {
                setSuccess(true)
                setTimeout(() => setSuccess(false), 3000)
                router.refresh()
            } else {
                setError(res.error || "Une erreur est survenue")
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const toggleExpand = (cat: string) => {
        setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }))
    }

    const addMainCategory = () => {
        const name = prompt("Nom de la nouvelle catégorie principale:")
        if (name && name.trim()) {
            if (tree[name]) {
                alert("Cette catégorie existe déjà.")
                return
            }
            setTree(prev => ({ ...prev, [name]: [] }))
            setExpanded(prev => ({ ...prev, [name]: true }))
        }
    }

    const renameMainCategory = (oldName: string) => {
        const newName = prompt("Nouveau nom pour la catégorie principale:", oldName)
        if (newName && newName.trim() && newName !== oldName) {
            if (tree[newName]) {
                alert("Une catégorie avec ce nom existe déjà.")
                return
            }
            const newTree = { ...tree }
            newTree[newName] = newTree[oldName]
            delete newTree[oldName]
            setTree(newTree)
            
            setExpanded(prev => {
                const next = { ...prev }
                next[newName] = next[oldName]
                delete next[oldName]
                return next
            })
        }
    }

    const deleteMainCategory = (name: string) => {
        if (confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${name}" et toutes ses sous-catégories ?`)) {
            const newTree = { ...tree }
            delete newTree[name]
            setTree(newTree)
        }
    }

    const addSubCategory = (parentCat: string) => {
        const name = prompt(`Nouvelle sous-catégorie pour "${parentCat}":`)
        if (name && name.trim()) {
            const currentSubs = tree[parentCat] || []
            if (currentSubs.includes(name)) {
                alert("Cette sous-catégorie existe déjà ici.")
                return
            }
            setTree(prev => ({
                ...prev,
                [parentCat]: [...currentSubs, name]
            }))
            // S'assurer qu'il est étendu
            setExpanded(prev => ({ ...prev, [parentCat]: true }))
        }
    }

    const renameSubCategory = (parentCat: string, oldName: string, index: number) => {
        const newName = prompt("Nouveau nom pour la sous-catégorie:", oldName)
        if (newName && newName.trim() && newName !== oldName) {
            const currentSubs = [...(tree[parentCat] || [])]
            if (currentSubs.includes(newName)) {
                alert("Cette sous-catégorie existe déjà ici.")
                return
            }
            currentSubs[index] = newName
            setTree(prev => ({
                ...prev,
                [parentCat]: currentSubs
            }))
        }
    }

    const deleteSubCategory = (parentCat: string, index: number) => {
        if (confirm("Supprimer cette sous-catégorie ?")) {
            const currentSubs = [...(tree[parentCat] || [])]
            currentSubs.splice(index, 1)
            setTree(prev => ({
                ...prev,
                [parentCat]: currentSubs
            }))
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={addMainCategory}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Ajouter une catégorie principale
                </button>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enregistrer les modifications
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                </div>
            )}
            
            {success && (
                <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                    Modifications enregistrées avec succès !
                </div>
            )}

            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                {Object.entries(tree).length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Aucune catégorie. Commencez par en ajouter une.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {Object.entries(tree).map(([catName, subCats]) => {
                            const isExpanded = expanded[catName] !== false // Default to true if not set
                            
                            return (
                                <div key={catName} className="bg-white">
                                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer flex-1"
                                            onClick={() => toggleExpand(catName)}
                                        >
                                            <button className="p-1 text-gray-400 hover:text-gray-600 rounded-md">
                                                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                            </button>
                                            <span className="font-semibold text-gray-900">
                                                {catName}
                                                {counts[catName] !== undefined && (
                                                    <span className="ml-2 text-xs font-medium text-gray-500">
                                                        ({counts[catName]} livre{counts[catName] > 1 ? 's' : ''})
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                                {subCats.length}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => addSubCategory(catName)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Ajouter une sous-catégorie"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => renameMainCategory(catName)}
                                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                                                title="Renommer"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteMainCategory(catName)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="pl-12 pr-4 pb-4 space-y-2 border-t border-gray-100 pt-3 bg-gray-50/50">
                                            {subCats.length === 0 ? (
                                                <p className="text-sm text-gray-400 italic py-2">
                                                    Aucune sous-catégorie.
                                                </p>
                                            ) : (
                                                subCats.map((subCat, index) => (
                                                    <div key={`${catName}-${index}`} className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-lg group shadow-sm">
                                                        <span className="text-sm text-gray-700 font-medium">
                                                            {subCat}
                                                            {counts[`${catName}::${subCat}`] !== undefined && (
                                                                <span className="ml-2 text-xs font-medium text-gray-500">
                                                                    ({counts[`${catName}::${subCat}`]} livre{counts[`${catName}::${subCat}`] > 1 ? 's' : ''})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => renameSubCategory(catName, subCat, index)}
                                                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                                                                title="Renommer"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteSubCategory(catName, index)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                                title="Supprimer"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
