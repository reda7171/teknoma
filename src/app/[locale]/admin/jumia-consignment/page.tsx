import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import JumiaConsignmentClient from "./JumiaConsignmentClient"
import { getJumiaShops } from "../jumia-orders/actions"

export default async function JumiaConsignmentPage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const t = await getTranslations('Admin')
    
    // Pour la création de FBJ on aura besoin des shops
    const shopsRes = await getJumiaShops()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Consignation FBJ</h2>
            </div>
            <Suspense fallback={<div>Chargement FBJ...</div>}>
                <JumiaConsignmentClient 
                    shops={shopsRes?.shops || []}
                />
            </Suspense>
        </div>
    )
}
