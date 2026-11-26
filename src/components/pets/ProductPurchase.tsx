'use client'
import {useEffect,useState} from 'react'
import {useCartStore} from '@/store/cart'
import {getPetCopy} from '@/lib/pets'
import {notifyAddToCart} from '@/lib/actions/cart-notify'
import {ShoppingBag, Check} from 'lucide-react'

export default function ProductPurchase({product,locale}:{product:{id:string;title:string;price:number;image:string;stock:number};locale:string}) {
 const c=getPetCopy(locale)
 const add=useCartStore(s=>s.addItem)
 const sessionId=useCartStore(s=>s.sessionId)
 const setSessionId=useCartStore(s=>s.setSessionId)
 const quantity=useCartStore(s=>s.getItemQuantity(product.id))
 const [added,setAdded]=useState(false)
 const [ready,setReady]=useState(false)
 useEffect(()=>setReady(true),[])
 const available=product.stock>quantity

 const handleAdd=()=>{
  if(!available)return
  add({type:'BOOK',id:product.id,title:product.title,price:product.price,image:product.image})

  // Notification Telegram d'ajout au panier
  let currentSessionId=sessionId
  if(!currentSessionId){
   currentSessionId=Math.random().toString(36).substring(2,15)+Math.random().toString(36).substring(2,15)
   setSessionId(currentSessionId)
  }
  const {items,discount}=useCartStore.getState()
  const currentTotal=items.reduce((sum,item)=>sum+(item.price*item.quantity),0)
  const itemsText=items.map(i=>`${i.quantity}x ${i.title}`).join(', ')
  notifyAddToCart(product.title,product.price,'PRODUIT',currentSessionId,currentTotal,itemsText,discount,product.id).catch(console.error)

  setAdded(true)
  setTimeout(()=>setAdded(false),2000)
 }

 return <div><button type="button" disabled={!ready || !available} onClick={handleAdd} className="flex w-full items-center justify-center gap-3 rounded-full bg-[#75C300] hover:bg-[#68ad00] px-7 py-4 text-sm font-bold text-[#1A1C1F] shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">{added?<Check className="h-5 w-5"/>:<ShoppingBag className="h-5 w-5"/>}{!available?c.out:added?c.added:c.add}</button></div>
}
