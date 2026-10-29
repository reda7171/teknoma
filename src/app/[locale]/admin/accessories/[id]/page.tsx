import { notFound } from 'next/navigation'
import { isRetiredAccessoryCategory } from '@/lib/pets-catalog'
import AccessoryEditor from './AccessoryEditor'

export default async function AccessoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (isRetiredAccessoryCategory(id) || id === 'bookmarks') notFound()
  return <AccessoryEditor />
}
