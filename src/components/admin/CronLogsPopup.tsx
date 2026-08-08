'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react'

export default function CronLogsPopup() {
    const [logs, setLogs] = useState<any[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch('/api/admin/cron-logs')
                if (res.ok) {
                    const data = await res.json()
                    if (data && data.length > 0) {
                        setLogs(data)
                        setIsOpen(true)
                    }
                }
            } catch (err) {
                console.error('Error fetching cron logs:', err)
            }
        }
        
        fetchLogs()
    }, [])

    const handleClose = async () => {
        setIsLoading(true)
        try {
            const logIds = logs.map(l => l.id)
            await fetch('/api/admin/cron-logs', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logIds })
            })
            setIsOpen(false)
        } catch (error) {
            console.error('Error marking logs as read:', error)
            setIsOpen(false)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-slate-900 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Actions Automatiques (Cron)</h2>
                            <p className="text-sm text-slate-300">Rapport des tâches exécutées récemment</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose}
                        disabled={isLoading}
                        className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                    <div className="space-y-4">
                        {logs.map((log) => (
                            <div 
                                key={log.id} 
                                className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex gap-4 items-start"
                            >
                                <div className="mt-1">
                                    {log.status === 'SUCCESS' ? (
                                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                                    ) : (
                                        <AlertCircle className="w-6 h-6 text-red-500" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                            {log.jobName}
                                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                                                log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {log.status}
                                            </span>
                                        </h3>
                                        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                            <Clock className="w-3 h-3" />
                                            {new Date(log.createdAt).toLocaleString('fr-FR')}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-2">{log.message}</p>
                                    
                                    {log.details && (
                                        <pre className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-500 overflow-x-auto">
                                            {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-white border-t border-slate-100">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? 'Fermeture...' : "J'ai compris, fermer"}
                    </button>
                </div>
            </div>
        </div>
    )
}
