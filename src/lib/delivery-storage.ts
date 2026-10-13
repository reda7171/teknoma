export interface SavedDeliveryProfile {
    fullName: string
    phone: string
    city: string
    address: string
    email?: string
    savedAt?: number
}

const STORAGE_KEY = 'riwaya_sec_delivery_v1'
const MASK_BYTE = 0x5a

function encodePayload(text: string): string {
    try {
        const utf8 = new TextEncoder().encode(text)
        const masked = new Uint8Array(utf8.length)
        for (let i = 0; i < utf8.length; i++) {
            masked[i] = utf8[i] ^ MASK_BYTE
        }
        let binary = ''
        for (let i = 0; i < masked.length; i++) {
            binary += String.fromCharCode(masked[i])
        }
        return btoa(binary)
    } catch {
        return ''
    }
}

function decodePayload(encoded: string): string {
    try {
        const binary = atob(encoded)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i) ^ MASK_BYTE
        }
        return new TextDecoder().decode(bytes)
    } catch {
        return ''
    }
}

export function saveDeliveryProfile(profile: Omit<SavedDeliveryProfile, 'savedAt'>): void {
    if (typeof window === 'undefined') return
    try {
        const payload: SavedDeliveryProfile = {
            ...profile,
            savedAt: Date.now()
        }
        const json = JSON.stringify(payload)
        const cipher = encodePayload(json)
        if (cipher) {
            localStorage.setItem(STORAGE_KEY, cipher)
        }
    } catch (e) {
        console.warn('[DeliveryStorage] Erreur sauvegarde profil:', e)
    }
}

export function getSavedDeliveryProfile(): SavedDeliveryProfile | null {
    if (typeof window === 'undefined') return null
    try {
        const cipher = localStorage.getItem(STORAGE_KEY)
        if (!cipher) return null
        const json = decodePayload(cipher)
        if (!json) return null
        const parsed = JSON.parse(json)
        if (parsed && parsed.phone && parsed.fullName) {
            return parsed
        }
        return null
    } catch {
        return null
    }
}

export function clearSavedDeliveryProfile(): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch {}
}
