import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/app/[locale]/admin/marketing/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Stamp and other icons to import
content = content.replace(
    /Megaphone,\s*Plus\s*\}\s*from\s*'lucide-react'/,
    `Megaphone,
    Plus,
    Stamp,
    FolderOpen
} from 'lucide-react'`
);

// 2. Add state variables for active tab and media
const stateInsertionPoint = `    // Modal diapo preview
    const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false)`;
const stateToInsert = `    // Tabs & Media
    const [activeTab, setActiveTab] = useState<'creatives' | 'media'>('creatives')
    const [mediaItems, setMediaItems] = useState<{books: any[], authors: any[], blogPosts: any[]}>({ books: [], authors: [], blogPosts: [] })
    
    // Watermark
    const [isWatermarking, setIsWatermarking] = useState<Record<string, boolean>>({})
    const [watermarkModalOpen, setWatermarkModalOpen] = useState(false)
    const [watermarkImageUrl, setWatermarkImageUrl] = useState('')
    const [watermarkGravity, setWatermarkGravity] = useState('southeast')
    
    const fetchMedia = async () => {
        try {
            const res = await fetch('/api/admin/marketing/media')
            const data = await res.json()
            if (data.success) {
                setMediaItems({
                    books: data.books || [],
                    authors: data.authors || [],
                    blogPosts: data.blogPosts || []
                })
            }
        } catch (error) {}
    }

    useEffect(() => {
        if (activeTab === 'media') fetchMedia()
    }, [activeTab])

    const openWatermarkModal = (imgUrl: string) => {
        setWatermarkImageUrl(imgUrl)
        setWatermarkGravity('southeast')
        setWatermarkModalOpen(true)
    }

    const handleWatermark = async () => {
        if (!watermarkImageUrl) return
        const imageUrl = watermarkImageUrl
        const gravity = watermarkGravity

        setIsWatermarking(prev => ({ ...prev, [imageUrl]: true }))
        setWatermarkModalOpen(false)
        try {
            const res = await fetch('/api/admin/marketing/media/watermark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl, gravity })
            })
            const data = await res.json()
            if (data.success) {
                alert('Image filigranée avec succès ! Elle est maintenant dans "Créatives Marketing".')
                fetchAssets()
            } else {
                alert(data.error || 'Erreur lors de l\\'ajout du filigrane')
            }
        } catch (error) {
            alert('Erreur technique')
        } finally {
            setIsWatermarking(prev => ({ ...prev, [imageUrl]: false }))
        }
    }

`;
content = content.replace(stateInsertionPoint, stateToInsert + stateInsertionPoint);

