import {redirect} from '@/i18n/routing'
export default async function LegacyProduct({params}:{params:Promise<{locale:string;id:string}>}){const {locale,id}=await params;redirect({href:'/products/'+id.slice(0,36),locale})}
