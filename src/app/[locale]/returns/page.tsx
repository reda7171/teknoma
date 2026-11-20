import PetInfoPage from '@/components/pets/PetInfoPage'
import { getPetInfo } from '@/lib/pet-content'
import type { Metadata } from 'next'

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const page = getPetInfo((await params).locale, 'returns')
  return {title:{absolute:page.label+' | Tekno Store'},description:page.intro}
}
export default async function Page({params}:{params:Promise<{locale:string}>}){
  return <PetInfoPage locale={(await params).locale} page="returns" />
}
