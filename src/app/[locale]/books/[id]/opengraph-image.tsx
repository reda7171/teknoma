import { getBookById } from '@/lib/db/books'

export const alt = 'Livre sur Riwaya'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 86400

export default async function BookOpengraphImage(props: {
  params: Promise<{ id: string; locale: string }>
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
  try {
    const { id } = await props.params
    const bookId = id.slice(0, 36)
    const book = await getBookById(bookId).catch(() => null)

    if (book?.image) {
      const imageUrl = book.image.startsWith('http') ? book.image : `${baseUrl}${book.image}`
      return Response.redirect(imageUrl, 302)
    }

    return Response.redirect(`${baseUrl}/og-image.jpg`, 302)
  } catch {
    return Response.redirect(`${baseUrl}/og-image.jpg`, 302)
  }
}

