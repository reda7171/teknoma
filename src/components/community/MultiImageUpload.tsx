'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useUIStore } from '@/store/ui'

interface MultiImageUploadProps {
    onImagesSelect: (files: File[]) => void
    currentImages?: string[]
    onRemoveCurrent?: (index: number) => void
    maxImages?: number
}

export default function MultiImageUpload({ onImagesSelect, currentImages = [], onRemoveCurrent, maxImages = 5 }: MultiImageUploadProps) {
    const t = useTranslations('Common.ImageUpload')
    const { showNotification } = useUIStore()
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (files: FileList | null) => {
        if (!files) return

        const newFiles = Array.from(files)
        const totalImages = currentImages.length + selectedFiles.length + newFiles.length

        if (totalImages > maxImages) {
            showNotification(`Vous ne pouvez ajouter que ${maxImages} images maximum`, 'error')
            return
        }

        const validFiles: File[] = []
        const newPreviews: string[] = []
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

        newFiles.forEach(file => {
            if (!allowedTypes.includes(file.type)) {
                showNotification(t('FormatError'), 'error')
                return
            }
            if (file.size > 5 * 1024 * 1024) {
                showNotification(t('SizeError'), 'error')
                return
            }
            
            validFiles.push(file)
            
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreviews(prev => [...prev, reader.result as string])
            }
            reader.readAsDataURL(file)
        })

        const updatedFiles = [...selectedFiles, ...validFiles]
        setSelectedFiles(updatedFiles)
        onImagesSelect(updatedFiles)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        handleFileChange(e.dataTransfer.files)
    }

    const removeNewFile = (index: number) => {
        const newFiles = [...selectedFiles]
        newFiles.splice(index, 1)
        setSelectedFiles(newFiles)
        
        const newPreviewsArray = [...previews]
        newPreviewsArray.splice(index, 1)
        setPreviews(newPreviewsArray)
        
        onImagesSelect(newFiles)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    {t('Label')} (Max {maxImages})
                </label>
                <span className="text-xs font-bold text-gray-400">
                    {currentImages.length + selectedFiles.length} / {maxImages}
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {currentImages.map((img, idx) => (
                    <div key={`current-${idx}`} className="relative aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden group">
                        <Image src={img} alt="Current image" fill className="object-cover" />
                        {onRemoveCurrent && (
                            <button
                                type="button"
                                onClick={() => onRemoveCurrent(idx)}
                                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}

                {previews.map((preview, idx) => (
                    <div key={`new-${idx}`} className="relative aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden group">
                        <Image src={preview} alt="New image" fill className="object-cover" unoptimized />
                        <button
                            type="button"
                            onClick={() => removeNewFile(idx)}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {(currentImages.length + selectedFiles.length) < maxImages && (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={() => setIsDragging(false)}
                        onClick={() => fileInputRef.current?.click()}
                        className={`aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isDragging
                            ? 'border-black bg-gray-50 scale-105'
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                    >
                        <Upload className="w-6 h-6 text-gray-400" />
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Ajouter</span>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => handleFileChange(e.target.files)}
                className="hidden"
            />
        </div>
    )
}
