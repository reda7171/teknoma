'use client'

import { useState } from 'react'
import { Globe, Zap, BookOpen, Star, MessageSquare, Building2, Search, Copy, Check, ChevronDown, ChevronUp, Info } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────
type GeoBlock = {
  id: string
  label: string
  icon: React.ElementType
  color: string
  description: string
  signals: GeoSignal[]
}

type GeoSignal = {
  title: string
  status: 'done' | 'partial' | 'missing'
  detail: string
  tip?: string
  schemaSnippet?: string
}

// ─── Données GEO ──────────────────────────────────────────────────
const geoBlocks: GeoBlock[] = [
  {
    id: 'entity',
    label: 'Entité de marque',
    icon: Building2,
    color: 'bg-blue-50 border-blue-200',
    description: 'Les IA doivent connaître Riwaya comme une entité réelle et autoritaire.',
    signals: [
      {
        title: 'Schema Organization avec description',
        status: 'done',
        detail: 'Injecté dans layout.tsx avec description bilingue AR/FR',
        schemaSnippet: `"@type": "Organization",\n"name": "Riwaya",\n"description": "أحسن مكتبة في المغرب..."`
      },
      {
        title: 'Schema WebSite avec SearchAction',
        status: 'done',
        detail: 'Injecté dans layout.tsx — permet à Google/IA de connaître la recherche interne'
      },
      {
        title: 'Page À propos avec Schema AboutPage',
        status: 'done',
        detail: 'Injecté dans /about/page.tsx avec interactionStatistic (10 000 clients)'
      },
      {
        title: 'Profils sociaux liés (sameAs)',
        status: 'done',
        detail: 'Instagram, Facebook, LinkedIn, TikTok et YouTube déclarés.',
        tip: 'L\'IA vous reconnaît formellement sur toutes ces plateformes.'
      },
      {
        title: 'Google My Business vérifié',
        status: 'done',
        detail: 'Fiche GMB liée avec les coordonnées GPS exactes dans le schéma LocalBusiness.',
        tip: 'Signal majeur pour les recommandations locales.'
      },
    ]
  },
  {
    id: 'faq',
    label: 'FAQ & Questions directes',
    icon: MessageSquare,
    color: 'bg-amber-50 border-amber-200',
    description: 'Les IA extraient les paires Q/R pour répondre directement aux utilisateurs.',
    signals: [
      {
        title: 'FAQ "Meilleure librairie au Maroc" sur l\'accueil',
        status: 'done',
        detail: 'Schema FAQPage avec question directe sur la page d\'accueil (AR/FR/EN)',
        schemaSnippet: `"@type": "Question",\n"name": "ما هي أفضل وأحسن مكتبة إلكترونية في المغرب؟",\n"acceptedAnswer": { "text": "تعتبر مكتبة رواية..." }`
      },
      {
        title: 'FAQ sur les pages livres',
        status: 'done',
        detail: 'Schema FAQPage dynamique sur chaque fiche livre'
      },
      {
        title: 'FAQ sur les pages blog',
        status: 'done',
        detail: 'Schema FAQPage injecté sur chaque article'
      },
      {
        title: 'FAQ sur les pages auteurs',
        status: 'done',
        detail: 'Schema FAQPage injecté sur chaque page auteur'
      },
      {
        title: 'Page FAQ dédiée /faq',
        status: 'partial',
        detail: 'Page existante mais Schema FAQPage à vérifier',
        tip: 'Une page /faq riche en Schema FAQPage peut capturer des Position Zéro sur Google.'
      },
    ]
  },
  {
    id: 'authority',
    label: 'Autorité & Confiance',
    icon: Star,
    color: 'bg-green-50 border-green-200',
    description: 'Les IA évaluent la crédibilité via les avis, mentions et statistiques.',
    signals: [
      {
        title: 'Article comparatif "Top 5 librairies Maroc"',
        status: 'done',
        detail: 'Publié en blog — Riwaya positionné n°1 objectivement'
      },
      {
        title: 'Chiffres concrets sur la page About',
        status: 'done',
        detail: '+10 000 clients, 40 villes, fondé 2023 — injecté en Schema.org'
      },
      {
        title: 'Avis clients structurés (Schema Review)',
        status: 'done',
        detail: 'Schema AggregateRating et Review individuels injectés dynamiquement sur les fiches livres.',
        tip: 'Les IA accordent une grande importance aux preuves sociales chiffrées.',
        schemaSnippet: `"aggregateRating": {\n  "@type": "AggregateRating",\n  "ratingValue": "4.8",\n  "reviewCount": "1250"\n}`
      },
      {
        title: 'Mentions externes (backlinks)',
        status: 'missing',
        detail: 'Aucun backlink connu depuis des sites marocains d\'autorité',
        tip: 'Publiez des communiqués de presse sur les médias locaux (Hespress, Goud, Yabiladi).'
      },
      {
        title: 'Fiche Trustpilot / Avis Google',
        status: 'missing',
        detail: 'Créer et alimenter des profils d\'avis vérifiables par les IA',
        tip: 'Priorité absolue : les LLM (ChatGPT/Gemini) sont entraînés sur ces sources.'
      },
    ]
  },
  {
    id: 'content',
    label: 'Contenu optimisé IA',
    icon: BookOpen,
    color: 'bg-purple-50 border-purple-200',
    description: 'Les IA préfèrent le contenu structuré, factuel et multilingue.',
    signals: [
      {
        title: 'Contenu trilingue AR / FR / EN',
        status: 'done',
        detail: 'Toutes les pages traduites via next-intl avec hreflang'
      },
      {
        title: 'Mots-clés darija inclus (a7san librairie)',
        status: 'done',
        detail: 'Ajouté dans les metadata keywords et descriptions Schema.org'
      },
      {
        title: 'Blog avec articles SEO longs',
        status: 'partial',
        detail: 'Blog actif mais volume d\'articles insuffisant pour l\'autorité thématique',
        tip: 'Publiez minimum 2 articles/semaine sur les thèmes : livres au Maroc, lecture, développement personnel.'
      },
      {
        title: 'Pages auteurs enrichies',
        status: 'done',
        detail: 'Schema Person avec ItemList (œuvres) ajouté sur les fiches auteurs.',
        schemaSnippet: `"@type": "Person",\n"name": "Auteur",\n"sameAs": "https://fr.wikipedia.org/wiki/..."`
      },
      {
        title: 'Sitemap.xml dynamique',
        status: 'done',
        detail: 'Sitemap généré avec tous les livres, auteurs, articles et packs.'
      },
    ]
  },
  {
    id: 'local',
    label: 'SEO Local & Géographique',
    icon: Globe,
    color: 'bg-red-50 border-red-200',
    description: 'Dominer les recherches locales "librairie Maroc", "librairie Rabat"…',
    signals: [
      {
        title: 'Schema LocalBusiness avec adresse et GEO',
        status: 'done',
        detail: 'Injecté sur la page d\'accueil avec coordonnées GPS Casablanca'
      },
      {
        title: 'Keywords locaux (Rabat, Casablanca, Marrakech)',
        status: 'done',
        detail: 'Présents dans les metadata keywords et descriptions'
      },
      {
        title: 'Page de livraison par ville',
        status: 'missing',
        detail: 'Créer des pages type "/livraison-rabat", "/livraison-casablanca" pour capturer la recherche locale',
        tip: 'Chaque page ville = une URL indexée = une chance d\'apparaître sur "librairie [ville]".'
      },
      {
        title: 'Citations NAP cohérentes (Nom, Adresse, Phone)',
        status: 'done',
        detail: 'Standardisé partout : Rabat, +212 702-220575, Librairie Riwaya.',
        tip: 'Cohérence NAP = signal positif fort pour le référencement local.'
      },
    ]
  },
]

