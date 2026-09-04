import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import RegisterForm from '@/components/community/RegisterForm'
import { prisma } from '@/lib/prisma'

export default async function RegisterPage() {
    const googleEnabledSetting = await prisma.siteSettings.findUnique({ where: { key: 'auth_google_enabled' } })
    const facebookEnabledSetting = await prisma.siteSettings.findUnique({ where: { key: 'auth_facebook_enabled' } })
    
    const googleEnabled = googleEnabledSetting?.value !== 'false'
    const facebookEnabled = facebookEnabledSetting?.value !== 'false'
    
    return (
        <div className="min-h-screen bg-pixio-cream flex flex-col">
            <Header />
            <main className="flex-grow flex items-center justify-center p-4 py-20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[url('https://images.unsplash.com/photo-1532012197267-da84d127e765')] bg-cover bg-center mix-blend-multiply" />
                <RegisterForm googleEnabled={googleEnabled} facebookEnabled={facebookEnabled} />
            </main>
            <Footer />
        </div>
    )
}
