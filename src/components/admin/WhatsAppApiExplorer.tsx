'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    AlertTriangle,
    Braces,
    Check,
    ChevronDown,
    Copy,
    ExternalLink,
    HelpCircle,
    Info,
    Loader2,
    Play,
    RefreshCw,
    RotateCcw,
    Search,
    Terminal
} from 'lucide-react'
import {
    executeWahaApiOperation,
    getWahaOpenApiCatalog,
    type WahaApiExplorerResponse,
    type WahaApiOperation,
    type WahaApiParameter
} from '@/lib/actions/whatsapp-gateway'

const METHOD_STYLES: Record<WahaApiOperation['method'], string> = {
    GET: 'bg-sky-100 text-sky-800 border-sky-200',
    POST: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    PUT: 'bg-amber-100 text-amber-800 border-amber-200',
    PATCH: 'bg-violet-100 text-violet-800 border-violet-200',
    DELETE: 'bg-rose-100 text-rose-800 border-rose-200'
}

function responseText(response: WahaApiExplorerResponse | null) {
    if (!response) return ''
    if (response.data !== undefined) return JSON.stringify(response.data, null, 2)
    if (response.text !== undefined) return response.text
    if (response.base64) return `[Réponse binaire ${response.contentType || ''} — ${response.base64.length} caractères base64]`
    return response.error || ''
}

interface WhatsAppApiExplorerProps {
    sessions?: Array<{ name: string; status?: string }>
}

