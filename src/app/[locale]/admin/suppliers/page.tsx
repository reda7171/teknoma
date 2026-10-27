import { getSupplierContacts } from '@/lib/actions/suppliers'
import SuppliersClient from '@/components/admin/SuppliersClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminSuppliersPage() {
    const res = await getSupplierContacts()
    const contacts = (res.success && Array.isArray(res.contacts)) ? res.contacts : []

    return <SuppliersClient initialContacts={contacts} />
}
