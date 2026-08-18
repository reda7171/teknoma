import GiveawayClient from './GiveawayClient'

export const metadata = {
    title: 'Nouveau Concours | Admin',
    description: 'Créez un tirage au sort',
}

export default function CreateGiveawayPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 mb-2">Lancer un Tirage au Sort</h1>
                <p className="text-gray-500">
                    Saisissez les informations de votre concours et collez la liste des participants.
                </p>
            </div>
            
            <GiveawayClient />
        </div>
    )
}
