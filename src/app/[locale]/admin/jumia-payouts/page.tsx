import { Metadata } from "next"
import JumiaPayoutsClient from "./JumiaPayoutsClient"

export const metadata: Metadata = {
    title: "Relevés de paiement Jumia | Administration"
}

export default function JumiaPayoutsPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Relevés de paiement Jumia</h1>
                    <p className="text-sm text-gray-500 mt-1">Consultez l'historique et l'état de vos paiements</p>
                </div>
            </div>
            
            <JumiaPayoutsClient />
        </div>
    )
}
