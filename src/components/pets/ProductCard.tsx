import {Link} from '@/i18n/routing'
import {Smartphone, ArrowUpRight} from 'lucide-react'
import ImageWithFallback from '@/components/ImageWithFallback'
import {getPetCopy, productTitle} from '@/lib/pets'
type Product = {id:string; title:string; titleFr?:string|null; titleEn?:string|null; author:string; price:number; image:string; stock:number; category?:string|null}
export default function ProductCard({product,locale}:{product:Product;locale:string}) {
 const c=getPetCopy(locale), title=productTitle(product,locale)
 let image=product.image
 try { const parsed=JSON.parse(image); if(Array.isArray(parsed)) image=parsed[0] || '' } catch {}
 return <Link href={'/products/'+product.id} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#17351d]/10 bg-white p-3 transition hover:-translate-y-1 hover:shadow-lg"><div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-50">{image?<ImageWithFallback src={image} alt={title} fallback="/logo.png" className="h-full w-full object-contain p-4"/>:<Smartphone className="absolute inset-0 m-auto h-16 w-16 text-[#dcdcc7]"/>}</div><div className="flex flex-1 flex-col p-3"><p className="text-xs text-[#426344] font-semibold">{product.category}</p><h3 className="mt-2 text-base font-bold text-[#17351d] line-clamp-2">{title}</h3><p className="mt-1 text-xs text-stone-500 font-medium">{product.author}</p><div className="mt-auto flex items-end justify-between gap-2 pt-5"><div><p className="text-lg font-black text-[#17351d]">{product.price.toLocaleString('fr-FR')} <span className="text-xs font-normal">MAD</span></p><p className={'mt-1 text-xs font-semibold '+(product.stock>0?'text-emerald-700':'text-stone-400')}>{product.stock>0?c.stock:c.out}</p></div><ArrowUpRight className="h-8 w-8 rounded-full bg-[#f7f0df] p-1.5 text-[#284b2c]"/></div></div></Link>
}
