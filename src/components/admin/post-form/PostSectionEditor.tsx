'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, Sparkles, Loader2, Book as BookIcon, Image as ImageIcon, Video, Table2, Quote, BarChart2, Megaphone, Vote, Wand2, Copy, ClipboardPaste, X, Bot, Cpu, AlertCircle } from 'lucide-react'
import { generatePostContent } from '@/lib/actions/gemini'
import dynamic from 'next/dynamic'
import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill-new'), { 
    ssr: false, 
    loading: () => <div className="h-32 bg-gray-50 animate-pulse rounded-2xl flex items-center justify-center text-gray-400">Chargement de l'éditeur...</div>
})

function imageHandler(this: any) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/jpeg, image/png, image/webp, image/gif');
    input.click();

    input.onchange = async () => {
        const file = input.files ? input.files[0] : null;
        if (!file) return;

        const quill = this.quill;
        const range = quill.getSelection(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                quill.insertEmbed(range.index, 'image', data.url);
                quill.setSelection(range.index + 1);
            }
        } catch (error) {}
    };
}

const quillModules = {
    toolbar: {
        container: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['link', 'image', 'video'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['clean']
        ],
        handlers: { image: imageHandler }
    }
}

const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'align',
    'link', 'image', 'video', 'list'
]

// Types de blocs disponibles
type BlockType = 'text' | 'image' | 'video' | 'table' | 'quote' | 'chart' | 'ad' | 'poll'

export interface Section {
    id: string
    title: string
    content: string
    blockType?: BlockType
}

interface PostSectionEditorProps {
    initialContent: string
    onChange: (content: string) => void
    lang: 'fr' | 'ar' | 'en'
    postTitle: string
}

// --- Templates de blocs spéciaux ---
const blockTemplates: Record<BlockType, string> = {
    text: '',
    image: '',
    video: `<!-- VIDEO_BLOCK -->
<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:1rem;">
  <iframe src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen
    style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>
</div>`,
    table: `<table>
  <caption>Titre descriptif du tableau</caption>
  <thead>
    <tr>
      <th scope="col">Colonne 1</th>
      <th scope="col">Colonne 2</th>
      <th scope="col">Colonne 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Donnée 1</td>
      <td>Donnée 2</td>
      <td>Donnée 3</td>
    </tr>
  </tbody>
</table>`,
    quote: `> "Votre citation ici..."
> 
> — **Auteur / Source**`,
    chart: `<!-- CHART_BLOCK
{
  "type": "bar",
  "labels": ["Jan", "Fév", "Mar", "Avr"],
  "datasets": [{"label": "Données", "data": [10, 20, 15, 30]}]
}
-->`,
    ad: `<!-- AD_BANNER -->
<div class="ad-banner-block" data-slot="article-inline" style="text-align:center;padding:1rem;background:#f9f9f9;border-radius:1rem;border:1px dashed #e5e7eb;">
  <p style="color:#9ca3af;font-size:12px;">Espace publicitaire</p>
</div>`,
    poll: `<!-- POLL_BLOCK
{
  "question": "Quelle est votre question ?",
  "options": ["Option A", "Option B", "Option C"]
}
-->`,
}

const blockMeta: Record<BlockType, { label: string; icon: any; color: string; border: string }> = {
    text:  { label: 'Section texte',   icon: Plus,      color: 'bg-gray-50 text-gray-600',    border: 'border-gray-200 hover:border-black hover:text-black' },
    image: { label: 'Image',           icon: ImageIcon, color: 'bg-blue-50 text-blue-600',    border: 'border-blue-200 hover:border-blue-500 hover:text-blue-700' },
    video: { label: 'Vidéo YouTube',   icon: Video,     color: 'bg-red-50 text-red-600',      border: 'border-red-200 hover:border-red-500 hover:text-red-700' },
    table: { label: 'Tableau',         icon: Table2,    color: 'bg-purple-50 text-purple-600',border: 'border-purple-200 hover:border-purple-500 hover:text-purple-700' },
    quote: { label: 'Citation',        icon: Quote,     color: 'bg-yellow-50 text-yellow-700',border: 'border-yellow-200 hover:border-yellow-500 hover:text-yellow-800' },
    chart: { label: 'Graphique',       icon: BarChart2, color: 'bg-green-50 text-green-600',  border: 'border-green-200 hover:border-green-500 hover:text-green-700' },
    ad:    { label: 'Bannière Pub',    icon: Megaphone, color: 'bg-orange-50 text-orange-600',border: 'border-orange-200 hover:border-orange-500 hover:text-orange-700' },
    poll:  { label: 'Sondage',         icon: Vote,      color: 'bg-pink-50 text-pink-600',    border: 'border-pink-200 hover:border-pink-500 hover:text-pink-700' },
}

