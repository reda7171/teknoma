import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import LoginForm from '@/components/community/LoginForm'
import { getTranslations } from 'next-intl/server'
import { Wallet, Truck, RefreshCcw, Gift, PackageOpen } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export default async function LoginPage() {
    const t = await getTranslations('AuthBenefits')
    const googleEnabledSetting = await prisma.siteSettings.findUnique({ where: { key: 'auth_google_enabled' } })
    const facebookEnabledSetting = await prisma.siteSettings.findUnique({ where: { key: 'auth_facebook_enabled' } })
    
    const googleEnabled = googleEnabledSetting?.value !== 'false'
    const facebookEnabled = facebookEnabledSetting?.value !== 'false'

    
    const benefits = [
        { icon: Gift, title: t('b1_title'), desc: t('b1_desc'), color: 'text-pixio-pink', bg: 'bg-pixio-pink/20' },
        { icon: Wallet, title: t('b2_title'), desc: t('b2_desc'), color: 'text-amber-500', bg: 'bg-amber-100' },
        { icon: Truck, title: t('b3_title'), desc: t('b3_desc'), color: 'text-green-500', bg: 'bg-green-100' },
        { icon: RefreshCcw, title: t('b4_title'), desc: t('b4_desc'), color: 'text-blue-500', bg: 'bg-blue-100' },
        { icon: PackageOpen, title: t('b5_title'), desc: t('b5_desc'), color: 'text-purple-500', bg: 'bg-purple-100' },
    ]

    return (
        <div className="min-h-screen bg-pixio-cream flex flex-col">
            <Header />
            <main className="flex-grow flex items-center justify-center p-4 py-12 md:py-20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[url('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c')] bg-cover bg-center mix-blend-multiply" />
                
                <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-24">
                    {/* Colonne des avantages */}
                    <div className="flex-1 w-full max-w-md lg:max-w-none">
                        <div className="mb-8 text-center lg:text-left rtl:lg:text-right">
                            <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight mb-4">
                                {t('title')}
                            </h2>
                            <div className="w-20 h-2 bg-black mx-auto lg:mx-0 rtl:lg:mx-0 rtl:lg:ml-auto rtl:lg:mr-0 rounded-full" />
                        </div>
                        
                        <div className="grid gap-6">
                            {benefits.map((benefit, i) => (
                                <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${benefit.bg} ${benefit.color}`}>
                                        <benefit.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-lg mb-1">{benefit.title}</h3>
                                        <p className="text-sm font-bold text-slate-500 leading-relaxed">{benefit.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Colonne du formulaire */}
                    <div className="flex-1 w-full max-w-md shrink-0">
                        <LoginForm googleEnabled={googleEnabled} facebookEnabled={facebookEnabled} />
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
