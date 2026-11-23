'use client'
import {useEffect,useState} from 'react'
import {useCartStore} from '@/store/cart'
import {getPetCopy} from '@/lib/pets'
import {ShoppingBag, Check} from 'lucide-react'
export default function ProductPurchase({product,locale}:{product:{id:string;title:string;price:number;image:string;stock:number};locale:string}) {
 const c=getPetCopy(locale), add=useCartStore(s=>s.addItem),quantity=useCartStore(s=>s.getItemQuantity(product.id))
 const [added,setAdded]=useState(false)
 const [ready,setReady]=useState(false)
 useEffect(()=>setReady(true),[])
 const available=product.stock>quantity
 return <div><button type="button" disabled={!ready || !available} onClick={()=>{if(!available)return;add({type:'BOOK',id:product.id,title:product.title,price:product.price,image:product.image});setAdded(true);setTimeout(()=>setAdded(false),2000)}} className="flex w-full items-center justify-center gap-3 rounded-full bg-[#75C300] hover:bg-[#68ad00] px-7 py-4 text-sm font-bold text-[#1A1C1F] shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">{added?<Check className="h-5 w-5"/>:<ShoppingBag className="h-5 w-5"/>}{!available?c.out:added?c.added:c.add}</button></div>
}
