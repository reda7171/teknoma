'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, Sparkles, Loader2, Book as BookIcon, Image as ImageIcon, Video, Table2, Quote, BarChart2, Megaphone, Vote, Wand2, Copy, ClipboardPaste } from 'lucide-react'
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
    table: `| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Donnée 1  | Donnée 2  | Donnée 3  |
| Donnée 4  | Donnée 5  | Donnée 6  |`,
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

const getBookTemplateSections = (lang: 'fr' | 'ar' | 'en'): Section[] => {
    if (lang === 'ar') {
        return [
            { id: '1', title: 'مقدمة', content: '[تقديم سريع للكتاب ولماذا يستحق الاهتمام]' },
            { id: '2', title: 'معلومات عامة', content: '- **العنوان :** \n- **المؤلف :** \n- **النوع :** \n- **تاريخ النشر :** \n- **عدد الصفحات :** ' },
            { id: '3', title: 'ملخص الكتاب', content: '[ملخص قصير بدون حرق للأحداث]' },
            { id: '4', title: 'الشخصيات', content: '- **الشخصية الرئيسية :** \n- **شخصيات ثانوية :** ' },
            { id: '5', title: 'نقاط القوة', content: '- ' },
            { id: '6', title: 'نقاط الضعف', content: '- ' },
            { id: '7', title: 'اقتباس(ات) بارزة', content: '> " "', blockType: 'quote' },
            { id: '8', title: 'لمن هذا الكتاب؟', content: '[المبتدئين، محبي الخيال، إلخ]' },
            { id: '9', title: 'ملاحظة نهائية', content: '**التقييم العام : ⭐ /5**' },
        ]
    }
    if (lang === 'en') {
        return [
            { id: '1', title: 'Introduction', content: '[Brief presentation of the book]' },
            { id: '2', title: 'General Information', content: '- **Title :** \n- **Author :** \n- **Genre :** \n- **Publication Date :** ' },
            { id: '3', title: 'Book Summary', content: '[Short summary without spoilers]' },
            { id: '4', title: 'Notable Quote', content: '> " "', blockType: 'quote' },
            { id: '5', title: 'Final Note', content: '**Overall Rating : ⭐ /5**' },
        ]
    }
    return [
        { id: '1', title: 'Introduction', content: "[Présentation rapide du livre et pourquoi il mérite l'attention]" },
        { id: '2', title: 'Informations générales', content: '- **Titre :** \n- **Auteur :** \n- **Genre :** \n- **Date de publication :** \n- **Nombre de pages :** ' },
        { id: '3', title: 'Résumé du livre', content: '[Résumé court sans spoiler]' },
        { id: '4', title: 'Les points forts', content: '- ' },
        { id: '5', title: 'Les points faibles', content: '- ' },
        { id: '6', title: 'Citation(s) marquante(s)', content: '> " "', blockType: 'quote' },
        { id: '7', title: 'Pour quel type de lecteur ?', content: '[Débutants, fans de fantasy, etc.]' },
        { id: '8', title: 'Note finale / avis personnel', content: '**Note globale : ⭐ /5**' },
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
                            content: `<p><img src="${data.url}" alt="Image illustratrice" style="border-radius:1rem; width:100%; object-fit:cover;" /></p>`,
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
        if (sections.some(s => s.content.trim() !== '') && !confirm('Cela remplacera le contenu actuel. Continuer ?')) return
        setSections(getBookTemplateSections(lang).map(s => ({ ...s, id: Date.now() + Math.random().toString() })))
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
        const prompt = `Voici le sujet de l'article : "${postTitle}".\n\nJe veux que tu m'écrives un article très long et détaillé qui respecte les conditions Google AdSense (haute valeur ajoutée, structuré, contenu original, pas de bourrage de mots-clés).\n\nTa réponse doit être formattée exactement de cette manière :\n1. Titres de section (utilise ## Titre)\n2. Paragraphes : plusieurs paragraphes détaillés sous chaque section.\n\nVoici le contenu actuel si tu veux t'en inspirer pour le développer :\n\n${currentMarkdown}`
        navigator.clipboard.writeText(prompt)
        alert('Prompt copié dans le presse-papier ! Vous pouvez le coller dans ChatGPT.')
    }

    const handlePasteChatGPT = async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (!text || text.trim() === '') {
                alert('Le presse-papier est vide.')
                return
            }
            
            const parts = text.split(/^(?=#+ )/m)
            const parsedSections: Section[] = parts.map((part, index) => {
                const match = part.match(/^(#+)\s+([^\r\n]*)(?:[\r\n]+([\s\S]*))?$/)
                if (match) {
                    return { id: String(Date.now() + index), title: match[2].replace(/\*|_/g, '').trim(), content: (match[3] || '').trim(), blockType: 'text' as BlockType }
                }
                return { id: String(Date.now() + index), title: '', content: part.replace(/^(#+)\s*/, '').trim(), blockType: 'text' as BlockType }
            }).filter(s => s.title || s.content)
            
            if (parsedSections.length > 0) {
                if (confirm('Voulez-vous remplacer le contenu actuel par le texte copié de ChatGPT ?')) {
                    setSections(parsedSections)
                }
            } else {
                alert("Aucune section valide trouvée dans le presse-papier.")
            }
        } catch (err) {
            alert('Impossible de lire le presse-papier automatiquement. Assurez-vous d\'autoriser l\'accès.')
        }
    }

    const blockTypes: BlockType[] = ['text', 'image', 'video', 'table', 'quote', 'chart', 'ad', 'poll']

    return (
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-black/[0.03] space-y-8">
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
                    <p className="text-sm text-gray-500 mt-1">Gérez le contenu par blocs pour plus de clarté.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2 self-end">
                        <button type="button" onClick={handleApplyTemplate}
                            className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors border border-gray-200 flex items-center gap-2">
                            <BookIcon className="w-4 h-4" /> Template Livre
                        </button>
                        <button type="button" onClick={handleCopyPrompt}
                            className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200 flex items-center gap-2" title="Copier le prompt pour ChatGPT">
                            <Copy className="w-4 h-4" /> Prompt ChatGPT
                        </button>
                        <button type="button" onClick={handlePasteChatGPT}
                            className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200 flex items-center gap-2" title="Coller la réponse structurée de ChatGPT">
                            <ClipboardPaste className="w-4 h-4" /> Coller Sections
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
                            <select value={deeplStyle} onChange={e => setDeeplStyle(e.target.value)} className="text-xs rounded-lg border-blue-200 bg-white text-blue-800 py-1.5 px-3 focus:ring-blue-500">
                                <option value="default">Style (Auto)</option>
                                <option value="simple">Simple</option>
                                <option value="business">Business</option>
                                <option value="academic">Academic</option>
                                <option value="casual">Casual</option>
                            </select>
                            <select value={deeplTone} onChange={e => setDeeplTone(e.target.value)} className="text-xs rounded-lg border-blue-200 bg-white text-blue-800 py-1.5 px-3 focus:ring-blue-500">
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
                                        className="flex-1 bg-transparent border-none text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 placeholder:text-gray-300 focus:ring-0 p-0"
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
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                        <Trash2 className="w-5 h-5" />
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
        </div>
    )
}