// Badge affiché dans l'éditeur selon le type
function BlockTypeBadge({ type }: { type: BlockType }) {
    const meta = blockMeta[type]
    const Icon = meta.icon
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>
            <Icon className="w-3 h-3" />
            {meta.label}
        </span>
    )
}

const getHighTechTemplateSections = (lang: 'fr' | 'ar' | 'en'): Section[] => {
    if (lang === 'ar') {
        return [
            { id: '1', title: 'مقدمة ونظرة عامة', content: '[تقديم موجز للجهاز وأهم مميزاته وسبب إثارة اهتمام عشاق التكنولوجيا في المغرب]' },
            { id: '2', title: 'المواصفات التقنية الرئيسية', content: '- **المعالج :** \n- **الذاكرة العشوائية (RAM) :** \n- **سعة التخزين :** \n- **الشاشة :** \n- **البطارية وسرعة الشحن :** \n- **الكاميرات :** ' },
            { id: '3', title: 'التصميم وجودة التصنيع', content: '[تحليل للخامات، الوزن والشعور عند الاستخدام اليومي والراحة في اليد]' },
            { id: '4', title: 'الأداء وتجربة الاستخدام', content: '[سلاسة النظام، تجربة الألعاب الثقيلة والمهام المتعددة وإدارة الحرارة]' },
            { id: '5', title: 'نقاط القوة', content: '- جودة شاشة استثنائية\n- أداء قوي وسلس\n- بطارية تصمد طوال اليوم\n- ضمان الوكيل الرسمي 12 شهراً' },
            { id: '6', title: 'نقاط يجب مراعاتها', content: '- ' },
            { id: '7', title: 'خلاصة Tekno Store', content: '> "جهاز متكامل يقدم قيمة تكنولوجية حقيقية وضماناً معتمداً مع خيار الدفع عند الاستلام في المغرب."', blockType: 'quote' },
            { id: '8', title: 'لمن يوجه هذا الجهاز؟', content: '[المهنيون، صناع المحتوى، محبو الألعاب أو المستخدم اليومي الباحث عن الاعتمادية]' },
            { id: '9', title: 'التقييم النهائي', content: '**التقييم العام : ⭐⭐⭐⭐⭐ 4.8 / 5**' },
        ]
    }
    if (lang === 'en') {
        return [
            { id: '1', title: 'Introduction & First Impressions', content: '[Quick overview of the device, key specs, and value proposition in Morocco]' },
            { id: '2', title: 'Key Technical Specifications', content: '- **Processor :** \n- **RAM :** \n- **Storage :** \n- **Display :** \n- **Battery & Fast Charging :** ' },
            { id: '3', title: 'Design & Build Quality', content: '[Materials, chassis stiffness, port selection, and everyday ergonomic feel]' },
            { id: '4', title: 'Performance & Real-world Benchmarks', content: '[Everyday multitasking, gaming, sustained thermal performance]' },
            { id: '5', title: 'Pros', content: '- Top-tier performance\n- Bright & sharp display\n- Reliable all-day battery life' },
            { id: '6', title: 'Cons', content: '- ' },
            { id: '7', title: 'Tekno Store Verdict', content: '> "A solid high-tech pick offering great reliability and full manufacturer warranty with fast delivery across Morocco."', blockType: 'quote' },
            { id: '8', title: 'Final Rating', content: '**Overall Rating : ⭐⭐⭐⭐⭐ 4.8 / 5**' },
        ]
    }
    return [
        { id: '1', title: 'Introduction & Premières impressions', content: "[Présentation rapide de l'appareil high-tech, son positionnement et pourquoi il se démarque au Maroc]" },
        { id: '2', title: 'Fiche technique clé', content: '- **Marque :** \n- **Modèle :** \n- **Processeur :** \n- **Mémoire vive (RAM) :** \n- **Stockage :** \n- **Écran :** \n- **Batterie & Vitesse de charge :** ' },
        { id: '3', title: 'Design, Écran et Ergonomie', content: "[Qualité des finitions, matériaux, confort en main, fluidité de la dalle et calibrage d'affichage]" },
        { id: '4', title: 'Performances et Puissance au quotidien', content: "[Fluidité du système d'exploitation, multitâche intensif, réactivité dans les applications lourdes et jeux]" },
        { id: '5', title: 'Les points forts', content: '- Performances réactives et stables\n- Écran immersif haute fidélité\n- Excellente autonomie quotidienne\n- Garantie constructeur 12M et support Tekno Store' },
        { id: '6', title: 'Les points à améliorer', content: '- ' },
        { id: '7', title: 'Avis & Verdict Tekno Store', content: '> "Un équipement technologique d\'excellence, alliant durabilité, performances de pointe et sérénité avec le paiement à la livraison COD au Maroc."', blockType: 'quote' },
        { id: '8', title: 'Pour quel profil d’utilisateur ?', content: '[Professionnels nomades, gamers, créateurs multimédias ou utilisateurs à la recherche de pérennité]' },
        { id: '9', title: 'Note finale Tekno Store', content: '**Note globale : ⭐⭐⭐⭐⭐ 4.8 / 5**' },
    ]
}