// 3. Add Tabs UI and Media tab content
const uiInsertionPoint = `{/* Mobile Drawer */}`;
const tabsUi = `
            {/* TABS */}
            <div className="flex items-center gap-4 mb-6 border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('creatives')}
                    className={\`pb-4 px-2 font-bold transition-all border-b-2 \${activeTab === 'creatives' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}\`}
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Créatives Marketing
                    </div>
                </button>
                <button 
                    onClick={() => setActiveTab('media')}
                    className={\`pb-4 px-2 font-bold transition-all border-b-2 \${activeTab === 'media' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}\`}
                >
                    <div className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5" />
                        Médiathèque
                    </div>
                </button>
            </div>

            {activeTab === 'media' && (
                <div className="space-y-12 pb-24">
                    {/* Statistiques Media */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                            <div className="text-3xl mb-2">📚</div>
                            <h3 className="font-bold text-slate-600 text-sm">Livres</h3>
                            <p className="text-3xl font-black text-slate-900 mt-2">{mediaItems.books.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                            <div className="text-3xl mb-2">✍️</div>
                            <h3 className="font-bold text-slate-600 text-sm">Auteurs</h3>
                            <p className="text-3xl font-black text-slate-900 mt-2">{mediaItems.authors.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                            <div className="text-3xl mb-2">📝</div>
                            <h3 className="font-bold text-slate-600 text-sm">Blog</h3>
                            <p className="text-3xl font-black text-slate-900 mt-2">{mediaItems.blogPosts.length}</p>
                        </div>
                    </div>

                    {/* Section Livres */}
                    {mediaItems.books.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <span>📚</span> Couvertures de Livres
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {mediaItems.books.map(book => {
                                    const imgUrl = book.image.startsWith('http') ? book.image : \`/uploads/books/\${book.image}\`
                                    return (
                                        <div key={book.id} className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all">
                                            <div className="aspect-[3/4] relative bg-slate-900">
                                                <Image src={imgUrl} alt={book.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <a href={imgUrl} target="_blank" className="p-2 bg-white rounded-xl hover:bg-slate-100 transition-colors" title="Aperçu"><Eye className="w-4 h-4" /></a>
                                                    <button onClick={() => openWatermarkModal(imgUrl)} disabled={isWatermarking[imgUrl]} className={\`p-2 rounded-xl transition-colors \${isWatermarking[imgUrl] ? 'bg-indigo-300 text-white' : 'bg-indigo-500 text-white'}\`}><Stamp className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                            <div className="p-3"><p className="text-xs font-bold truncate text-slate-900">{book.title}</p></div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Section Auteurs */}
                    {mediaItems.authors.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <span>✍️</span> Photos d'Auteurs
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {mediaItems.authors.map(author => {
                                    const imgUrl = author.image.startsWith('http') ? author.image : \`/uploads/\${author.image}\`
                                    return (
                                        <div key={author.id} className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all">
                                            <div className="aspect-square relative bg-slate-900">
                                                <Image src={imgUrl} alt={author.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <a href={imgUrl} target="_blank" className="p-2 bg-white rounded-xl hover:bg-slate-100 transition-colors" title="Aperçu"><Eye className="w-4 h-4" /></a>
                                                    <button onClick={() => openWatermarkModal(imgUrl)} disabled={isWatermarking[imgUrl]} className={\`p-2 rounded-xl transition-colors \${isWatermarking[imgUrl] ? 'bg-indigo-300 text-white' : 'bg-indigo-500 text-white'}\`}><Stamp className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                            <div className="p-3"><p className="text-xs font-bold truncate text-slate-900">{author.name}</p></div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Section Blog */}
                    {mediaItems.blogPosts.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <span>📝</span> Images du Blog
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {mediaItems.blogPosts.map(post => {
                                    const imgUrl = post.coverImage.startsWith('http') ? post.coverImage : \`/\${post.coverImage.replace(/^\\/+/, '')}\`
                                    return (
                                        <div key={post.id} className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all">
                                            <div className="aspect-video relative bg-slate-900">
                                                <Image src={imgUrl} alt={post.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <a href={imgUrl} target="_blank" className="p-2 bg-white rounded-xl hover:bg-slate-100 transition-colors" title="Aperçu"><Eye className="w-4 h-4" /></a>
                                                    <button onClick={() => openWatermarkModal(imgUrl)} disabled={isWatermarking[imgUrl]} className={\`p-2 rounded-xl transition-colors \${isWatermarking[imgUrl] ? 'bg-indigo-300 text-white' : 'bg-indigo-500 text-white'}\`}><Stamp className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                            <div className="p-3"><p className="text-xs font-bold truncate text-slate-900">{post.title}</p></div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* === ONGLET CRÉATIVES === */}
            {activeTab === 'creatives' && <>
`;
content = content.replace(uiInsertionPoint, tabsUi + uiInsertionPoint);

// 4. Close the activeTab === 'creatives' tag near the end, just before the first modal (Modal d'Upload)
const closeTabInsertionPoint = `{/* Modal d'Upload */}`;
const closeTab = `</>}
            `;
content = content.replace(closeTabInsertionPoint, closeTab + closeTabInsertionPoint);

// 5. Add the Watermark Modal at the very end
const modalInsertionPoint = `{/* Modal diapo preview + publication groupée */}`;
const watermarkModal = `
            {/* Modal Filigrane */}
            {watermarkModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setWatermarkModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-black text-slate-900">Position du Logo</h2>
                                <button onClick={() => setWatermarkModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Choisissez l'emplacement</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'northwest', label: 'Haut Gauche' },
                                            { id: 'north', label: 'Haut Centre' },
                                            { id: 'northeast', label: 'Haut Droite' },
                                            { id: 'west', label: 'Milieu Gauche' },
                                            { id: 'center', label: 'Centre' },
                                            { id: 'east', label: 'Milieu Droite' },
                                            { id: 'southwest', label: 'Bas Gauche' },
                                            { id: 'south', label: 'Bas Centre' },
                                            { id: 'southeast', label: 'Bas Droite' }
                                        ].map(pos => (
                                            <button
                                                key={pos.id}
                                                onClick={() => setWatermarkGravity(pos.id)}
                                                className={\`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all h-24 \${
                                                    watermarkGravity === pos.id 
                                                        ? 'bg-indigo-50 border-indigo-600 text-indigo-600' 
                                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                }\`}
                                            >
                                                <div className={\`w-3 h-3 rounded-full mb-2 \${watermarkGravity === pos.id ? 'bg-indigo-600' : 'bg-slate-300'}\`} />
                                                <span className="text-[10px] font-black uppercase text-center leading-tight">{pos.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={handleWatermark}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-2xl transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                                >
                                    <Stamp className="w-5 h-5" />
                                    Appliquer le Logo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            `;
content = content.replace(modalInsertionPoint, watermarkModal + modalInsertionPoint);

fs.writeFileSync(file, content, 'utf8');
console.log('Success');
