'use client'

import { useState } from 'react'
import { Save, ChevronDown, ChevronUp, Type, FileText, Zap, Users, TrendingUp, Package, RefreshCw, BookOpen, Megaphone } from 'lucide-react'
import { updateMultipleSettings } from '@/lib/actions/site-settings'
import { useRouter } from 'next/navigation'

// Groupes de champs par section
const SECTIONS = [
  {
    id: 'hero',
    label: 'Section Hero',
    icon: Zap,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    fields: [
      { key: 'hero_badge', label: 'Badge (petite étiquette)', type: 'text', placeholder: 'Livraison 24-48h au Maroc' },
      { key: 'hero_title_part1', label: 'Titre — Partie 1', type: 'text', placeholder: 'Riwaya' },
      { key: 'hero_title_part2', label: 'Titre — Partie 2 (gris)', type: 'text', placeholder: 'Librairie.' },
      { key: 'hero_description', label: 'Description', type: 'textarea', placeholder: 'Découvrez notre sélection...' },
      { key: 'hero_btn_shop', label: 'Bouton Explorer', type: 'text', placeholder: 'Explorer la librairie' },
      { key: 'hero_btn_packs', label: 'Bouton Packs', type: 'text', placeholder: 'Nos Packs' },
    ]
  },
  {
    id: 'features',
    label: 'Section Avantages (3 icônes)',
    icon: Package,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    fields: [
      { key: 'features_1_title', label: 'Avantage 1 — Titre', type: 'text', placeholder: 'Livraison rapide' },
      { key: 'features_1_desc', label: 'Avantage 1 — Description', type: 'text', placeholder: '24-48h partout au Maroc' },
      { key: 'features_2_title', label: 'Avantage 2 — Titre', type: 'text', placeholder: 'Paiement à la livraison' },
      { key: 'features_2_desc', label: 'Avantage 2 — Description', type: 'text', placeholder: 'Payez à la réception' },
      { key: 'features_3_title', label: 'Avantage 3 — Titre', type: 'text', placeholder: 'Packs exclusifs' },
      { key: 'features_3_desc', label: 'Avantage 3 — Description', type: 'text', placeholder: 'Sélections thématiques' },
    ]
  },
  {
    id: 'bestsellers',
    label: 'Section Best Sellers',
    icon: TrendingUp,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    fields: [
      { key: 'bestsellers_subtitle', label: 'Sous-titre', type: 'text', placeholder: 'Top Ventes' },
      { key: 'bestsellers_title', label: 'Titre principal', type: 'text', placeholder: 'Best Sellers' },
      { key: 'bestsellers_description', label: 'Description', type: 'textarea', placeholder: 'Les livres les plus appréciés...' },
      { key: 'bestsellers_view_all', label: 'Bouton Voir tout', type: 'text', placeholder: 'Voir tous les livres' },
      { key: 'bestsellers_soon', label: 'Texte si aucun livre', type: 'text', placeholder: 'Bientôt disponible' },
    ]
  },
  {
    id: 'collections',
    label: 'Section Packs / Collections',
    icon: Package,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    fields: [
      { key: 'collections_subtitle', label: 'Sous-titre', type: 'text', placeholder: 'Nos Collections' },
      { key: 'collections_title', label: 'Titre', type: 'text', placeholder: 'Packs Exclusifs' },
    ]
  },
  {
    id: 'authors',
    label: 'Section Auteurs',
    icon: Users,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    fields: [
      { key: 'authors_subtitle', label: 'Sous-titre (badge)', type: 'text', placeholder: 'Nos Auteurs' },
      { key: 'authors_title', label: 'Titre', type: 'text', placeholder: 'Les Meilleurs' },
      { key: 'authors_description', label: 'Description', type: 'textarea', placeholder: 'Découvrez les auteurs...' },
      { key: 'authors_view_books', label: 'Bouton voir livres', type: 'text', placeholder: 'Voir les livres' },
      { key: 'authors_no_data', label: 'Texte si aucun auteur', type: 'text', placeholder: 'Bientôt disponible' },
    ]
  },
  {
    id: 'quotes',
    label: 'Section Citation du Jour',
    icon: Type,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    fields: [
      { key: 'quotes_wisdom_label', label: 'Étiquette du badge', type: 'text', placeholder: 'Sagesse du Jour' },
      { key: 'quotes_featured_in', label: 'Texte "Retrouvé dans"', type: 'text', placeholder: 'Retrouvé dans' },
    ]
  },
  {
    id: 'new_arrivals',
    label: 'Section Nouvelles Arrivées',
    icon: BookOpen,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    fields: [
      { key: 'new_arrivals_subtitle', label: 'Sous-titre', type: 'text', placeholder: 'Nouveautés' },
      { key: 'new_arrivals_title', label: 'Titre', type: 'text', placeholder: 'Dernières Arrivées' },
      { key: 'new_arrivals_view_all', label: 'Bouton voir tout', type: 'text', placeholder: 'Voir tout' },
    ]
  },
  {
    id: 'exchange',
    label: 'Section Échange de Livres',
    icon: RefreshCw,
    color: 'text-green-600',
    bg: 'bg-green-50',
    fields: [
      { key: 'exchange_subtitle', label: 'Sous-titre (badge)', type: 'text', placeholder: 'Communauté' },
      { key: 'exchange_title', label: 'Titre', type: 'text', placeholder: 'Échangez vos Livres' },
      { key: 'exchange_description', label: 'Description', type: 'textarea', placeholder: 'Donnez une seconde vie...' },
      { key: 'exchange_view_all', label: 'Bouton voir marché', type: 'text', placeholder: 'Voir le marché' },
      { key: 'exchange_view_more', label: 'Bouton explorer', type: 'text', placeholder: 'Explorer le marché' },
      { key: 'exchange_no_data', label: 'Texte si aucun livre', type: 'text', placeholder: 'Aucun livre disponible' },
      { key: 'exchange_join', label: 'Bouton rejoindre', type: 'text', placeholder: 'Rejoindre la communauté' },
    ]
  },
  {
    id: 'digital',
    label: 'Section Livres Numériques',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    fields: [
      { key: 'digital_badge', label: 'Badge', type: 'text', placeholder: 'Livres Numériques' },
      { key: 'digital_title', label: 'Titre', type: 'text', placeholder: 'Lisez Partout' },
      { key: 'digital_description', label: 'Description', type: 'textarea', placeholder: 'Accédez à notre bibliothèque...' },
      { key: 'digital_feature_1', label: 'Fonctionnalité 1', type: 'text', placeholder: 'Téléchargement instantané PDF' },
      { key: 'digital_feature_2', label: 'Fonctionnalité 2', type: 'text', placeholder: 'Lisible sur tous vos appareils' },
      { key: 'digital_feature_3', label: 'Fonctionnalité 3', type: 'text', placeholder: 'Paiement sécurisé' },
      { key: 'digital_cta', label: 'Bouton CTA', type: 'text', placeholder: 'Explorer la bibliothèque' },
    ]
  },
  {
    id: 'journal',
    label: 'Section Journal / Blog',
    icon: FileText,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    fields: [
      { key: 'journal_subtitle', label: 'Sous-titre (badge)', type: 'text', placeholder: 'Notre Journal' },
      { key: 'journal_title_part1', label: 'Titre — Partie 1', type: 'text', placeholder: 'Derniers Articles' },
      { key: 'journal_title_part2', label: 'Titre — Partie 2 (gris)', type: 'text', placeholder: 'à Découvrir' },
      { key: 'journal_view_all', label: 'Bouton voir tout', type: 'text', placeholder: 'Tout Lire' },
      { key: 'journal_read_more', label: 'Lire la suite', type: 'text', placeholder: 'Lire la suite' },
    ]
  },
  {
    id: 'cta',
    label: 'Bannière CTA (bas de page)',
    icon: Megaphone,
    color: 'text-red-600',
    bg: 'bg-red-50',
    fields: [
      { key: 'cta_title_part1', label: 'Titre — Partie 1', type: 'text', placeholder: 'Prêt à lire' },
      { key: 'cta_title_part2', label: 'Titre — Partie 2 (gris)', type: 'text', placeholder: 'quelque chose de nouveau ?' },
      { key: 'cta_button', label: 'Texte du bouton', type: 'text', placeholder: 'Découvrir la librairie' },
    ]
  },
]

