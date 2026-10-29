import type {MetadataRoute} from 'next'
import {prisma} from '@/lib/prisma'
import {PET_CATEGORIES} from '@/lib/pets'
export const revalidate=3600
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base=(process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000').replace(/\/$/,'')
 const locales=['fr','en','ar']
 const products=await prisma.book.findMany({where:{active:true,status:'APPROVED'},select:{id:true,updatedAt:true}})
 const pages=['','/products','/services','/contact','/privacy','/terms']
 return locales.flatMap(locale=>[
  ...pages.map(path=>({url:base+'/'+locale+path,changeFrequency:'weekly' as const,priority:path===''?1:0.7})),
  ...Object.keys(PET_CATEGORIES).map(category=>({url:base+'/'+locale+'/products?category='+encodeURIComponent(category),changeFrequency:'weekly' as const,priority:0.7})),
  ...products.map(product=>({url:base+'/'+locale+'/products/'+product.id,lastModified:product.updatedAt,changeFrequency:'weekly' as const,priority:0.8}))
 ])
}
