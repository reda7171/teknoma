import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import {getPetCopy} from '@/lib/pets'
import {Link} from '@/i18n/routing'
import {Scissors,HeartHandshake,PawPrint,ArrowUpRight} from 'lucide-react'
import type {Metadata} from 'next'
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const c=getPetCopy((await params).locale);return {title:{absolute:c.services+' | PetsUnivers'},description:c.serviceText}}
export default async function Services({params}:{params:Promise<{locale:string}>}){
 const c=getPetCopy((await params).locale)
 return <><HeaderWithUser/><div className="pets-store min-h-[65vh] bg-[#fffdf8] px-5 py-16 text-[#17351d]"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a07738]">{c.serviceTag}</p><h1 className="mt-4 max-w-2xl font-serif text-5xl">{c.serviceTitle}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-[#68705f]">{c.serviceText}</p><div className="mt-12 grid gap-5 md:grid-cols-3">{[{icon:Scissors,title:c.grooming,text:c.groomingText},{icon:HeartHandshake,title:c.advice,text:c.adviceText},{icon:PawPrint,title:c.support,text:c.supportText}].map(({icon:Icon,title,text})=><article key={title} className="flex flex-col rounded-3xl border border-[#c59a55]/30 bg-[#f7f0df] p-8"><Icon className="h-10 w-10 text-[#a07738]"/><h2 className="mt-8 font-serif text-2xl">{title}</h2><p className="mb-8 mt-4 text-sm leading-7 text-[#68705f]">{text}</p><a href={'mailto:contact@ecom.ma?subject='+encodeURIComponent('PetsUnivers — '+title)} className="mt-auto flex items-center gap-2 text-sm font-bold">{c.inquiry}<ArrowUpRight className="h-4 w-4"/></a></article>)}</div><p className="mt-7 max-w-3xl text-sm leading-7 text-[#68705f]">{c.serviceNote}</p><Link href="/contact" className="mt-8 inline-block rounded-full bg-[#17351d] px-7 py-3 text-sm font-bold text-white">{c.contact}</Link></div></div><Footer/></>
}

