import {redirect} from '@/i18n/routing'
export default async function LegacyCatalog({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {locale}=await params,q=await searchParams
 const filtered=new URLSearchParams()
 for(const key of ['category','search','page'])if(typeof q[key]==='string')filtered.set(key,q[key])
 redirect({href:'/products'+(filtered.size?'?'+filtered.toString():''),locale})
}
