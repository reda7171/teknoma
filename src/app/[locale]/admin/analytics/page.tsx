import { requirePageRole } from '@/lib/page-authorization'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
    await requirePageRole(["ADMIN","MANAGER"])

    // Protection
    const cookieStore = await cookies()
    const token = cookieStore.get('admin-token')
    if (!token) redirect('/admin/login')

    return <AnalyticsClient />
}
