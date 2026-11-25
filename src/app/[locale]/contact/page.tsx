import Header from '@/components/pets/PetHeader'
import Footer from '@/components/pets/PetFooter'
import PetPageHero from '@/components/pets/PetPageHero'
import PetContactForm from '@/components/pets/PetContactForm'
import StoreMapSection from '@/components/pets/StoreMapSection'
import { getPetCopy } from '@/lib/pets'
import { getPetContent, PET_CONTACT_EMAIL, TEKNO_PHONE, TEKNO_WHATSAPP_URL } from '@/lib/pet-content'
import { Link } from '@/i18n/routing'
import { Mail, ArrowUpRight, Package, HeartHandshake, Phone, MessageCircle } from 'lucide-react'
import type { Metadata } from 'next'
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const t=getPetContent((await params).locale);return {title:{absolute:t.contactUs+' | Tekno Store'},description:t.contactIntro}}
export default async function Contact({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{subject?:string}>}) {
  const {locale}=await params, c=getPetCopy(locale), t=getPetContent(locale), query=await searchParams
  const subject=typeof query.subject==='string'?query.subject.slice(0,150):''
  return <><Header /><main id="main-content" className="pets-store bg-[#F0EFF2] text-[#1A1C1F]">
    <PetPageHero locale={locale} label={c.contact} title={t.contactTitle} intro={t.contactIntro} />
    <div className="mx-auto grid max-w-7xl items-start gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
      <aside className="space-y-6">
        <div className="rounded-[2rem] border border-gray-200 bg-white p-7 text-[#1A1C1F] shadow-sm sm:p-9">
          <Phone className="h-8 w-8 text-[#1976D2]" />
          <h2 className="mt-6 font-sans font-bold text-3xl">Téléphone & WhatsApp</h2>
          <p className="mt-4 text-sm leading-7 text-gray-500">Conseillers techniques et suivi de commande disponibles 7j/7.</p>
          <div className="mt-6 flex flex-col gap-3">
            <a dir="ltr" href={'tel:'+TEKNO_PHONE.replace(/[\s-]/g, '')} className="inline-flex items-center gap-2 text-lg font-bold text-[#1A1C1F] hover:text-[#1976D2]"><Phone className="h-4 w-4 text-[#1976D2]" />{TEKNO_PHONE}</a>
            <a dir="ltr" href={TEKNO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:underline"><MessageCircle className="h-4 w-4 text-emerald-600" />Contacter sur WhatsApp (Réponse immédiate)</a>
          </div>
        </div>
        <div className="rounded-[2rem] bg-[#1A1C1F] p-7 text-white sm:p-9">
          <Mail className="h-8 w-8 text-[#75C300]" />
          <h2 className="mt-6 font-sans font-bold text-3xl">{t.emailLabel}</h2>
          <p className="mt-4 text-sm leading-7 text-gray-300">{t.emailText}</p>
          <a dir="ltr" href={'mailto:'+PET_CONTACT_EMAIL} className="mt-6 inline-flex max-w-full items-center gap-2 break-all text-base font-semibold text-[#75C300] underline underline-offset-4">{PET_CONTACT_EMAIL}</a>
        </div>
        {[{icon:Package,title:t.shipping,text:t.returns,href:'/shipping-policy'},{icon:HeartHandshake,title:t.faq,text:t.faqIntro,href:'/faq'}].map(({icon:Icon,title,text,href}) => <Link key={href} href={href} className="flex items-center gap-4 rounded-2xl border border-gray-200 p-6"><Icon className="h-6 w-6 shrink-0 text-[#1976D2]" /><span className="flex-1"><span className="block text-sm font-bold">{title}</span><span className="mt-2 block text-xs leading-6 text-gray-500">{text}</span></span><ArrowUpRight className="h-4 w-4" /></Link>)}
      </aside><PetContactForm locale={locale} email={PET_CONTACT_EMAIL} subject={subject} />
    </div>
    <StoreMapSection locale={locale} />
  </main><Footer /></>
}
