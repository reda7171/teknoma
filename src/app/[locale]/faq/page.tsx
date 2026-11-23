import Header from '@/components/pets/PetHeader'
import Footer from '@/components/pets/PetFooter'
import PetPageHero from '@/components/pets/PetPageHero'
import PetFAQ from '@/components/pets/PetFAQ'
import PetHelpBanner from '@/components/pets/PetHelpBanner'
import {getPetContent} from '@/lib/pet-content'
import type {Metadata} from 'next'
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const t=getPetContent((await params).locale);return {title:{absolute:t.faq+' | Tekno Store'},description:t.faqIntro}}
export default async function Page({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params,t=getPetContent(locale)
 return <><Header/><main id="main-content" className="pets-store bg-[#fffdf8] text-[#17351d]"><PetPageHero locale={locale} label={t.faq} title={t.faqTitle} intro={t.faqIntro}/><section className="mx-auto max-w-4xl px-5 py-14 sm:px-8"><PetFAQ locale={locale}/></section><PetHelpBanner locale={locale}/></main><Footer/></>
}
