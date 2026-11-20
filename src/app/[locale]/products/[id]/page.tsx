import PetHelpBanner from '@/components/pets/PetHelpBanner'
﻿import {notFound} from 'next/navigation'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import ProductPurchase from '@/components/pets/ProductPurchase'
import ImageWithFallback from '@/components/ImageWithFallback'
import {prisma} from '@/lib/prisma'
import {getPetCopy,productTitle} from '@/lib/pets'
import {Link} from '@/i18n/routing'
import type {Metadata} from 'next'
export async function generateMetadata({params}:{params:Promise<{locale:string;id:string}>}):Promise<Metadata>{
 const {locale,id}=await params,p=await prisma.book.findFirst({where:{id,active:true,status:'APPROVED'}})
 return {title:{absolute:p?productTitle(p,locale)+' | PetsUnivers':'PetsUnivers'}}
}
export default async function Product({params}:{params:Promise<{locale:string;id:string}>}){
 const {locale,id}=await params,c=getPetCopy(locale),p=await prisma.book.findFirst({where:{id,active:true,status:'APPROVED'}})
 if(!p)notFound()
 const title=productTitle(p,locale),description=(locale==='fr'?p.descriptionFr:locale==='en'?p.descriptionEn:p.description)||p.descriptionFr||p.description
 let image=p.image;try{const v=JSON.parse(image);if(Array.isArray(v))image=v[0]||''}catch{}
 return <><HeaderWithUser/><main id="main-content" className="pets-store bg-[#fffdf8] px-5 py-10 text-[#17351d]"><div className="mx-auto max-w-6xl"><Link href="/products" className="text-sm text-[#68705f]">← {c.back}</Link><div className="mt-8 grid items-start gap-10 md:grid-cols-2"><div className="relative aspect-square rounded-3xl border border-[#17351d]/10 bg-white"><ImageWithFallback src={image} alt={title} fallback="/petsunivers-icon.svg" className="h-full w-full object-contain p-8" priority/></div><div><p className="text-sm font-semibold text-[#a07738]">{p.category}{p.subCategory?' · '+p.subCategory:''}</p><h1 className="mt-3 font-serif text-4xl leading-tight">{title}</h1><p className="mt-4 text-sm text-[#68705f]">{c.brand} : {p.author}</p><p className="mt-7 text-3xl font-bold">{p.price.toFixed(2)} <span className="text-sm font-normal">MAD</span></p><p className="my-5 text-sm text-[#68705f]">{p.stock>0?c.stock:c.out}</p><ProductPurchase product={{id:p.id,title,price:p.price,image,stock:p.stock}} locale={locale}/><div className="mt-8 border-t border-[#17351d]/10 pt-7"><h2 className="font-bold">{c.description}</h2><p className="mt-4 whitespace-pre-line text-sm leading-8 text-[#68705f]">{description.replace(/<[^>]*>/g,' ')}</p></div></div></div></div></main><PetHelpBanner locale={locale}/><Footer/></>
}

