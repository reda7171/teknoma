import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getPopularBooks, getBooks } from '@/lib/db/books'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import BookCard from '@/components/BookCard'
import { CheckCircle2, Truck, Shield, Star, BookOpen } from 'lucide-react'
import { Link } from '@/i18n/routing'

import { seoPages } from '@/lib/seo-pages'

export async function generateMetadata({ params }: { params: Promise<{ seoSlug: string, locale: string }> }): Promise<Metadata> {
  const { seoSlug, locale } = await params
  const data = seoPages[locale as string]?.[seoSlug] || seoPages['fr']?.[seoSlug] // Fallback to fr for old links

  if (!data) return {}

  return {
    title: data.title,
    description: data.description,
    keywords: [data.keyword, 'maroc', 'livres', 'librairie', 'acheter livre'],
    openGraph: {
      title: data.title,
      description: data.description,
      type: 'website',
    }
  }
}

export default async function SeoLandingPage({ params }: { params: Promise<{ seoSlug: string, locale: string }> }) {
  const { seoSlug, locale } = await params
  const data = seoPages[locale as string]?.[seoSlug] || seoPages['fr']?.[seoSlug]

  if (!data) {
    notFound()
  }

  // Fetch some books related to the search query or popular ones
  let popularBooks = []
  if (data.searchQuery) {
    popularBooks = await getBooks({ search: data.searchQuery, limit: 8, active: true })
  } else {
    popularBooks = await getPopularBooks(8)
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-black text-white pt-24 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-500 via-black to-black"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-widest uppercase mb-6">
            <BookOpen className="w-4 h-4 text-pixio-yellow" />
            <span>Spécialité Riwaya</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
            {data.h1}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto font-medium">
            {data.intro}
          </p>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-black" />
            <span className="font-bold text-sm uppercase tracking-wider">Livraison Partout au Maroc</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-black" />
            <span className="font-bold text-sm uppercase tracking-wider">Paiement à la Livraison</span>
          </div>
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-black" />
            <span className="font-bold text-sm uppercase tracking-wider">Qualité Garantie</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        <article className="prose prose-lg max-w-none prose-headings:font-black prose-headings:text-black prose-p:text-gray-600 mb-16 bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
          <h2>Pourquoi choisir Riwaya pour vos lectures ?</h2>
          <p>{data.categoryText}</p>
          <p>Notre mission est de démocratiser l'accès à la culture. En choisissant <strong>{data.keyword}</strong> via notre plateforme, vous bénéficiez d'une interface intuitive, d'un service client à l'écoute et de recommandations personnalisées.</p>
          
          <h3>Notre sélection de catégories :</h3>
          <ul>
            <li><strong>Développement Personnel :</strong> Devenez la meilleure version de vous-même.</li>
            <li><strong>Business & Finance :</strong> Apprenez des plus grands entrepreneurs.</li>
            <li><strong>Romans & Fictions :</strong> Évadez-vous à travers des histoires captivantes.</li>
            <li><strong>Packs Économiques :</strong> Des sélections thématiques pour lire plus en dépensant moins.</li>
          </ul>

          <div className="bg-pixio-cream p-6 rounded-2xl mt-10 border border-yellow-100">
            <h3 className="mt-0 text-black">Moyens de paiement et Livraison</h3>
            <p className="mb-0 text-gray-700">Acheter en ligne n'a jamais été aussi sûr. Nous avons choisi le <strong>Paiement à la Livraison (Cash on Delivery)</strong> pour vous garantir une tranquillité d'esprit absolue. Payez uniquement lorsque vous recevez votre commande entre vos mains. Nous couvrons l'ensemble des villes marocaines avec des prestataires de livraison fiables et rapides.</p>
          </div>
        </article>

        {/* FAQ Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-black text-black mb-8 text-center">Foire Aux Questions</h2>
          <div className="space-y-4">
            {data.faq.map((item: any, idx: number) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-black mb-2 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-pixio-yellow shrink-0 mt-0.5" />
                  {item.q}
                </h3>
                <p className="text-gray-600 pl-8">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Products */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-black">Nos Meilleures Ventes</h2>
            <Link href="/books" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
              Voir tout le catalogue &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {popularBooks.map((book: any) => (
              <BookCard key={book.id} {...book} />
            ))}
          </div>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": data.faq.map((item: any) => ({
              "@type": "Question",
              "name": item.q,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.a
              }
            }))
          })
        }}
      />

      <Footer />
    </div>
  )
}
