import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import {getPetCopy} from '@/lib/pets'
import {Mail, PawPrint} from 'lucide-react'
export default async function Contact({params}:{params:Promise<{locale:string}>}){
 const c=getPetCopy((await params).locale)
 return <><HeaderWithUser/><div className="pets-store min-h-[60vh] bg-[#fffdf8] px-5 py-16 text-[#17351d]"><div className="mx-auto max-w-4xl"><PawPrint className="h-10 w-10 text-[#a07738]"/><h1 className="mt-6 font-serif text-5xl">{c.contact}</h1><p className="mt-5 max-w-2xl text-base leading-8 text-[#68705f]">{c.serviceText}</p><a href="mailto:contact@ecom.ma" className="mt-10 inline-flex items-center gap-4 rounded-2xl border border-[#c59a55]/40 bg-[#f7f0df] px-7 py-5 text-lg font-semibold"><Mail className="h-6 w-6 text-[#a07738]"/>contact@ecom.ma</a><p className="mt-6 text-sm text-[#68705f]">{c.help}</p></div></div><Footer/></>
}
