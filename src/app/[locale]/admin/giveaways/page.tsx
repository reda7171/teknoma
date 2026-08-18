import { getGiveaways } from '@/lib/actions/giveaway'
import { Plus, Gift, Instagram, Trophy, Calendar, Users, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const metadata = {
    title: 'Giveaways & Concours | Admin',
    description: 'Gérez vos concours et tirages au sort',
}

export default async function GiveawaysPage() {
    const giveaways = await getGiveaways()

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Concours & Giveaways</h1>
                    <p className="text-gray-500">Historique de vos tirages au sort et cadeaux offerts à la communauté.</p>
                </div>
                <Link
                    href="/admin/giveaways/create"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    Nouveau Tirage
                </Link>
            </div>

            {giveaways.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
                    <Gift className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun concours pour le moment</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-8">
                        Lancez votre premier tirage au sort Instagram et récompensez votre communauté !
                    </p>
                    <Link
                        href="/admin/giveaways/create"
                        className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Lancer un concours
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {giveaways.map(giveaway => (
                        <div key={giveaway.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                            {giveaway.platform === 'INSTAGRAM' && (
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity"></div>
                            )}
                            
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-50 to-pink-50 flex items-center justify-center flex-shrink-0">
                                        {giveaway.platform === 'INSTAGRAM' ? (
                                            <Instagram className="w-6 h-6 text-pink-600" />
                                        ) : (
                                            <Gift className="w-6 h-6 text-indigo-600" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{giveaway.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(giveaway.createdAt), 'dd MMMM yyyy', { locale: fr })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="bg-gray-50 rounded-2xl p-4">
                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Cadeau à gagner</div>
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                        <Gift className="w-4 h-4 text-indigo-500" />
                                        {giveaway.prizeDescription || 'Cadeau surprise'}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        {giveaway.participantsCount} participants
                                    </div>
                                    {giveaway.postUrl && (
                                        <a href={giveaway.postUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                                            Voir le post
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                            <Trophy className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Grand Gagnant</div>
                                            <div className="font-bold text-gray-900">@{giveaway.winnerUsername || 'Inconnu'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Terminé
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
