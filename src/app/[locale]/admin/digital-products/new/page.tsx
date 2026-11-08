import { requirePageRole } from '@/lib/page-authorization'
import DigitalProductForm from '../DigitalProductForm'

export default async function NewDigitalProductPage() {
    await requirePageRole(["ADMIN","MANAGER"])

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Ajouter un livre numérique</h1>
      <DigitalProductForm />
    </div>
  )
}
