export const alt = 'PetsUnivers - Déposer liste scolaire'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 86400

export default async function Image() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petsunivers.ma'
  return Response.redirect(`${baseUrl}/og-image.jpg`, 302)
}
