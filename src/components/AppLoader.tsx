'use client'
import {useEffect,useState} from 'react'
import {PawPrint} from 'lucide-react'
export default function AppLoader(){const [loading,setLoading]=useState(true);useEffect(()=>{const timer=setTimeout(()=>setLoading(false),400);return()=>clearTimeout(timer)},[]);return loading?<div className="pointer-events-none fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-5 bg-[#f7f0df] text-[#17351d]"><PawPrint className="h-14 w-14 animate-pulse text-[#a07738]"/><span className="font-serif text-3xl font-bold">PetsUnivers.</span></div>:null}
