import { verifyAdmin } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'
import InternalLinkingSchema from '@/components/admin/seo/InternalLinkingSchema'
import { Network } from 'lucide-react'

export const metadata = {
    title: 'Maillage Interne SEO | Admin Riwaya',
}

export default async function InternalLinkingPage() {
    try {
        await verifyAdmin()
    } catch {
        redirect('/login')
    }

    return (
        <div className="space-y-12">
            {/* Header section style Riwaya */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-7xl font-black text-black tracking-tighter mb-2 italic flex items-center gap-4">
                        <Network className="w-12 h-12 lg:w-16 lg:h-16 text-emerald-500" strokeWidth={3} />
                        Maillage<span className="text-emerald-500">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Architecture SEO & Circulation du Link Juice
                    </p>
                </div>
            </div>

            <InternalLinkingSchema />
        </div>
    )
}
