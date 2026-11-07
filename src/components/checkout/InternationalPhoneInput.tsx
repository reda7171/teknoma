'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Search, Check, Globe } from 'lucide-react'
import { COUNTRIES, Country, DEFAULT_COUNTRY, detectCountryFromPhone } from '@/lib/constants/countries'

interface InternationalPhoneInputProps {
    value: string
    onChange: (value: string) => void
    onCountryChange?: (country: Country) => void
    error?: string
    placeholder?: string
    disabled?: boolean
    id?: string
}

export default function InternationalPhoneInput({
    value = '',
    onChange,
    onCountryChange,
    error,
    placeholder,
    disabled = false,
    id = 'phone-input'
}: InternationalPhoneInputProps) {
    const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY)
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Initial detection from incoming value
    useEffect(() => {
        if (value) {
            const detected = detectCountryFromPhone(value)
            if (detected && detected.code !== selectedCountry.code) {
                setSelectedCountry(detected)
                onCountryChange?.(detected)
            }
        }
    }, [])

    // Outside click to close country picker
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            setTimeout(() => searchInputRef.current?.focus(), 50)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // Filter countries based on search query
    const filteredCountries = useMemo(() => {
        if (!searchQuery.trim()) return COUNTRIES
        const q = searchQuery.toLowerCase().trim()
        return COUNTRIES.filter(
            c =>
                c.name.toLowerCase().includes(q) ||
                c.nameAr.toLowerCase().includes(q) ||
                c.nameEn.toLowerCase().includes(q) ||
                c.dialCode.includes(q) ||
                c.code.toLowerCase().includes(q)
        )
    }, [searchQuery])

    // Handle user typing into the input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value
        // Allow digits, spaces, plus, hyphens, and parenthesis
        const sanitized = raw.replace(/[^\d+\s()-]/g, '')

        // Detect country from typed prefix
        const detected = detectCountryFromPhone(sanitized)
        if (detected && detected.code !== selectedCountry.code) {
            setSelectedCountry(detected)
            onCountryChange?.(detected)
        }

        onChange(sanitized)
    }

    // Select country from dropdown
    const handleSelectCountry = (country: Country) => {
        setSelectedCountry(country)
        onCountryChange?.(country)
        setIsOpen(false)
        setSearchQuery('')

        // If phone is currently empty or has old dial code, set the new dial code prefix
        const cleanVal = value.trim()
        if (!cleanVal || cleanVal === selectedCountry.dialCode) {
            onChange(country.code === 'MA' ? '06' : `${country.dialCode} `)
        } else if (cleanVal.startsWith('+')) {
            // Replace existing dial code
            const withoutOldDial = cleanVal.replace(/^\+\d+\s*/, '')
            onChange(`${country.dialCode} ${withoutOldDial}`.trim())
        }
    }

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="relative flex items-center">
                {/* Country Flag & Dial Code Trigger Button */}
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className="absolute left-2.5 sm:left-3 z-10 flex items-center gap-1.5 px-3 py-2 bg-white/90 hover:bg-white rounded-2xl border border-gray-200/80 shadow-sm transition-all text-xs font-black text-gray-800 active:scale-95 cursor-pointer disabled:opacity-50"
                    title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
                    aria-label="Choisir l'indicatif pays"
                >
                    <span className="text-lg leading-none" role="img" aria-label={selectedCountry.name}>
                        {selectedCountry.flag}
                    </span>
                    <span className="font-mono font-bold text-gray-700 hidden xs:inline text-[11px]">
                        {selectedCountry.dialCode}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Main Phone Input */}
                <input
                    id={id}
                    type="tel"
                    inputMode="tel"
                    value={value}
                    onChange={handleInputChange}
                    disabled={disabled}
                    dir="ltr"
                    placeholder={placeholder || selectedCountry.placeholder}
                    className={`w-full pl-24 sm:pl-28 pr-6 py-5 bg-pixio-cream/50 border-2 rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-black text-black placeholder:text-gray-400 text-sm sm:text-base ${
                        error ? 'border-red-400 focus:border-red-500' : 'border-gray-200'
                    }`}
                />
            </div>

            {/* Dropdown Country Picker */}
            {isOpen && (
                <div className="absolute z-[9999] left-0 top-full mt-2 w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Search Bar */}
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400 ml-2" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Rechercher un pays (ex: France, +33)..."
                            className="w-full bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder:text-gray-400 px-2 py-1"
                        />
                    </div>

                    {/* Countries List */}
                    <div className="max-h-[280px] overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                        {filteredCountries.length === 0 ? (
                            <div className="p-6 text-center text-xs text-gray-400 font-bold">
                                Aucun pays trouvé pour &quot;{searchQuery}&quot;
                            </div>
                        ) : (
                            filteredCountries.map(country => {
                                const isSelected = country.code === selectedCountry.code
                                return (
                                    <button
                                        key={country.code}
                                        type="button"
                                        onClick={() => handleSelectCountry(country)}
                                        className={`w-full px-4 py-3 flex items-center justify-between text-left hover:bg-pixio-cream/60 transition-colors ${
                                            isSelected ? 'bg-blue-50/60 font-black' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl leading-none">{country.flag}</span>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-900 font-bold flex items-center gap-2">
                                                    {country.name}
                                                    {country.popular && (
                                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-mono">
                                                            Top
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    {country.nameAr}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold text-gray-500">
                                                {country.dialCode}
                                            </span>
                                            {isSelected && (
                                                <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>

                    {/* Footer note for Worldwide Amana shipping */}
                    <div className="p-3 bg-slate-50 border-t border-gray-100 flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <Globe className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>Expédition internationale disponible via Amana Worldwide.</span>
                    </div>
                </div>
            )}
        </div>
    )
}

