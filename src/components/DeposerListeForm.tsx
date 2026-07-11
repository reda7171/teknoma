'use client'

import { useState, useRef } from 'react'
import { uploadSchoolList } from '@/lib/actions/school-list-upload'
import { Upload, FileText, CheckCircle2, Loader2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function DeposerListeForm() {
    const [file, setFile] = useState<File | null>(null)
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const t = useTranslations('DeposerListe')

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setError(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || !name || !phone) {
            setError(t('fillAllError'))
            return
        }

        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', name)
        formData.append('phone', phone)

        const result = await uploadSchoolList(formData)

        if (result.success) {
            setSuccess(true)
        } else {
            setError(result.error || t('genericError'))
        }
        setLoading(false)
    }

    if (success) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-[2rem] p-8 md:p-12 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-black text-green-800 mb-4">{t('successTitle')}</h3>
                <p className="text-green-700 font-medium">
                    {t('successMsg')}
                </p>
                <button 
                    onClick={() => { setSuccess(false); setFile(null); setName(''); setPhone(''); }}
                    className="mt-8 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors inline-block"
                >
                    {t('sendAnother')}
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-gray-100 relative text-left">
            <h3 className="text-2xl font-black text-black mb-8 text-center">{t('formTitle')}</h3>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-bold text-sm text-center">
                    {error}
                </div>
            )}

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('fullName')}</label>
                    <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('fullNamePlaceholder')}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('phone')}</label>
                    <input 
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t('phonePlaceholder')}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('fileLabel')}</label>
                    
                    {!file ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#10b981] hover:bg-green-50/30 transition-all group"
                        >
                            <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#10b981] mb-2" />
                            <p className="text-sm font-bold text-gray-500 group-hover:text-[#10b981]">
                                {t('dragDrop')}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{t('fileLimits')}</p>
                        </div>
                    ) : (
                        <div className="w-full p-4 border border-green-200 bg-green-50 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-green-800 truncate">{file.name}</p>
                                    <p className="text-xs text-green-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setFile(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-green-200 text-green-700 transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        className="hidden"
                    />
                </div>
            </div>

            <button 
                type="submit"
                disabled={loading || !file || !name || !phone}
                className="w-full mt-8 px-6 py-4 bg-[#10b981] text-white font-black uppercase tracking-widest rounded-xl hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                {loading ? t('sending') : t('send')}
            </button>
        </form>
    )
}
