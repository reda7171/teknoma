import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import RegisterForm from '@/components/community/RegisterForm'
import { prisma } from '@/lib/prisma'
import { getCommunityUser } from '@/lib/actions/community-auth'
import { redirect } from 'next/navigation'

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const user = await getCommunityUser()
    if (user) {
        redirect(`/${locale}/community`)
    }

    const googleEnabledSetting = await prisma.siteSettings.findUnique({ where: { key: 'auth_google_enabled' } })
    const facebookEnabledSetting = await prisma.siteSettings.findUnique({ where: { key: 'auth_facebook_enabled' } })
    
    const googleEnabled = googleEnabledSetting?.value !== 'false'
    const facebookEnabled = facebookEnabledSetting?.value !== 'false'
    
    return (
        <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
            <Header />
            <main className="flex-grow flex items-center justify-center p-4 py-8">
                <RegisterForm googleEnabled={googleEnabled} facebookEnabled={facebookEnabled} />
            </main>
            <Footer />
        </div>
    )
}