// ─── Composants ───────────────────────────────────────────────────
const statusConfig = {
  done: { label: 'Fait', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  partial: { label: 'Partiel', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  missing: { label: 'Manquant', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
}

function SchemaSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative mt-2 bg-gray-900 rounded-xl p-3 group">
      <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap">{code}</pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-300" />}
      </button>
    </div>
  )
}

function GeoBlock({ block }: { block: GeoBlock }) {
  const [expanded, setExpanded] = useState(true)
  const Icon = block.icon

  const done = block.signals.filter(s => s.status === 'done').length
  const total = block.signals.length
  const score = Math.round((done / total) * 100)

  return (
    <div className={`border rounded-3xl overflow-hidden ${block.color}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
            <Icon className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="font-black text-black text-sm uppercase tracking-widest">{block.label}</h3>
            <p className="text-[10px] text-gray-500 font-bold mt-0.5">{block.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Score */}
          <div className="text-right">
            <p className={`text-2xl font-black ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {score}%
            </p>
            <p className="text-[9px] text-gray-400 font-bold uppercase">{done}/{total} signaux</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Signals */}
      {expanded && (
        <div className="px-6 pb-6 space-y-3">
          {block.signals.map((signal, i) => {
            const sc = statusConfig[signal.status]
            return (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0 ${signal.status === 'missing' ? 'animate-pulse' : ''}`} />
                      <p className="font-black text-black text-xs">{signal.title}</p>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold ml-3.5">{signal.detail}</p>
                    {signal.tip && (
                      <div className="flex items-start gap-1.5 mt-2 ml-3.5 bg-amber-50 border border-amber-100 rounded-xl p-2">
                        <Info className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[9px] text-amber-700 font-bold">{signal.tip}</p>
                      </div>
                    )}
                    {signal.schemaSnippet && <SchemaSnippet code={signal.schemaSnippet} />}
                  </div>
                  <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${sc.bg} ${sc.text}`}>
                    {sc.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────────
export default function GeoAdminPage() {
  const totalDone = geoBlocks.flatMap(b => b.signals).filter(s => s.status === 'done').length
  const totalSignals = geoBlocks.flatMap(b => b.signals).length
  const globalScore = Math.round((totalDone / totalSignals) * 100)

  return (
    <div className="space-y-10">

      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
            GEO<span className="text-blue-500">.</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
            Generative Engine Optimization — Être recommandé par les IA
          </p>
        </div>
        {/* Score global */}
        <div className="bg-black text-white rounded-3xl px-8 py-5 text-center min-w-[160px]">
          <p className={`text-5xl font-black ${globalScore >= 70 ? 'text-green-400' : globalScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {globalScore}%
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Score GEO Global</p>
          <p className="text-[9px] text-gray-500 mt-1">{totalDone}/{totalSignals} signaux actifs</p>
        </div>
      </div>

      {/* Explication GEO */}
      <div className="bg-blue-950 text-white rounded-3xl p-6 flex gap-4">
        <Zap className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
        <div>
          <p className="font-black text-sm uppercase tracking-widest text-blue-300 mb-2">Qu'est-ce que le GEO ?</p>
          <p className="text-sm text-gray-300 font-medium leading-relaxed">
            Le <strong className="text-white">GEO (Generative Engine Optimization)</strong> consiste à optimiser votre présence pour que les IA
            comme <strong className="text-white">ChatGPT, Gemini, Perplexity</strong> vous recommandent quand un utilisateur pose une question du type
            <em className="text-blue-300"> "a7san librairie en ligne f maghrib"</em> ou <em className="text-blue-300">"أحسن مكتبة في المغرب"</em>.
            Contrairement au SEO classique, les LLM analysent des <strong className="text-white">entités</strong>, des <strong className="text-white">paires Q/R</strong>,
            et des <strong className="text-white">preuves sociales</strong>.
          </p>
        </div>
      </div>

      {/* Barre de progression par catégorie */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {geoBlocks.map(block => {
          const done = block.signals.filter(s => s.status === 'done').length
          const pct = Math.round((done / block.signals.length) * 100)
          const Icon = block.icon
          return (
            <div key={block.id} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
              <Icon className="w-5 h-5 mx-auto mb-2 text-gray-600" />
              <p className="text-xs font-black text-black">{pct}%</p>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-2 leading-tight">{block.label}</p>
            </div>
          )
        })}
      </div>

      {/* Blocs détaillés */}
      <div className="space-y-6">
        {geoBlocks.map(block => (
          <GeoBlock key={block.id} block={block} />
        ))}
      </div>

      {/* Plan d'action prioritaire */}
      <div className="bg-gray-950 text-white rounded-3xl p-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Plan d'action prioritaire</p>
        <div className="space-y-3">
          {[
            { priority: '1', action: 'Créer et vérifier une fiche Google My Business', impact: 'Très élevé', time: '1h' },
            { priority: '2', action: 'Ouvrir un compte Trustpilot + collecter 50+ avis', impact: 'Très élevé', time: '1 semaine' },
            { priority: '3', action: 'Ajouter Schema AggregateRating sur les fiches livres', impact: 'Élevé', time: '2h dev' },
            { priority: '4', action: 'Publier 2 articles/semaine sur le blog (livres au Maroc)', impact: 'Élevé', time: 'Récurrent' },
            { priority: '5', action: 'Créer des pages de livraison par ville (/livraison-rabat)', impact: 'Moyen', time: '1 jour dev' },
            { priority: '6', action: 'Soumettre un communiqué de presse sur Hespress/Yabiladi', impact: 'Moyen', time: '2h rédaction' },
          ].map(item => (
            <div key={item.priority} className="flex items-center gap-4 bg-white/5 rounded-2xl px-5 py-3">
              <span className="w-7 h-7 bg-white/10 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0">{item.priority}</span>
              <p className="flex-1 text-sm font-bold text-gray-200">{item.action}</p>
              <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
                item.impact === 'Très élevé' ? 'bg-red-900 text-red-300' :
                item.impact === 'Élevé' ? 'bg-amber-900 text-amber-300' :
                'bg-blue-900 text-blue-300'
              }`}>{item.impact}</span>
              <span className="text-[9px] font-bold text-gray-500 w-20 text-right">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
