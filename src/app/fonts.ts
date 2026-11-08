import localFont from 'next/font/local'

// Share one font definition with the not-found boundary to avoid downloading
// two copies. Optional display keeps a late font swap from delaying text LCP.
export const outfit = localFont({
  src: '../fonts/Outfit-VariableFont_wght.ttf',
  variable: '--font-outfit',
  display: 'optional',
  preload: false,
})