export default function PostSectionEditor({ initialContent, onChange, lang, postTitle }: PostSectionEditorProps) {
    const [sections, setSections] = useState<Section[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
    const [showBlockMenu, setShowBlockMenu] = useState(false)
    const [deeplStyle, setDeeplStyle] = useState('default')
    const [deeplTone, setDeeplTone] = useState('default')
    const [isRephrasing, setIsRephrasing] = useState<string | null>(null)
    const [isRephrasingTitle, setIsRephrasingTitle] = useState<string | null>(null)
    // Modal génération de prompts images
    const [showImagePromptModal, setShowImagePromptModal] = useState(false)
    const [imagePromptCount, setImagePromptCount] = useState(2)
    const [generatedImagePrompts, setGeneratedImagePrompts] = useState<string[]>([])
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        // Précharger l'éditeur en arrière-plan pour éviter le temps de chargement au clic
        import('react-quill-new').catch(() => {})

        if (!initialContent) {
            setSections([{ id: Date.now().toString(), title: '', content: '', blockType: 'text' }])
            return
        }
        const parts = initialContent.split(/^(?=#+ )/m)
        const parsedSections: Section[] = parts.map((part, index) => {
            const match = part.match(/^(#+)\s+(.*)\n([\s\S]*)$/)
            let title = ''
            let content = part.trim()
            
            if (match) {
                title = match[2]
                content = match[3].trim()
            }
            
            let blockType: BlockType = 'text'
            if (content.startsWith('<!-- VIDEO_BLOCK')) blockType = 'video'
            else if (content.startsWith('<!-- CHART_BLOCK')) blockType = 'chart'
            else if (content.startsWith('<!-- AD_BANNER')) blockType = 'ad'
            else if (content.startsWith('<!-- POLL_BLOCK')) blockType = 'poll'
            else if (content.startsWith('|') && content.includes('|-')) blockType = 'table'
            else if (content.startsWith('>')) blockType = 'quote'

            return { id: String(Date.now() + index), title, content, blockType }
        })
        if (parsedSections.length === 0) parsedSections.push({ id: Date.now().toString(), title: '', content: '', blockType: 'text' })
        setSections(parsedSections)
    }, [])

    useEffect(() => {
        if (sections.length === 0) return
        const markdown = sections.map(s => s.title ? `## ${s.title}\n\n${s.content}` : s.content).join('\n\n')
        onChange(markdown)
    }, [sections])

    const addBlock = (type: BlockType) => {
        setShowBlockMenu(false)
        if (type === 'image') {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/jpeg, image/png, image/webp, image/gif'
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) return
                const formData = new FormData()
                formData.append('file', file)
                try {
                    const res = await fetch('/api/upload', { method: 'POST', body: formData })
                    const data = await res.json()
                    if (data.success) {
                        setSections(prev => [...prev, {
                            id: Date.now().toString(),
                            title: '',
                            content: `<p><img src="${data.url}" alt="Illustration de la section" style="border-radius:1rem; width:100%; object-fit:cover;" /></p>`,
                            blockType: 'image'
                        }])
                    }
                } catch {}
            }
            input.click()
            return
        }
        setSections(prev => [...prev, {
            id: Date.now().toString(),
            title: type === 'quote' ? 'Citation' : type === 'video' ? 'Vidéo' : type === 'table' ? 'Tableau' : type === 'chart' ? 'Graphique' : type === 'ad' ? 'Publicité' : type === 'poll' ? 'Sondage' : '',
            content: blockTemplates[type],
            blockType: type
        }])
    }

    const handleRemoveSection = (id: string) => {
        setSections(prev => {
            if (prev.length <= 1) {
                return [{ id: Date.now().toString(), title: '', content: '', blockType: 'text' }]
            }
            return prev.filter(s => s.id !== id)
        })
    }

    const handleSectionChange = (id: string, field: keyof Section, value: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s))
    }

    const handleApplyTemplate = () => {
        if (sections.some(s => s.content.trim() !== '') && !confirm('Cela remplacera le contenu actuel par le template High-Tech. Continuer ?')) return
        setSections(getHighTechTemplateSections(lang).map(s => ({ ...s, id: Date.now() + Math.random().toString() })))
        setToast({ message: 'Structure d\'article High-Tech Tekno Store appliquée !', type: 'success' })
    }

    const handleRephrase = async (sectionId: string, content: string) => {
        if (!content || content.trim() === '') return
        if (lang === 'ar') {
            alert("DeepL Write ne supporte pas l'arabe actuellement.")
            return
        }
        setIsRephrasing(sectionId)
        try {
            const res = await fetch('/api/admin/translate/rephrase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: content,
                    targetLang: lang === 'en' ? 'EN-US' : 'FR',
                    style: deeplStyle !== 'default' ? deeplStyle : undefined,
                    tone: deeplTone !== 'default' ? deeplTone : undefined,
                })
            })
            const data = await res.json()
            if (data.success && data.rephrased && data.rephrased.length > 0) {
                handleSectionChange(sectionId, 'content', data.rephrased[0])
            } else {
                alert('Erreur DeepL: ' + (data.error || 'Erreur inconnue'))
            }
        } catch (err) {
            alert('Erreur de connexion avec DeepL')
        } finally {
            setIsRephrasing(null)
        }
    }

    const handleRephraseSectionTitle = async (sectionId: string, titleStr: string) => {
        if (!titleStr || titleStr.trim() === '') return
        if (lang === 'ar') {
            alert("DeepL Write ne supporte pas l'arabe actuellement.")
            return
        }
        setIsRephrasingTitle(sectionId)
        try {
            const res = await fetch('/api/admin/translate/rephrase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: titleStr,
                    targetLang: lang === 'en' ? 'EN-US' : 'FR',
                })
            })
            const data = await res.json()
            if (data.success && data.rephrased && data.rephrased.length > 0) {
                // Remove trailing punctuation that DeepL might add to short titles
                const cleanedTitle = data.rephrased[0].replace(/(\.)$/, '')
                handleSectionChange(sectionId, 'title', cleanedTitle)
            } else {
                alert('Erreur DeepL: ' + (data.error || 'Erreur inconnue'))
            }
        } catch (err) {
            alert('Erreur de connexion avec DeepL')
        } finally {
            setIsRephrasingTitle(null)
        }
    }

    const handleGenerateContent = async (langToUse: 'fr' | 'ar') => {
        if (!postTitle) { alert("Veuillez d'abord saisir un titre d'article."); return }
        setIsGenerating(true)
        try {
            const result = await generatePostContent(postTitle, langToUse, 'CONTENT')
            if (result.success && result.content) {
                const parts = result.content.split(/^(?=#+ )/m)
                const parsedSections: Section[] = parts.map((part, index) => {
                    const match = part.match(/^(#+)\s+([^\r\n]*)(?:[\r\n]+([\s\S]*))?$/)
                    if (match) {
                        return { id: String(Date.now() + index), title: match[2].replace(/\*|_/g, '').trim(), content: (match[3] || '').trim(), blockType: 'text' as BlockType }
                    }
                    return { id: String(Date.now() + index), title: '', content: part.replace(/^(#+)\s*/, '').trim(), blockType: 'text' as BlockType }
                }).filter(s => s.title || s.content)
                if (parsedSections.length > 0) {
                    setSections(parsedSections)
                }
            } else alert(result.error || 'Erreur lors de la génération')
        } catch { alert('Erreur lors de la génération') }
        finally { setIsGenerating(false) }
    }

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const newSections = [...sections]
        if (direction === 'up' && index > 0) {
            [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]]
        } else if (direction === 'down' && index < newSections.length - 1) {
            [newSections[index + 1], newSections[index]] = [newSections[index], newSections[index + 1]]
        }
        setSections(newSections)
    }

    const handleCopyPrompt = () => {
        const currentMarkdown = sections.map(s => s.title ? `## ${s.title}\n\n${s.content}` : s.content).join('\n\n')
        const prompt = `Tu es un journaliste high-tech expert et rédacteur SEO senior pour le blog officiel de Tekno Store (tekno.ma), la référence e-commerce au Maroc pour les smartphones, ordinateurs portables, Mac et accessoires technologiques.

Sujet de l'article tech : "${postTitle || 'Guide d\'achat & Test High-Tech Tekno Store'}"
Langue de rédaction : ${lang === 'ar' ? 'Arabe' : lang === 'en' ? 'Anglais' : 'Français'}

CONSIGNES STRICTES POUR LE BLOG TEKNO STORE :
1. Rédige un article complet, captivant, technique et très bien structuré (optimisé SEO Google, Discover et AdSense).
2. Adopte un ton d'expert objectif, orienté conseils d'achat et benchmarks concrets pour les consommateurs au Maroc.
3. STRUCTURE EXIGÉE :
   - Divise impérativement l'article en 6 à 8 sections claires précédées de deux dièses : ## Titre de la Section.
   - Sous chaque titre ##, développe 2 à 4 paragraphes riches et bien documentés, avec des puces comparatives.
4. Sections recommandées à couvrir :
   - ## Introduction & Premières impressions
   - ## Fiche Technique & Spécifications Clés
   - ## Design, Écran et Ergonomie
   - ## Performances, Processeur et Benchmarks
   - ## Autonomie et Vitesse de Charge
   - ## Rapport Qualité / Prix et Disponibilité au Maroc
   - ## Points Forts et Axes d'Amélioration
   - ## Verdict & Avis Tekno Store
5. RÈGLE COMMERCIALE : Ne mentionne pas de prix fixe obsolète, mets plutôt en avant le positionnement tarifaire compétitif, la garantie officielle 12 mois et le paiement sécurisé à la livraison (COD) partout au Maroc.

${currentMarkdown ? `Voici les sections ou notes de travail actuelles à enrichir :\n\n${currentMarkdown}` : ''}`

        navigator.clipboard.writeText(prompt).then(() => {
            setToast({ message: 'Prompt ChatGPT Tekno Store copié dans le presse-papier !', type: 'success' })
        }).catch(() => {
            setToast({ message: 'Erreur lors de la copie du prompt.', type: 'error' })
        })
    }

    const handlePasteChatGPT = async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (!text || text.trim() === '') {
                setToast({ message: 'Le presse-papier est vide.', type: 'error' })
                return
            }

            let clean = text.trim()
            clean = clean.replace(/^```(?:markdown|md)?\s*/i, '').replace(/```$/i, '').trim()

            const parts = clean.split(/^(?=#+ )/m)
            const parsedSections: Section[] = parts.map((part, index) => {
                const match = part.match(/^(#+)\s+([^\r\n]*)(?:[\r\n]+([\s\S]*))?$/)
                if (match) {
                    return { id: String(Date.now() + index), title: match[2].replace(/\*|_/g, '').trim(), content: (match[3] || '').trim(), blockType: 'text' as BlockType }
                }
                return { id: String(Date.now() + index), title: '', content: part.replace(/^(#+)\s*/, '').trim(), blockType: 'text' as BlockType }
            }).filter(s => s.title || s.content)

            if (parsedSections.length > 0) {
                setSections(parsedSections)
                setToast({ message: `${parsedSections.length} sections Tekno Store injectées avec succès !`, type: 'success' })
            } else {
                setToast({ message: 'Aucune section markdown (## Titre) trouvée dans le presse-papier.', type: 'error' })
            }
        } catch (err) {
            setToast({ message: 'Impossible de lire le presse-papier. Assurez-vous d\'autoriser l\'accès.', type: 'error' })
        }
    }

    const handleGenerateImagePrompts = async () => {
        if (sections.length === 0) return
        setIsGeneratingPrompts(true)
        setGeneratedImagePrompts([])

        const imageStyles = [
            "clean minimalist product photography, sleek high-tech devices, modern studio lighting, 4k ultra detailed, commercial look",
            "3D tech isometric render, futuristic aesthetics, soft neon edge glow, clean dark background, octane render",
            "lifestyle high-tech desk setup, laptop and accessories, natural ambient lighting, productivity vibes, realistic photo",
            "close-up macro photography of device details, brushed metal, screen glass reflection, premium craftsmanship"
        ]

        // Prendre les sections les plus longues/pertinentes
        const sortedSections = [...sections]
            .filter(s => s.title || s.content)
            .slice(0, imagePromptCount * 2) // prendre plus pour choisir
        const selected = sortedSections.slice(0, imagePromptCount)
        const prompts = selected.map((s, i) => {
            const title = s.title || `Section ${i + 1}`
            // Nettoyer le contenu HTML pour extraire le texte brut
            const rawContent = s.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
            const style = imageStyles[i % imageStyles.length]
            return `Image ${i + 1} — Section : "${title}"\nPrompt : A high-end editorial tech photograph for an article section titled "${title}". Context: ${rawContent || postTitle}. Style: ${style}. No text or typography in image.`
        })
        setGeneratedImagePrompts(prompts)
        setIsGeneratingPrompts(false)
    }

    const handleCopyImagePrompt = (prompt: string) => {
        navigator.clipboard.writeText(prompt)
    }

    const blockTypes: BlockType[] = ['text', 'image', 'video', 'table', 'quote', 'chart', 'ad', 'poll']

    return (
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-black/[0.03] space-y-8 relative">
            {/* Custom Toast Notification */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-2 ${
                    toast.type === 'success' ? 'bg-[#0F172A] text-white border border-[#75C300]' :
                    toast.type === 'error' ? 'bg-red-600 text-white' :
                    'bg-blue-600 text-white'
                }`}>
                    {toast.type === 'success' && <span className="w-2.5 h-2.5 rounded-full bg-[#75C300]" />}
                    {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-white" />}
                    <span>{toast.message}</span>
                    <button type="button" onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100 text-xs">✕</button>
                </div>
            )}

            {/* Styles globaux de Quill et de la prévisualisation */}
            <style jsx global>{`
                .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #f3f4f6; padding: 12px; background: #faf9f8; }
                .ql-container.ql-snow { border: none; font-size: 16px; }
                .ql-editor { min-height: 150px; padding: 16px; text-align: justify; }
                .ql-editor p { text-align: justify; }
            `}</style>

            {/* En-tête */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Contenu de l'article</h3>
                    <p className="text-sm text-gray-500 mt-1">Gérez le contenu par sections pour une structure SEO optimale.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2 self-end">
                        <button type="button" onClick={handleApplyTemplate}
                            className="px-4 py-2 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-300 flex items-center gap-2"
                            title="Appliquer la structure d'article High-Tech">
                            <Cpu className="w-4 h-4 text-[#1976D2]" /> Template High-Tech
                        </button>
                        <button type="button" onClick={handleCopyPrompt}
                            className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-xs font-bold transition-colors border border-slate-700 flex items-center gap-2 shadow-sm"
                            title="Copier le prompt IA configuré pour le blog Tekno Store">
                            <Bot className="w-4 h-4 text-[#75C300]" /> Prompt ChatGPT
                        </button>
                        <button type="button" onClick={() => setShowImagePromptModal(true)}
                            className="px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-xs font-bold hover:bg-orange-100 transition-colors border border-orange-200 flex items-center gap-2"
                            title="Générer des prompts d'images pour vos sections">
                            <ImageIcon className="w-4 h-4" /> Générer images
                        </button>
                        <button type="button" onClick={handlePasteChatGPT}
                            className="px-4 py-2 bg-[#1976D2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors border border-blue-600 flex items-center gap-2 shadow-sm"
                            title="Coller et injecter la réponse structurée de ChatGPT">
                            <ClipboardPaste className="w-4 h-4" /> Coller réponse
                        </button>
                        <button type="button" onClick={() => handleGenerateContent('ar')} disabled={isGenerating}
                            className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors disabled:opacity-50 border border-green-200 flex items-center gap-2">
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Générer AR
                        </button>
                        <button type="button" onClick={() => handleGenerateContent('fr')} disabled={isGenerating}
                            className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50 border border-blue-200 flex items-center gap-2">
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Générer FR
                        </button>
                    </div>
                    {lang !== 'ar' && (
                        <div className="flex flex-wrap gap-2 items-center bg-blue-50/50 p-2 rounded-xl border border-blue-100 self-end">
                            <Wand2 className="w-4 h-4 text-blue-600 ml-1" />
                            <span className="text-xs font-bold text-blue-800">DeepL Write :</span>
                            <select aria-label="Champ de sélection" value={deeplStyle} onChange={e => setDeeplStyle(e.target.value)} className="text-xs rounded-lg border-blue-200 bg-white text-blue-800 py-1.5 px-3 focus:ring-blue-500">
                                <option value="default">Style (Auto)</option>
                                <option value="simple">Simple</option>
                                <option value="business">Business</option>
                                <option value="academic">Academic</option>
                                <option value="casual">Casual</option>
                            </select>
                            <select aria-label="Champ de sélection" value={deeplTone} onChange={e => setDeeplTone(e.target.value)} className="text-xs rounded-lg border-blue-200 bg-white text-blue-800 py-1.5 px-3 focus:ring-blue-500">
                                <option value="default">Ton (Auto)</option>
                                <option value="enthusiastic">Enthusiastic</option>
                                <option value="friendly">Friendly</option>
                                <option value="confident">Confident</option>
                                <option value="diplomatic">Diplomatic</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Liste des sections */}
            <div className="space-y-6">
                {sections.map((section, index) => {
                    const bType = section.blockType || 'text'
                    const isSpecial = bType !== 'text' && bType !== 'image'
                    return (
                        <div
                            key={section.id}
                            className={`group relative border transition-all duration-200 rounded-3xl overflow-hidden
                                ${activeSectionId === section.id ? 'border-black shadow-md bg-white' : 'border-gray-200 hover:border-gray-300 bg-[#faf9f8]'}`}
                            onFocus={() => setActiveSectionId(section.id)}
                            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setActiveSectionId(null) }}
                        >
                            {/* Boutons déplacement */}
                            <div className="absolute left-4 top-6 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                <button type="button" onClick={() => moveSection(index, 'up')} disabled={index === 0}
                                    className="p-1 hover:bg-white rounded shadow-sm disabled:opacity-30">
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                </button>
                                <button type="button" onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1}
                                    className="p-1 hover:bg-white rounded shadow-sm disabled:opacity-30">
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>

                            <div className="pl-14 p-6 sm:p-8">
                                {/* En-tête section */}
                                <div className="flex items-center gap-4 mb-4">
                                    <BlockTypeBadge type={bType} />
                                    <input
                                        type="text"
                                        value={section.title}
                                        onChange={(e) => handleSectionChange(section.id, 'title', e.target.value)}
                                        placeholder="Titre de la section (ex: Introduction)"
                                        className="flex-1 min-w-0 bg-transparent border-none text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 placeholder:text-gray-300 focus:ring-0 p-0"
                                    />
                                    {lang !== 'ar' && (
                                        <button type="button" onClick={() => handleRephraseSectionTitle(section.id, section.title)} disabled={isRephrasingTitle === section.id || !section.title}
                                            className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold" title="Améliorer le titre avec DeepL Write">
                                            {isRephrasingTitle === section.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                            <span className="hidden sm:inline">Titre</span>
                                        </button>
                                    )}
                                    {(bType === 'text' || bType === 'quote') && lang !== 'ar' && (
                                        <button type="button" onClick={() => handleRephrase(section.id, section.content)} disabled={isRephrasing === section.id}
                                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold" title="Améliorer le contenu avec DeepL Write">
                                            {isRephrasing === section.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                            <span className="hidden sm:inline">Texte</span>
                                        </button>
                                    )}
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveSection(section.id); }}
                                        className="shrink-0 px-4 py-2 text-red-600 hover:text-white hover:bg-red-600 bg-red-100 rounded-xl transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-red-200 shadow-sm">
                                        <Trash2 className="w-4 h-4" />
                                        <span>Supprimer</span>
                                    </button>
                                </div>

                                {/* Editeur selon le type */}
                                {isSpecial ? (
                                    // Bloc spécial : textarea brut
                                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-xs text-gray-500 font-mono">
                                            {bType === 'video' && '🎬 Collez votre lien YouTube embed'}
                                            {bType === 'table' && '📊 Markdown tableau (|col1|col2|...)'}
                                            {bType === 'quote' && '💬 Citation Markdown (> texte)'}
                                            {bType === 'chart' && '📈 Config JSON du graphique'}
                                            {bType === 'ad' && '📣 Bannière publicitaire HTML'}
                                            {bType === 'poll' && '🗳️ Config JSON du sondage'}
                                        </div>
                                        <textarea
                                            value={section.content}
                                            onChange={(e) => handleSectionChange(section.id, 'content', e.target.value)}
                                            rows={bType === 'quote' ? 4 : 8}
                                            className="w-full p-4 text-sm font-mono text-gray-800 bg-white border-none focus:ring-0 resize-y"
                                            placeholder={`Contenu ${blockMeta[bType].label}...`}
                                        />
                                    </div>
                                ) : (
                                    // Bloc texte ou image : Quill (Lazy render for performance)
                                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-transparent transition-all">
                                        {activeSectionId === section.id ? (
                                            <ReactQuill
                                                theme="snow"
                                                value={section.content}
                                                onChange={(content, delta, source) => {
                                                    if (source === 'user' && content !== section.content) {
                                                        handleSectionChange(section.id, 'content', content)
                                                    }
                                                }}
                                                modules={quillModules}
                                                formats={quillFormats}
                                                placeholder="Contenu de la section (Texte riche)..."
                                                className="w-full text-gray-800"
                                            />
                                        ) : (
                                            <div 
                                                className="w-full min-h-[150px] p-4 text-gray-800 cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={() => setActiveSectionId(section.id)}
                                            >
                                                {section.content ? (
                                                    <div className="ql-editor" dangerouslySetInnerHTML={{ __html: section.content }} />
                                                ) : (
                                                    <span className="text-gray-400">Cliquez pour éditer le contenu de la section...</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Boutons d'ajout de blocs */}
            <div className="relative">
                {/* Bouton principal d'ajout */}
                <button
                    type="button"
                    onClick={() => setShowBlockMenu(!showBlockMenu)}
                    className="w-full py-5 border-2 border-dashed border-gray-200 rounded-3xl text-gray-500 font-bold hover:bg-gray-50 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Ajouter un bloc de contenu
                </button>

                {/* Menu des types de blocs */}
                {showBlockMenu && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {blockTypes.map(type => {
                            const meta = blockMeta[type]
                            const Icon = meta.icon
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => addBlock(type)}
                                    className={`flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-2xl border-2 border-dashed font-bold text-xs transition-all ${meta.border} ${meta.color}`}
                                >
                                    <Icon className="w-6 h-6" />
                                    {meta.label}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Modal : Générer des prompts d'images */}
            {showImagePromptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Générer des prompts images</h3>
                                <p className="text-sm text-gray-500 mt-1">Combien d'images souhaitez-vous générer ?</p>
                            </div>
                            <button type="button" onClick={() => { setShowImagePromptModal(false); setGeneratedImagePrompts([]) }}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Choix du nombre */}
                        {generatedImagePrompts.length === 0 && (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm font-bold text-gray-700">Nombre de prompts :</p>
                                <div className="flex gap-3 flex-wrap">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <button key={n} type="button" onClick={() => setImagePromptCount(n)}
                                            className={`w-14 h-14 rounded-2xl text-xl font-black border-2 transition-all ${
                                                imagePromptCount === n
                                                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg scale-105'
                                                    : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                                            }`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                                <button type="button" onClick={handleGenerateImagePrompts} disabled={isGeneratingPrompts}
                                    className="mt-2 w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                                    {isGeneratingPrompts ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                                    Générer {imagePromptCount} prompt{imagePromptCount > 1 ? 's' : ''}
                                </button>
                            </div>
                        )}

                        {/* Résultats */}
                        {generatedImagePrompts.length > 0 && (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-green-700">{generatedImagePrompts.length} prompt{generatedImagePrompts.length > 1 ? 's' : ''} généré{generatedImagePrompts.length > 1 ? 's' : ''} !</p>
                                    <button type="button" onClick={() => setGeneratedImagePrompts([])}
                                        className="text-xs text-gray-500 hover:text-gray-700 underline">Recommencer</button>
                                </div>
                                <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                                    {generatedImagePrompts.map((prompt, i) => (
                                        <div key={i} className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col gap-3">
                                            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{prompt}</pre>
                                            <button type="button" onClick={() => handleCopyImagePrompt(prompt)}
                                                className="self-end px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-colors">
                                                <Copy className="w-3.5 h-3.5" /> Copier
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
