import PetHelpBanner from '@/components/pets/PetHelpBanner'
﻿import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import ProductCard from '@/components/pets/ProductCard'
import {getPetCopy, PET_CATEGORIES} from '@/lib/pets'
import {prisma} from '@/lib/prisma'
import {Link} from '@/i18n/routing'
import {Cpu, Search} from 'lucide-react'
import type {Prisma} from '@prisma/client'
import type {Metadata} from 'next'
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const c=getPetCopy((await params).locale);return {title:{absolute:c.catalog+' | Tekno Store'},description:c.intro}}
export default async function Products({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{category?:string;search?:string;page?:string}>}) {
 const {locale}=await params,c=getPetCopy(locale),q=await searchParams
 const category=Object.hasOwn(PET_CATEGORIES,q.category||'')?q.category:undefined
 const search=q.search?.trim().slice(0,150)
 const filters:Prisma.BookWhereInput[]=[]
 if(category){
  const shared=['Alimentation','Accessoires','Hygiène et soins'].includes(category)
  filters.push(shared?{OR:[{category},{subCategory:{in:PET_CATEGORIES[category as keyof typeof PET_CATEGORIES]}}]}:{category})
 }
 if(search)filters.push({OR:[{title:{contains:search}},{titleFr:{contains:search}},{titleEn:{contains:search}},{author:{contains:search}}]})
 const where:Prisma.BookWhereInput={active:true,status:'APPROVED',AND:filters}
 const requested=Math.max(1,Math.floor(Number(q.page)||1))
 const count=await prisma.book.count({where}),pages=Math.max(1,Math.ceil(count/24)),page=Math.min(requested,pages)
 const products=await prisma.book.findMany({where,orderBy:{createdAt:'desc'},take:24,skip:(page-1)*24})
 const labels=[c.cats,c.dogs,c.food,c.accessories,c.care,c.small]
 const url=(n:number)=>'/products?'+new URLSearchParams({...category?{category}:{},...search?{search}:{},page:String(n)}).toString()
 return <><HeaderWithUser/><main id="main-content" className="pets-store min-h-[65vh] bg-[#fffdf8] px-5 py-12 text-[#17351d]"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-widest text-[#a07738]">Tekno Store</p><h1 className="mt-3 font-serif text-4xl md:text-5xl">{category?labels[Object.keys(PET_CATEGORIES).indexOf(category)]:c.catalog}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#68705f]">{c.intro}</p><form className="mt-7 flex max-w-xl gap-2" action={'/'+locale+'/products'}>{category&&<input type="hidden" name="category" value={category}/>}<label className="flex flex-1 items-center gap-2 rounded-xl border border-[#17351d]/20 bg-white px-4"><Search className="h-5 w-5 shrink-0 text-[#a07738]"/><input name="search" aria-label={c.search} defaultValue={search} placeholder={c.search} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/></label><button className="rounded-xl bg-[#17351d] px-5 text-sm font-bold text-white">{c.searchButton}</button></form><div className="my-8 flex flex-wrap gap-2"><Link href="/products" className="rounded-full border border-[#17351d]/20 px-4 py-2 text-xs font-semibold">{c.all}</Link>{Object.keys(PET_CATEGORIES).map((key,i)=><Link key={key} href={'/products?category='+encodeURIComponent(key)} className={'rounded-full border px-4 py-2 text-xs font-semibold '+(category===key?'border-[#17351d] bg-[#17351d] text-white':'border-[#17351d]/20')}>{labels[i]}</Link>)}</div><p className="mb-5 text-xs text-[#68705f]">{count} {c.results}</p>{products.length?<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.map(product=><ProductCard key={product.id} product={product} locale={locale}/>)}</div>:<div className="rounded-3xl border border-dashed border-[#c59a55]/50 bg-[#f7f0df] px-6 py-16 text-center"><Cpu className="mx-auto h-12 w-12 text-[#a07738]"/><h2 className="mt-5 text-xl font-bold">{search?c.out:c.empty}</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#68705f]">{c.emptyText}</p><Link href="/products" className="mt-5 inline-block text-sm font-bold underline">{c.reset}</Link></div>}{pages>1&&<nav aria-label="Pagination" className="mt-8 flex justify-center gap-4">{page>1&&<Link href={url(page-1)} className="rounded-full border px-4 py-2">←</Link>}<span className="px-3 py-2">{page} / {pages}</span>{page<pages&&<Link href={url(page+1)} className="rounded-full border px-4 py-2">→</Link>}</nav>}</div></main><PetHelpBanner locale={locale}/><Footer/></>
}

