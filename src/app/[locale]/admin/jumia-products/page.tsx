import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import JumiaProductsClient from "./JumiaProductsClient"
import { getAllJumiaProducts } from "../jumia-orders/actions"

export const dynamic = 'force-dynamic'

export default async function JumiaProductsPage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const t = await getTranslations('Admin')
    
    // On charge tous les produits Jumia
    const initialProducts = await getAllJumiaProducts()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Catalogue Jumia</h2>
            </div>
            <Suspense fallback={<div>Chargement du catalogue...</div>}>
                <JumiaProductsClient 
                    initialData={initialProducts?.products || []} 
                    nextToken={null} 
                />
            </Suspense>
        </div>
    )
}
