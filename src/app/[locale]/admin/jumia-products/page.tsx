import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import JumiaProductsClient from "./JumiaProductsClient"
import { getJumiaProducts } from "../jumia-orders/actions"

export default async function JumiaProductsPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const t = await getTranslations('Admin')
    
    // On charge la première page des produits Jumia (sans filtre particulier pour démarrer)
    const initialProducts = await getJumiaProducts({ size: 10 })

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Catalogue Jumia</h2>
            </div>
            <Suspense fallback={<div>Chargement du catalogue...</div>}>
                <JumiaProductsClient 
                    initialData={initialProducts?.products || []} 
                    nextToken={initialProducts?.nextToken} 
                />
            </Suspense>
        </div>
    )
}
