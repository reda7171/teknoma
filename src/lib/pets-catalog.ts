// Categories belonging to the former bookstore, never offered by Tekno Store.
export const RETIRED_ACCESSORY_CATEGORIES = ['LIBRARY', 'BOOKMARK', 'USB', 'KIDS', 'FURNITURE', 'BOARD_GAME']

export function isRetiredAccessoryCategory(category: string | null | undefined) {
  return RETIRED_ACCESSORY_CATEGORIES.includes((category || '').toUpperCase())
}

export function isRetiredStorefrontUrl(value: string) {
  try {
    const pathname = new URL(value, 'https://tekno.ma').pathname.replace(/^\/(fr|en|ar)(?=\/|$)/, '')
    return /^\/(quotes|authors|deposer-liste|reading-list|cle-usb|mon-enfant|livres-numeriques|fourniture-bureau|jeux-societe)(\/|$)/.test(pathname)
      || /^\/community\/(books|exchange|exchanges|reading-list|market)(\/|$)/.test(pathname)
  } catch { return false }
}
