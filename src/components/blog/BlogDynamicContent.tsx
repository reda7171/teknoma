"use client"
import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const AccessibleTooltip = Tooltip as any;

export default function BlogDynamicContent({ html }: { html: string }) {
    // Regex pour isoler les commentaires HTML spécifiques et le bloc vidéo entier
    const parts = html.split(/(<!--\s*VIDEO_BLOCK\s*-->[\s\S]*?<\/div>|<!--\s*(?:CHART_BLOCK|POLL_BLOCK)[\s\S]*?-->)/gi)

    return (
        <>
            {parts.map((part, i) => {
                if (part.toUpperCase().startsWith('<!-- VIDEO_BLOCK')) {
                    const srcMatch = part.match(/src=["'](.*?)["']/);
                    if (srcMatch && srcMatch[1]) {
                        return (
                            <div key={i} className="my-8 relative w-full overflow-hidden rounded-2xl shadow-lg border border-slate-100 not-prose" style={{ paddingBottom: '56.25%' }}>
                                <iframe 
                                    src={srcMatch[1]} 
                                    className="absolute top-0 left-0 w-full h-full"
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen 
                                />
                            </div>
                        )
                    }
                    return null; // Si on ne trouve pas de src, on ne rend rien pour éviter l'erreur
                }

                if (part.toUpperCase().startsWith('<!-- CHART_BLOCK')) {
                    try {
                        const jsonStr = part.replace(/<!--\s*CHART_BLOCK/i, '').replace(/-->/, '').trim()
                        const config = JSON.parse(jsonStr)
                        
                        if (config.type === 'bar') {
                            const data = config.labels.map((label: string, idx: number) => {
                                const obj: any = { name: label }
                                config.datasets.forEach((ds: any) => {
                                    obj[ds.label] = ds.data[idx]
                                })
                                return obj
                            })
                            const keys = config.datasets.map((ds: any) => ds.label)

                            return (
                                <div key={i} className="my-8 h-80 w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 not-prose">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <AccessibleTooltip wrapperProps={{ 'aria-label': 'Détails du blog' }} cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                            {keys.map((key: string, idx: number) => (
                                                <Bar key={key} dataKey={key} fill={idx === 0 ? "#3b82f6" : "#10b981"} radius={[4, 4, 0, 0]} />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )
                        }
                    } catch(e) {
                        return null
                    }
                }
                
                if (part.toUpperCase().startsWith('<!-- POLL_BLOCK')) {
                     try {
                        const jsonStr = part.replace(/<!--\s*POLL_BLOCK/i, '').replace(/-->/, '').trim()
                        const config = JSON.parse(jsonStr)
                        return <PollBlock key={i} config={config} />
                     } catch(e) {
                         return null
                     }
                }

                if (part.trim() === '') return null
                return <div key={i} dangerouslySetInnerHTML={{ __html: part }} />
            })}
        </>
    )
}

function PollBlock({ config }: { config: { question: string, options: string[] } }) {
    const [selected, setSelected] = useState<number | null>(null)
    const [voted, setVoted] = useState(false)
    const [results, setResults] = useState<number[]>([])

    const handleVote = (idx: number) => {
        if (voted) return
        setSelected(idx)
        setVoted(true)
        // Générer des faux résultats simulés pour le visuel (total 100%)
        let fakeResults = config.options.map(() => Math.floor(Math.random() * 30))
        fakeResults[idx] += 40 // Donner l'avantage au choix de l'utilisateur
        const total = fakeResults.reduce((a, b) => a + b, 0)
        setResults(fakeResults.map(r => Math.round((r / total) * 100)))
    }

    return (
        <div className="my-8 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-6 md:p-8 rounded-[2rem] border border-blue-100 shadow-sm not-prose">
            <h4 className="font-black text-xl md:text-2xl mb-6 text-slate-800 leading-tight">
                {config.question}
            </h4>
            <div className="space-y-3">
                {config.options.map((opt: string, idx: number) => {
                    const isSelected = selected === idx
                    const percent = results[idx] || 0
                    
                    return (
                        <button 
                            key={idx} 
                            onClick={() => handleVote(idx)}
                            disabled={voted}
                            className={`relative w-full text-left p-4 rounded-xl border-2 transition-all duration-300 font-semibold overflow-hidden group
                                ${voted 
                                    ? (isSelected ? 'border-blue-500 bg-white' : 'border-transparent bg-white/60') 
                                    : 'border-transparent bg-white hover:border-blue-300 hover:shadow-md'
                                }
                            `}
                        >
                            {/* Barre de progression (affichée uniquement après le vote) */}
                            {voted && (
                                <div 
                                    className={`absolute inset-0 opacity-10 transition-all duration-1000 ease-out ${isSelected ? 'bg-blue-600' : 'bg-slate-400'}`}
                                    style={{ width: `${percent}%` }}
                                />
                            )}
                            
                            <div className="relative z-10 flex justify-between items-center gap-4">
                                <span className={`text-base md:text-lg ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {opt}
                                </span>
                                {voted && (
                                    <span className={`text-sm font-bold ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                                        {percent}%
                                    </span>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
            {voted && (
                <p className="mt-4 text-center text-sm font-bold text-blue-600/80 animate-pulse">
                    Merci pour votre participation !
                </p>
            )}
        </div>
    )
}
