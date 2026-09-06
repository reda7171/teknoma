import CannibalizationReport from '@/components/admin/seo/CannibalizationReport'
import { getTranslations } from 'next-intl/server'
import { Metadata } from 'next'
import { Activity } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Cannibalisation SEO - Admin Riwaya',
}

export default async function SeoCannibalizationPage() {
    const t = await getTranslations('Admin')

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Activity className="w-5 h-5" />
                    </div>
                    Analyse Cannibalisation SEO
                </h1>
                <p className="text-gray-500 mt-2 max-w-3xl">
                    Cet outil scanne votre base de données pour détecter les conflits SEO (plusieurs pages ciblant les mêmes mots-clés ou ayant le même titre). La cannibalisation dilue votre autorité SEO, il est conseillé de fusionner ou de modifier les mots-clés des éléments en conflit.
                </p>
            </div>

            <div className="max-w-6xl">
                <CannibalizationReport />
            </div>
        </div>
    )
}