export default function HomepageContentForm({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(initialSettings)
  const [openSections, setOpenSections] = useState<string[]>(['hero'])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const toggle = (id: string) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const entries = Object.entries(values).map(([key, value]) => ({
        key,
        value,
        category: 'homepage_content',
        description: SECTIONS.flatMap(s => s.fields).find(f => f.key === key)?.label || key
      }))
      await updateMultipleSettings(entries)
      setMessage('Sauvegardé avec succès !')
      router.refresh()
    } catch (e) {
      setMessage('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Sticky Save Button */}
      <div className="sticky top-4 z-10 flex justify-between items-center bg-white/95 backdrop-blur border border-gray-100 rounded-2xl px-6 py-3 shadow-lg">
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">
          {Object.keys(values).length} champs configurables
        </p>
        <div className="flex items-center gap-4">
          {message && (
            <span className={`text-xs font-bold ${message.includes('succès') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder tout'}
          </button>
        </div>
      </div>

      {/* Accordion Sections */}
      {SECTIONS.map(section => {
        const Icon = section.icon
        const isOpen = openSections.includes(section.id)
        return (
          <div key={section.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${section.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${section.color}`} />
                </div>
                <span className="font-black text-sm text-gray-900">{section.label}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  {section.fields.length} champs
                </span>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {/* Section Fields */}
            {isOpen && (
              <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-50">
                {section.fields.map(field => (
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 mt-4">
                      {field.label}
                      <span className="ml-2 text-gray-300 normal-case font-medium">[{field.key}]</span>
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={values[field.key] || ''}
                        onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all text-sm font-medium resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={values[field.key] || ''}
                        onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all text-sm font-medium"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
