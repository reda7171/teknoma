import { getReservations } from '@/lib/actions/admin-reservations'
import ReservationsClient from './ReservationsClient'

export default async function AdminReservationsPage() {
    const { data: reservations } = await getReservations()

    return (
        <div className="space-y-12">
            <div>
                <h1 className="text-4xl font-black text-black tracking-tighter">
                    Réservations<span className="text-blue-600">.</span>
                </h1>
                <p className="mt-2 text-sm text-gray-500 font-bold uppercase tracking-widest leading-loose">
                    Gérez les demandes de réservation pour les livres en rupture de stock
                </p>
            </div>

            <ReservationsClient initialReservations={reservations || []} />
        </div>
    )
}
