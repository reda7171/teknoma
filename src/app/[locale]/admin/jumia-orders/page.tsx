import { requirePageRole } from '@/lib/page-authorization'
import { JumiaAPI } from '@/lib/jumia-api'
import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import JumiaOrdersClient from './JumiaOrdersClient'

export const metadata = {
    title: 'Commandes Jumia | Riwaya Admin'
}

export default async function JumiaOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
    await requirePageRole(["ADMIN","MANAGER","CONFIRMATOR"])

    const { locale } = await params

    const jumia = await JumiaAPI.getInstance()

    if (!jumia) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                    <ShoppingBag className="w-10 h-10 text-orange-400" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Jumia n'est pas configuré</h2>
                <p className="text-slate-500 mb-8 max-w-md font-medium leading-relaxed">
                    Vous devez activer et configurer l'intégration Jumia pour voir vos commandes.
                </p>
                <Link
                    href={`/${locale}/admin/config/jumia`}
                    className="px-8 py-4 bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30"
                >
                    Configurer Jumia
                </Link>
            </div>
        )
    }

    return <JumiaOrdersClient />
}
