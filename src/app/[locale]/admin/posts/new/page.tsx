import PostForm from '@/components/admin/PostForm'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Link } from '@/i18n/routing'
import { ArrowLeft } from 'lucide-react'

export default function NewPostPage() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
                <Breadcrumbs items={[
                    { label: 'Admin', href: '/admin' },
                    { label: 'Articles', href: '/admin/posts' },
                    { label: 'Nouvel Article' }
                ]} />
                
                <Link 
                    href="/admin/posts" 
                    className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
                    Retour aux articles
                </Link>
            </div>

            <div className="text-center md:text-left mb-8">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Nouvel Article</h1>
                <p className="text-gray-500 text-sm md:text-base">Rédigez un chef-d'œuvre avec l'éditeur premium</p>
            </div>

            <PostForm />
        </div>
    )
}
