export function parseImages(image: string | null | undefined): string[] {
    if (!image) return []
    try {
        const parsed = JSON.parse(image)
        if (Array.isArray(parsed)) return parsed
        return [image]
    } catch {
        return [image]
    }
}

export function getPrimaryImage(image: string | null | undefined): string {
    const images = parseImages(image)
    return images.length > 0 ? images[0] : '/images/placeholder.jpg'
}
