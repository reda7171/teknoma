'use client'

import { useState } from 'react'
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, ContactRound, ImageIcon, Link2, Loader2, RefreshCw, Save, Search, ShieldOff } from 'lucide-react'
import {
    getWahaContact,
    getWahaContacts,
    getWahaLids,
    getWahaLidsCount,
    inspectWahaContact,
    resolveWahaLid,
    setWahaContactBlocked,
    updateWahaContact,
    type WahaContact,
    type WahaLidMapping,
    type WahaSessionItem
} from '@/lib/actions/whatsapp-gateway'

interface Props { sessions: WahaSessionItem[]; onShowFeedback: (message: string, type: 'success' | 'error') => void }

export function WhatsAppContactsView({ sessions, onShowFeedback }: Props) {
    const working = sessions.filter(item => item.status === 'WORKING')
    const [session, setSession] = useState(working[0]?.name || sessions[0]?.name || 'default')
    const [section, setSection] = useState<'contacts' | 'lids'>('contacts')
    const [contacts, setContacts] = useState<WahaContact[]>([])
    const [selected, setSelected] = useState<WahaContact | null>(null)
    const [contactId, setContactId] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [contactResult, setContactResult] = useState<unknown>(null)
    const [mappings, setMappings] = useState<WahaLidMapping[]>([])
    const [lidCount, setLidCount] = useState<number | null>(null)
    const [lidValue, setLidValue] = useState('')
    const [lidResult, setLidResult] = useState<WahaLidMapping | null>(null)
    const [offset, setOffset] = useState(0)
    const [lidOffset, setLidOffset] = useState(0)
    const [busy, setBusy] = useState('')
    const pageSize = 100

    const feedback = (success: boolean, error: string | undefined, message: string) => onShowFeedback(success ? message : error || 'Action WAHA échouée', success ? 'success' : 'error')
    const reset = (value: string) => { setSession(value); setContacts([]); setSelected(null); setMappings([]); setContactResult(null); setLidResult(null); setOffset(0); setLidOffset(0) }

    const loadContacts = async (nextOffset = offset) => {
        setBusy('contacts'); const result = await getWahaContacts(session, pageSize, nextOffset); setBusy('')
        if (result.success) { setContacts(result.contacts); setOffset(nextOffset) }
        feedback(result.success, result.error, `${result.contacts.length} contact(s) chargé(s)`)
    }
    const searchContact = async (routeStyle: 'query' | 'session') => {
        setBusy(`search-${routeStyle}`); const result = await getWahaContact(session, contactId, routeStyle); setBusy('')
        if (result.success && result.contact) { setSelected(result.contact); setContactResult(result.contact) }
        feedback(result.success, result.error, 'Contact trouvé')
    }
    const inspect = async (type: 'exists' | 'about' | 'picture') => {
        setBusy(type); const result = await inspectWahaContact(session, contactId, type); setBusy('')
        if (result.success) setContactResult(result.data)
        feedback(result.success, result.error, type === 'exists' ? 'Vérification terminée' : type === 'about' ? 'À propos chargé' : 'Photo chargée')
    }
    const saveContact = async () => {
        setBusy('save'); const result = await updateWahaContact(session, contactId, firstName, lastName); setBusy('')
        if (result.success) setContactResult(result.data)
        feedback(result.success, result.error, 'Contact créé ou mis à jour')
    }
    const blockContact = async (blocked: boolean) => {
        if (blocked && !confirm('Bloquer ce contact WhatsApp ?')) return
        setBusy(blocked ? 'block' : 'unblock'); const result = await setWahaContactBlocked(session, contactId, blocked); setBusy('')
        feedback(result.success, result.error, blocked ? 'Contact bloqué' : 'Contact débloqué')
    }
    const loadLids = async (nextOffset = lidOffset) => {
        setBusy('lids')
        const [list, count] = await Promise.all([getWahaLids(session, pageSize, nextOffset), getWahaLidsCount(session)])
        setBusy('')
        if (list.success) { setMappings(list.mappings); setLidOffset(nextOffset) }
        if (count.success) setLidCount(count.count ?? null)
        feedback(list.success, list.error, `${list.mappings.length} correspondance(s) LID chargée(s)`)
    }
    const resolve = async (direction: 'lid-to-phone' | 'phone-to-lid') => {
        setBusy(direction); const result = await resolveWahaLid(session, lidValue, direction); setBusy('')
        if (result.success) setLidResult(result.mapping || null)
        feedback(result.success, result.error, 'Correspondance trouvée')
    }
    const selectContact = (contact: WahaContact) => { setSelected(contact); setContactId(contact.id); setFirstName(contact.name || contact.pushname || ''); setLastName(''); setContactResult(contact) }

    return <div className="space-y-6">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3"><ContactRound className="h-7 w-7 text-emerald-600" /><h2 className="text-2xl font-black text-slate-900">Contacts WhatsApp</h2></div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <select value={session} onChange={event => reset(event.target.value)} className="min-w-56 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold">{(sessions.length ? sessions : [{ name: 'default', status: 'UNKNOWN' }]).map(item => <option key={item.name} value={item.name}>{item.name} — {item.status}</option>)}</select>
                <div className="flex rounded-xl bg-gray-100 p-1"><button onClick={() => setSection('contacts')} className={`rounded-lg px-4 py-2 text-xs font-black ${section === 'contacts' ? 'bg-white shadow-sm' : ''}`}>Contacts</button><button onClick={() => setSection('lids')} className={`rounded-lg px-4 py-2 text-xs font-black ${section === 'lids' ? 'bg-white shadow-sm' : ''}`}>LID ↔ Numéro</button></div>
            </div>
        </div>

        {section === 'contacts' ? <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b p-4"><button onClick={() => loadContacts(0)} disabled={busy === 'contacts'} className="contact-btn">{busy === 'contacts' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Charger</button><div className="flex"><button disabled={!offset} onClick={() => loadContacts(Math.max(0, offset - pageSize))} className="p-2 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><button disabled={contacts.length < pageSize} onClick={() => loadContacts(offset + pageSize)} className="p-2 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div></div>
                <div className="max-h-[660px] overflow-y-auto">{contacts.map(contact => <button key={contact.id} onClick={() => selectContact(contact)} className={`block w-full border-b p-4 text-left ${selected?.id === contact.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}><div className="flex justify-between gap-2"><strong className="truncate text-sm">{contact.name || contact.pushname || contact.number || contact.id}</strong>{contact.isBlocked && <Ban className="h-4 w-4 text-red-500" />}</div><p className="mt-1 text-xs text-gray-400">{contact.id}</p></button>)}{!contacts.length && <p className="p-8 text-center text-sm text-gray-400">Chargez les contacts.</p>}</div>
            </div>
            <div className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <label className="block space-y-2"><span className="contact-label">Numéro ou Contact ID</span><input value={contactId} onChange={event => setContactId(event.target.value)} placeholder="212600000000 ou 212600000000@c.us" className="contact-input" /></label>
                <div className="flex flex-wrap gap-2"><button onClick={() => searchContact('query')} className="contact-btn"><Search className="h-4 w-4" /> Info API générale</button><button onClick={() => searchContact('session')} className="contact-btn"><Search className="h-4 w-4" /> Info par session</button><button onClick={() => inspect('exists')} className="contact-btn"><CheckCircle2 className="h-4 w-4" /> Existe ?</button><button onClick={() => inspect('about')} className="contact-btn">À propos</button><button onClick={() => inspect('picture')} className="contact-btn"><ImageIcon className="h-4 w-4" /> Photo</button></div>
                <div className="grid gap-3 sm:grid-cols-2"><label><span className="contact-label">Prénom</span><input value={firstName} onChange={event => setFirstName(event.target.value)} className="contact-input mt-2" /></label><label><span className="contact-label">Nom</span><input value={lastName} onChange={event => setLastName(event.target.value)} className="contact-input mt-2" /></label></div>
                <div className="flex flex-wrap gap-2"><button onClick={saveContact} className="contact-btn bg-emerald-600 text-white"><Save className="h-4 w-4" /> Créer / mettre à jour</button><button onClick={() => blockContact(true)} className="contact-btn text-red-700"><Ban className="h-4 w-4" /> Bloquer</button><button onClick={() => blockContact(false)} className="contact-btn"><ShieldOff className="h-4 w-4" /> Débloquer</button></div>
                {contactResult !== null && <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-300">{JSON.stringify(contactResult, null, 2)}</pre>}
            </div>
        </div> : <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-black">Correspondances LID {lidCount !== null && `(${lidCount})`}</h3><button onClick={() => loadLids(0)} className="contact-btn"><RefreshCw className="h-4 w-4" /> Charger</button></div><div className="mt-4 max-h-96 overflow-auto">{mappings.map((item, index) => <div key={`${item.lid}-${index}`} className="border-b py-3 text-xs"><p className="font-mono text-slate-800">{item.lid || '—'}</p><p className="font-mono text-emerald-700">{item.pn || '—'}</p></div>)}</div><div className="mt-3 flex justify-between"><button disabled={!lidOffset} onClick={() => loadLids(Math.max(0, lidOffset - pageSize))} className="contact-btn disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><button disabled={mappings.length < pageSize} onClick={() => loadLids(lidOffset + pageSize)} className="contact-btn disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div></div>
            <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"><h3 className="font-black">Résoudre un identifiant</h3><input value={lidValue} onChange={event => setLidValue(event.target.value)} placeholder="123...@lid ou 2126...@c.us" className="contact-input" /><div className="flex flex-wrap gap-2"><button onClick={() => resolve('lid-to-phone')} className="contact-btn"><Link2 className="h-4 w-4" /> LID → numéro</button><button onClick={() => resolve('phone-to-lid')} className="contact-btn"><Link2 className="h-4 w-4" /> Numéro → LID</button></div>{lidResult && <pre className="rounded-2xl bg-slate-950 p-4 text-xs text-emerald-300">{JSON.stringify(lidResult, null, 2)}</pre>}<p className="text-xs font-semibold text-amber-700">NOWEB nécessite l’activation du Store pour charger les contacts et les correspondances LID.</p></div>
        </div>}
        <style jsx>{`.contact-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;border:1px solid #e5e7eb;border-radius:.7rem;padding:.65rem .85rem;font-size:.72rem;font-weight:800}.contact-label{font-size:.7rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#334155}.contact-input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.8rem 1rem;font-size:.875rem;outline:none}.contact-input:focus{border-color:#10b981}`}</style>
    </div>
}
