import { getTranslations } from 'next-intl/server'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { Mail, Phone, MapPin, MessageCircle, Send, Clock, Globe, Instagram, Facebook, Linkedin, Twitter, Youtube, AtSign } from 'lucide-react'
import { getAllSettings } from '@/lib/actions/site-settings'

export default async function ContactPage() {
    // Récupérer les paramètres du site
    const settings = await getAllSettings()
    const email = settings.contact_email || 'admin@riwaya.store'
    const phone = settings.contact_phone || '+212 702-220575'
    const address = settings.contact_address || 'Rabat, Maroc'

    // Réseaux sociaux
    const socials = {
        instagram: settings.social_instagram,
        facebook: settings.social_facebook,
        linkedin: settings.social_linkedin,
        twitter: settings.social_twitter,
        youtube: settings.social_youtube,
        threads: settings.social_threads,
        tiktok: settings.social_tiktok,
        snapchat: settings.social_snapchat,
    }

    const hasSocials = Object.values(socials).some(link => link)

    return (
        <div className="min-h-screen bg-pixio-cream">
            <Header />

            <main className="max-w-7xl mx-auto px-4 py-16 md:py-32 pb-32 md:pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

                    {/* Contact Info */}
                    <div className="space-y-12 md:space-y-16">
                        <div className="space-y-4 sm:space-y-6">
                            <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 bg-black text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-2 sm:mb-4">
                                <Globe className="w-3 h-3" />
                                Support Client
                            </div>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-black tracking-tighter leading-none italic break-words">
                                Contactez<br />Nous<span className="text-gray-200">.</span>
                            </h1>
                            <p className="text-sm sm:text-base md:text-lg font-bold text-gray-400 uppercase tracking-tight max-w-md">
                                Notre équipe est à votre écoute pour toute question concernant vos commandes ou nos ouvrages.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 sm:gap-10">
                            <div className="space-y-3 sm:space-y-4 group flex flex-col items-center text-center">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-black group-hover:text-white transition-all duration-500">
                                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <h3 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-300">Email Direct</h3>
                                <p className="text-xs sm:text-sm font-black text-black break-words">{email}</p>
                            </div>
                            <div className="space-y-3 sm:space-y-4 group flex flex-col items-center text-center">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-black group-hover:text-white transition-all duration-500">
                                    <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <h3 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-300">Téléphone</h3>
                                <p className="text-xs sm:text-sm font-black text-black break-words">{phone}</p>
                            </div>
                            <div className="space-y-3 sm:space-y-4 group flex flex-col items-center text-center">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-black group-hover:text-white transition-all duration-500">
                                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <h3 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-300">Siège Social</h3>
                                <p className="text-xs sm:text-sm font-black text-black break-words">{address}</p>
                            </div>
                            <div className="space-y-3 sm:space-y-4 group flex flex-col items-center text-center">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-black group-hover:text-white transition-all duration-500">
                                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <h3 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-300">Horaires</h3>
                                <p className="text-xs sm:text-sm font-black text-black break-words">Lun - Sam : 09h - 19h</p>
                            </div>
                        </div>

                        {/* WhatsApp Channel Invite */}
                        <div className="mt-8 md:mt-12 bg-green-50 border border-green-100 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 group hover:bg-green-100 transition-colors">
                            <div className="w-16 h-16 bg-[#25D366] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
                                <MessageCircle className="w-8 h-8" />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-xl font-black text-green-950 mb-2">Rejoignez notre chaîne WhatsApp</h3>
                                <p className="text-green-800 font-medium text-sm mb-4">Ne manquez aucune de nos offres exclusives, nouveautés et promotions.</p>
                                <a
                                    href="https://chat.whatsapp.com/BEKvpmcSTP73Y6zKvFR4oI?s=sw&p=a&ilr=1"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-6 py-3 bg-[#25D366] text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-green-600 transition-colors shadow-md"
                                >
                                    S'abonner
                                </a>
                            </div>
                        </div>

                        {/* Google Review Invite */}
                        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 group hover:bg-blue-100 transition-colors">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform flex-shrink-0">
                                {/* Google "G" Logo */}
                                <svg width="32" height="32" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                </svg>
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-xl font-black text-blue-950 mb-2">Laissez-nous un avis sur Google !</h3>
                                <p className="text-blue-800 font-medium text-sm mb-4">Votre opinion compte beaucoup pour nous. Merci de partager votre expérience.</p>
                                <a
                                    href="https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-6 py-3 bg-white text-blue-600 border border-blue-200 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    Rédiger un avis
                                </a>
                            </div>
                        </div>

                        {/* Social Networks */}
                        {hasSocials && (
                            <div className="pt-8 border-t border-gray-100">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Nos Réseaux Sociaux</h3>
                                <div className="flex flex-wrap gap-4">
                                    {socials.instagram && (
                                        <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-black hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <Instagram className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.facebook && (
                                        <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-[#1877F2] hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <Facebook className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.linkedin && (
                                        <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-[#0A66C2] hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <Linkedin className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.twitter && (
                                        <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-black hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <Twitter className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.youtube && (
                                        <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-[#FF0000] hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <Youtube className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.threads && (
                                        <a href={socials.threads} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-black hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <AtSign className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.tiktok && (
                                        <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-black hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
                                        </a>
                                    )}

                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] p-6 sm:p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100 relative mt-8 lg:mt-0">
                        <div className="absolute -top-6 -right-2 md:-right-6 w-20 h-20 md:w-24 md:h-24 bg-pixio-yellow rounded-full flex items-center justify-center rotate-12 shadow-xl">
                            <MessageCircle className="w-8 h-8 md:w-10 md:h-10 text-black" />
                        </div>

                        <form className="space-y-6 md:space-y-8 mt-4 md:mt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nom Complet</label>
                                    <input type="text" className="w-full px-8 py-5 bg-gray-50 border-none rounded-[2rem] text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all" placeholder="Votre nom" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Email</label>
                                    <input type="email" className="w-full px-8 py-5 bg-gray-50 border-none rounded-[2rem] text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all" placeholder="votre@email.com" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Objet</label>
                                <input type="text" className="w-full px-8 py-5 bg-gray-50 border-none rounded-[2rem] text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all" placeholder="Comment pouvons-nous vous aider ?" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Message</label>
                                <textarea rows={5} className="w-full px-8 py-6 bg-gray-50 border-none rounded-[2.5rem] text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all resize-none" placeholder="Votre message..."></textarea>
                            </div>
                            <button className="w-full py-6 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-[2rem] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group">
                                Envoyer le Message
                                <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </button>
                        </form>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    )
}
