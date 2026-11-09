import { requirePageRole } from '@/lib/page-authorization'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import DataLayerMonitorWidget from '@/components/admin/DataLayerMonitorWidget'

export default async function DataLayerMonitoringPage() {
    await requirePageRole(['ADMIN', 'MANAGER'])

    const cookieStore = await cookies()
    const token = cookieStore.get('admin-token')
    if (!token) redirect('/admin/login')

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-4xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
                        DataLayer GA4<span className="text-emerald-500">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Monitoring & Validation en temps réel du tunnel e-commerce
                    </p>
                </div>
            </div>

            <DataLayerMonitorWidget />
        </div>
    )
}

