import { requirePageRole } from '@/lib/page-authorization'
import { redirect } from 'next/navigation'

export default async function InternalLinkingPage() {
    await requirePageRole(["ADMIN","MANAGER"])

    redirect('/admin')
}
