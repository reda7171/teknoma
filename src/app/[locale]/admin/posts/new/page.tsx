import PostForm from '@/components/admin/PostForm'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Link } from '@/i18n/routing'
import { ArrowLeft, Sparkles, PenTool } from 'lucide-react'

export default function NewPostPage() {
    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-purple-50/50">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12">
                
                {/* Header Section */}
                <div className="relative">
                    {/* Decorative Elements */}
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl" />
                    <div className="absolute top-10 -right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100/50">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <Link 
                                    href="/admin/posts" 
                                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-500 hover:text-black hover:scale-105 hover:shadow-md transition-all duration-300"
                                >
                                    <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                                </Link>
                                <Breadcrumbs items={[
                                    { label: 'Admin', href: '/admin' },
                                    { label: 'Articles', href: '/admin/posts' },
                                    { label: 'Nouvel Article' }
                                ]} />
                            </div>
                            
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest mb-4 shadow-xl shadow-black/10">
                                <Sparkles className="w-3 h-3 text-yellow-400" />
                                Éditeur Premium
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-500 tracking-tighter mb-3">
                                Nouvel Article<span className="text-blue-600">.</span>
                            </h1>
                            <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs">
                                Rédigez un chef-d'œuvre avec l'éditeur premium
                            </p>
                        </div>
                        
                        <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rotate-3 hover:rotate-6 transition-transform duration-500">
                            <PenTool className="w-6 h-6 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Form Section */}
                <div className="relative z-10">
                    <PostForm />
                </div>
            </div>
        </div>
    )
}
