import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import SellBookClient from './SellBookClient'

export default function SellBookPage({ params: { locale } }: { params: { locale: string } }) {
    return (
        <div className="min-h-screen bg-pixio-cream font-sans">
            <HeaderWithUser />
            <SellBookClient locale={locale} />
            <Footer />
        </div>
    )
}
