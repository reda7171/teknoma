'use client'

import { useState } from 'react'
import { Bot, Play, AlertCircle, Loader2, CheckCircle2, Download } from 'lucide-react'

export default function FacebookBotClient({ books }: { books: { id: string, title: string, price: number, image: string | null }[] }) {
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [selectedBook, setSelectedBook] = useState<string>('')

    const selectedBookData = books.find(b => b.id === selectedBook)

    const handleLaunchBot = async () => {
        if (!selectedBook) {
            setMessage({ type: 'error', text: 'Veuillez sélectionner un livre à publier.' })
            return
        }

        setIsLoading(true)
        setMessage(null)
        try {
            const res = await fetch('/api/admin/bot/facebook', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId: selectedBook })
            })
            if (!res.ok) throw new Error('Erreur de lancement')
            
            setMessage({ type: 'success', text: 'Bot lancé avec succès sur votre machine !' })
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: 'Erreur lors du lancement du bot. Assurez-vous d\'être en local.' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <Bot className="w-8 h-8 text-[#10b981]" />
                    Bot Facebook Marketplace
                </h1>
                <p className="text-gray-500">Automatisez la création d'annonces sur Facebook Marketplace avec Puppeteer.</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
                <div className="text-sm text-blue-800 space-y-2">
                    <p className="font-bold">Attention : Environnement Local Uniquement</p>
                    <p>Ce bot nécessite d'ouvrir un navigateur physique (Chrome). Il ne fonctionnera que si le serveur est exécuté sur votre machine locale (Windows/Mac).</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Choisir le livre à publier :</label>
                    <select 
                        value={selectedBook}
                        onChange={(e) => setSelectedBook(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                    >
                        <option value="">-- Sélectionner un livre --</option>
                        {books.map(book => (
                            <option key={book.id} value={book.id}>
                                {book.title} ({book.price} MAD)
                            </option>
                        ))}
                    </select>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                        onClick={handleLaunchBot}
                        disabled={isLoading || !selectedBook}
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                        {isLoading ? 'Lancement...' : 'Lancer le Bot Facebook'}
                    </button>

                    {selectedBookData?.image && (
                        <a 
                            href={`/api/admin/bot/download-image?url=${encodeURIComponent('https://riwaya.store' + selectedBookData.image)}`}
                            download="image_livre.png"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-100 text-gray-800 font-bold rounded-2xl hover:bg-gray-200 transition-colors w-full sm:w-auto"
                        >
                            <Download className="w-5 h-5" />
                            Télécharger l'image
                        </a>
                    )}
                </div>

                {message && (
                    <div className={`mt-6 p-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold ${
                        message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    )
}