export function WhatsAppApiExplorer({ sessions = [] }: WhatsAppApiExplorerProps) {
    const [operations, setOperations] = useState<WahaApiOperation[]>([])
    const [loadingCatalog, setLoadingCatalog] = useState(true)
    const [catalogError, setCatalogError] = useState('')
    const [search, setSearch] = useState('')
    const [tag, setTag] = useState('Tous')
    const [activeSession, setActiveSession] = useState<string>(sessions[0]?.name || 'default')
    const [selected, setSelected] = useState<WahaApiOperation | null>(null)
    const [path, setPath] = useState('/api/sessions?all=true')
    const [method, setMethod] = useState<WahaApiOperation['method']>('GET')
    const [jsonBody, setJsonBody] = useState('{}')
    const [running, setRunning] = useState(false)
    const [durationMs, setDurationMs] = useState<number | null>(null)
    const [response, setResponse] = useState<WahaApiExplorerResponse | null>(null)
    const [copiedCurl, setCopiedCurl] = useState(false)
    const [copiedResponse, setCopiedResponse] = useState(false)
    const [activeTab, setActiveTab] = useState<'body' | 'params' | 'info'>('body')

    const loadCatalog = async () => {
        setLoadingCatalog(true)
        setCatalogError('')
        const result = await getWahaOpenApiCatalog()
        if (result.success) {
            setOperations(result.operations)
        } else {
            setCatalogError(result.error || 'Catalogue Swagger indisponible')
        }
        setLoadingCatalog(false)
    }

    useEffect(() => {
        void loadCatalog()
    }, [])

    const sessionNames = useMemo(() => {
        const set = new Set(['default', ...sessions.map(s => s.name)])
        return Array.from(set)
    }, [sessions])

    const tagsWithCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const op of operations) {
            counts[op.tag] = (counts[op.tag] || 0) + 1
        }
        return counts
    }, [operations])

    const tags = useMemo(() => ['Tous', ...Object.keys(tagsWithCounts).sort()], [tagsWithCounts])

    const filtered = useMemo(() => {
        const query = search.trim().toLocaleLowerCase()
        return operations.filter(item => {
            if (tag !== 'Tous' && item.tag !== tag) return false
            if (!query) return true
            return `${item.method} ${item.path} ${item.summary} ${item.description || ''} ${item.operationId}`.toLocaleLowerCase().includes(query)
        })
    }, [operations, search, tag])

    const applySessionToPathAndBody = (rawPath: string, rawSample?: string, sessionToApply: string = activeSession) => {
        const resolvedPath = rawPath.replace(/\{session\}/g, encodeURIComponent(sessionToApply))
        let resolvedBody = rawSample || '{}'
        if (resolvedBody.includes('"session"')) {
            try {
                const parsed = JSON.parse(resolvedBody)
                if (typeof parsed === 'object' && parsed !== null && 'session' in parsed) {
                    parsed.session = sessionToApply
                    resolvedBody = JSON.stringify(parsed, null, 2)
                }
            } catch {}
        }
        return { resolvedPath, resolvedBody }
    }

    const chooseOperation = (operation: WahaApiOperation) => {
        setSelected(operation)
        setMethod(operation.method)
        const { resolvedPath, resolvedBody } = applySessionToPathAndBody(operation.path, operation.requestBodySample)
        setPath(resolvedPath)
        setJsonBody(resolvedBody)
        setResponse(null)
        setDurationMs(null)
        if (operation.parameters && operation.parameters.length > 0 && operation.method === 'GET') {
            setActiveTab('params')
        } else if (operation.method !== 'GET') {
            setActiveTab('body')
        } else {
            setActiveTab('info')
        }
    }

    const handleSessionChange = (newSession: string) => {
        setActiveSession(newSession)
        if (selected) {
            const { resolvedPath, resolvedBody } = applySessionToPathAndBody(selected.path, jsonBody, newSession)
            setPath(resolvedPath)
            setJsonBody(resolvedBody)
        }
    }

    const resetBodyToSample = () => {
        if (!selected) return
        const { resolvedBody } = applySessionToPathAndBody(selected.path, selected.requestBodySample)
        setJsonBody(resolvedBody)
    }

    const copyCurl = () => {
        const headersStr = "-H 'Content-Type: application/json' -H 'X-Api-Key: petsunivers_waha_api_key_2026'"
        const bodyStr = method !== 'GET' && jsonBody.trim() ? ` -d '${jsonBody.replace(/'/g, "'\\''")}'` : ''
        const curlCmd = `curl -X ${method} "http://167.86.108.246:3001${path}" ${headersStr}${bodyStr}`
        void navigator.clipboard.writeText(curlCmd)
        setCopiedCurl(true)
        setTimeout(() => setCopiedCurl(false), 2000)
    }

    const copyResponse = () => {
        const text = responseText(response)
        if (!text) return
        void navigator.clipboard.writeText(text)
        setCopiedResponse(true)
        setTimeout(() => setCopiedResponse(false), 2000)
    }

    const run = async () => {
        const mutates = method !== 'GET'
        if (mutates && !window.confirm(`${method} ${path}\n\nCette requête peut modifier les données ou sessions WAHA. Continuer ?`)) return
        setRunning(true)
        setResponse(null)
        setDurationMs(null)
        const start = performance.now()
        const result = await executeWahaApiOperation({
            method,
            path,
            jsonBody: method === 'GET' ? undefined : jsonBody
        })
        const end = performance.now()
        setDurationMs(Math.round(end - start))
        setResponse(result)
        setRunning(false)
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.4fr)]">
            {/* Colonne Catalogue Swagger */}
            <section className="flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-black text-slate-900">Catalogue Swagger WAHA</h2>
                            <p className="mt-1 text-xs font-semibold text-gray-500">
                                {operations.length > 0 ? `${operations.length} endpoints disponibles` : 'Chargement...'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void loadCatalog()}
                            disabled={loadingCatalog}
                            className="rounded-xl border border-gray-200 p-2.5 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                            title="Actualiser la liste Swagger"
                        >
                            <RefreshCw className={`h-4 w-4 ${loadingCatalog ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Session active par défaut */}
                    <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 p-2.5">
                        <span className="text-xs font-black text-slate-700">Session cible :</span>
                        <select
                            value={activeSession}
                            onChange={e => handleSessionChange(e.target.value)}
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                        >
                            {sessionNames.map(name => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Barre de recherche */}
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Filtrer par URL, méthode, mot-clé…"
                            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-emerald-500"
                        />
                    </div>

                    {/* Filtre par Tag */}
                    <select
                        value={tag}
                        onChange={event => setTag(event.target.value)}
                        className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                    >
                        {tags.map(value => (
                            <option key={value} value={value}>
                                {value === 'Tous' ? `Tous les tags (${operations.length})` : `${value} (${tagsWithCounts[value] || 0})`}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="max-h-[680px] overflow-y-auto p-2">
                    {loadingCatalog && (
                        <div className="flex items-center justify-center gap-2 p-12 text-xs font-bold text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                            Chargement du catalogue Swagger…
                        </div>
                    )}
                    {catalogError && (
                        <p className="m-3 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-700">
                            {catalogError}
                        </p>
                    )}
                    {!loadingCatalog && !catalogError && filtered.length === 0 && (
                        <p className="p-8 text-center text-xs font-bold text-gray-400">
                            Aucun endpoint ne correspond à votre recherche.
                        </p>
                    )}
                    {!loadingCatalog && !catalogError && filtered.map(operation => {
                        const isSelected = selected?.method === operation.method && selected.path === operation.path
                        return (
                            <button
                                key={`${operation.method}-${operation.path}`}
                                type="button"
                                onClick={() => chooseOperation(operation)}
                                className={`mb-1.5 w-full rounded-2xl border p-3 text-left transition-all ${
                                    isSelected
                                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                        : 'border-transparent bg-white hover:border-gray-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-start gap-2.5">
                                    <span
                                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase ${
                                            METHOD_STYLES[operation.method]
                                        }`}
                                    >
                                        {operation.method}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="break-all font-mono text-[11px] font-bold">
                                            {operation.path}
                                        </p>
                                        <p
                                            className={`mt-1 line-clamp-1 text-[11px] ${
                                                isSelected ? 'text-slate-300' : 'text-gray-500'
                                            }`}
                                        >
                                            {operation.summary || operation.operationId || operation.tag}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* Colonne Console d'Exécution */}
            <section className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                            <Braces className="h-5 w-5 text-emerald-600" /> Console d'Appel API
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                            Exécution directe et sécurisée côté serveur vers la passerelle WAHA.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={copyCurl}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 hover:bg-gray-50"
                            title="Copier comme commande cURL"
                        >
                            {copiedCurl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Terminal className="h-3.5 w-3.5" />}
                            <span>cURL</span>
                        </button>
                        <a
                            href="http://167.86.108.246:3001/"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 hover:bg-gray-50"
                        >
                            <span>Swagger</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </div>
                </div>

                {/* Opération sélectionnée */}
                {selected && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="rounded-md bg-white px-2.5 py-1 text-xs font-black text-slate-700 border border-gray-200">
                                {selected.tag}
                            </span>
                            {selected.deprecated && (
                                <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
                                    <AlertTriangle className="h-3.5 w-3.5" /> Obsolète
                                </span>
                            )}
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-800">
                            {selected.summary || selected.operationId}
                        </p>
                        {selected.description && (
                            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                                {selected.description}
                            </p>
                        )}
                    </div>
                )}

                {/* Méthode & Chemin */}
                <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-600">
                        Endpoint & Paramètres
                    </label>
                    <div className="grid gap-2 sm:grid-cols-[130px_1fr]">
                        <select
                            value={method}
                            onChange={event => setMethod(event.target.value as WahaApiOperation['method'])}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black outline-none focus:border-emerald-500"
                        >
                            {Object.keys(METHOD_STYLES).map(value => (
                                <option key={value}>{value}</option>
                            ))}
                        </select>
                        <input
                            value={path}
                            onChange={event => setPath(event.target.value)}
                            placeholder="/api/..."
                            className="min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-xs outline-none focus:border-emerald-500"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Onglets Paramètres / Corps JSON / Infos */}
                <div>
                    <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                        {method !== 'GET' && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('body')}
                                className={`rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                                    activeTab === 'body'
                                        ? 'bg-slate-900 text-white'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Corps JSON
                            </button>
                        )}
                        {selected?.parameters && selected.parameters.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('params')}
                                className={`rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                                    activeTab === 'params'
                                        ? 'bg-slate-900 text-white'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Paramètres ({selected.parameters.length})
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setActiveTab('info')}
                            className={`rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                                activeTab === 'info'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            Détails & Aide
                        </button>

                        {activeTab === 'body' && method !== 'GET' && selected?.requestBodySample && (
                            <button
                                type="button"
                                onClick={resetBodyToSample}
                                className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-slate-900"
                                title="Réinitialiser avec le schéma type"
                            >
                                <RotateCcw className="h-3 w-3" />
                                <span>Schéma type</span>
                            </button>
                        )}
                    </div>

                    <div className="mt-3">
                        {activeTab === 'body' && method !== 'GET' && (
                            <textarea
                                value={jsonBody}
                                onChange={event => setJsonBody(event.target.value)}
                                rows={9}
                                spellCheck={false}
                                className="w-full rounded-2xl border border-gray-200 bg-slate-950 p-4 font-mono text-xs leading-5 text-emerald-300 outline-none focus:border-emerald-500"
                            />
                        )}

                        {activeTab === 'params' && selected?.parameters && (
                            <div className="max-h-60 overflow-y-auto rounded-2xl border border-gray-200 p-3">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 font-black text-gray-500">
                                            <th className="pb-2">Nom</th>
                                            <th className="pb-2">Emplacement</th>
                                            <th className="pb-2">Requis</th>
                                            <th className="pb-2">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                                        {selected.parameters.map(param => (
                                            <tr key={`${param.in}-${param.name}`}>
                                                <td className="py-2 font-bold text-slate-900">{param.name}</td>
                                                <td className="py-2 text-gray-500">{param.in}</td>
                                                <td className="py-2">
                                                    {param.required ? (
                                                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-700">
                                                            OUI
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">non</span>
                                                    )}
                                                </td>
                                                <td className="py-2 font-sans text-gray-600">
                                                    {param.description || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <div className="rounded-2xl border border-gray-200 p-4 text-xs text-gray-600 space-y-2">
                                <p className="font-bold text-slate-800">
                                    Identifiant de l'opération : <code className="rounded bg-gray-100 px-1 py-0.5">{selected?.operationId || 'N/A'}</code>
                                </p>
                                <p>
                                    Toutes les requêtes envoyées depuis cette interface incluent automatiquement la clé API et l'authentification WAHA configurées sur votre serveur.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bouton Exécuter */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => void run()}
                        disabled={running || !path.trim()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black text-white transition-all hover:bg-black disabled:opacity-50"
                    >
                        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        <span>Exécuter la requête</span>
                    </button>
                    {durationMs !== null && (
                        <span className="text-xs font-semibold text-gray-500">
                            Durée : <strong className="text-slate-900">{durationMs} ms</strong>
                        </span>
                    )}
                </div>

                {/* Panneau de Réponse */}
                {response && (
                    <div className="overflow-hidden rounded-2xl border border-gray-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-black">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                                        response.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}
                                >
                                    {response.status || (response.success ? 200 : 'ERR')} {response.statusText}
                                </span>
                                <span className="text-gray-400 font-mono text-[11px]">{response.contentType}</span>
                                {response.truncated && (
                                    <span className="text-amber-700 text-[11px]">Tronqué (limite 4 Mo)</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={copyResponse}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
                            >
                                {copiedResponse ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedResponse ? 'Copié' : 'Copier'}</span>
                            </button>
                        </div>
                        {response.error && (
                            <p className="bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                                {response.error}
                            </p>
                        )}
                        <pre className="max-h-[500px] overflow-auto bg-slate-950 p-4 text-xs font-mono leading-5 text-slate-200">
                            {responseText(response) || '(réponse vide)'}
                        </pre>
                    </div>
                )}
            </section>
        </div>
    )
}
