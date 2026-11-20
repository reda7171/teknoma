'use client'

import { useState, useEffect, useRef } from 'react'
import { getSuggestions } from '@/lib/actions/community-books'
import { Loader2 } from 'lucide-react'

interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    suggestionType: 'title' | 'author'
    icon: React.ReactNode
}

export default function AutocompleteInput({ suggestionType, icon, ...props }: AutocompleteInputProps) {
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [value, setValue] = useState(props.value?.toString() || props.defaultValue?.toString() || '')
    const wrapperRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<NodeJS.Timeout>(null)

    useEffect(() => {
        if (props.value !== undefined && props.value !== value) {
            setValue(props.value.toString())
        }
    }, [props.value])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchSuggestions = async (query: string) => {
        if (query.length < 2) {
            setSuggestions([])
            setIsOpen(false)
            return
        }
        
        setIsLoading(true)
        const results = await getSuggestions(query, suggestionType)
        setSuggestions(results)
        setIsOpen(results.length > 0)
        setIsLoading(false)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setValue(newValue)
        if (props.onChange) props.onChange(e)

        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        
        timeoutRef.current = setTimeout(() => {
            fetchSuggestions(newValue)
        }, 300)
    }

    const handleSelect = (suggestion: string) => {
        setValue(suggestion)
        setIsOpen(false)
    }

    return (
        <div className="relative" ref={wrapperRef}>
            {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">{icon}</div>}
            <input
                {...props}
                value={value}
                onChange={handleChange}
                onFocus={() => {
                    if (suggestions.length > 0) setIsOpen(true)
                }}
            />
            {isLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
            )}
            
            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 max-h-60 overflow-y-auto top-full">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleSelect(suggestion)}
                            className="w-full text-left px-6 py-3 hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
