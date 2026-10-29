import { getPackById } from '@/lib/db/packs'

export const alt = 'Pack de livres sur PetsUnivers'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 86400

export default async function PackOpengraphImage(props: {
  params: Promise<{ id: string; locale: string }>
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petsunivers.ma'
  try {
    const { id } = await props.params
    const pack = await getPackById(id).catch(() => null)

    if (pack?.image) {
      const imageUrl = pack.image.startsWith('http') ? pack.image : `${baseUrl}${pack.image}`
      return Response.redirect(imageUrl, 302)
    }

    return Response.redirect(`${baseUrl}/og-image.jpg`, 302)
  } catch {
    return Response.redirect(`${baseUrl}/og-image.jpg`, 302)
  }
}
