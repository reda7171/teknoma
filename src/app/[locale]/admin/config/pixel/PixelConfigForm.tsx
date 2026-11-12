'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateMultipleSettings } from '@/lib/actions/site-settings'
import { testMetaPixelCapi } from '@/lib/actions/facebook-ads'
import { CheckCircle2, AlertCircle, Save, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PixelConfigFormProps {
    initialPixelId: string
    initialCapiToken?: string
    hasLegacyToken?: boolean
}

export default function PixelConfigForm({
    initialPixelId,
    initialCapiToken = '',
    hasLegacyToken = false,
}: PixelConfigFormProps) {
    const t = useTranslations('AdminPixelConfig')
    const [pixelId, setPixelId] = useState(initialPixelId)
    const [capiToken, setCapiToken] = useState(initialCapiToken)
    const [loading, setLoading] = useState(false)
    const [testing, setTesting] = useState(false)
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setStatus(null)

        try {
            const trimmedCapi = capiToken.trim()
            const updates = [
                { key: 'facebook_pixel_id', value: pixelId.trim(), category: 'config', description: 'ID du Pixel Facebook' },
                ...(trimmedCapi
                    ? [{ key: 'facebook_capi_access_token', value: trimmedCapi, category: 'config', description: 'Token Meta Conversions API (CAPI)' }]
                    : []),
            ]
            const result = await updateMultipleSettings(updates)
            if (!result.success) {
                throw new Error(result.error || t('saveError'))
            }
            setStatus({ ok: true, text: t('saveSuccess') })
            router.refresh()
        } catch {
            setStatus({ ok: false, text: t('saveError') })
        } finally {
            setLoading(false)
        }
    }

    async function handleTestCapi() {
        setTesting(true)
        setStatus(null)
        try {
            const res = await testMetaPixelCapi(
                pixelId.trim() || undefined,
                capiToken.trim() || undefined
            )
            setStatus({
                ok: Boolean(res.success),
                text: res.success ? (res.message || t('saveSuccess')) : (res.error || t('testNetworkError')),
            })
        } catch {
            setStatus({ ok: false, text: t('testNetworkError') })
        } finally {
            setTesting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {status && (
                <div className={`p-4 rounded-xl text-sm font-medium flex items-start gap-2.5 ${status.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {status.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span>{status.text}</span>
                </div>
            )}

            <div>
                <label htmlFor="pixelId" className="block text-sm font-bold text-gray-900 mb-2">
                    {t('pixelIdLabel')}
                </label>
                <input
                    type="text"
                    id="pixelId"
                    value={pixelId}
                    onChange={(e) => setPixelId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                    placeholder={t('pixelIdPlaceholder')}
                />
                <p className="mt-2 text-xs text-gray-500 font-medium">
                    {t('pixelIdHelpPrefix')}{' '}
                    <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t('eventsManagerLink')}
                    </a>.
                </p>
            </div>

            <div>
                <label htmlFor="capiToken" className="block text-sm font-bold text-gray-900 mb-2">
                    {t('capiTokenLabel')}
                </label>
                <input
                    type="password"
                    id="capiToken"
                    value={capiToken}
                    onChange={(e) => setCapiToken(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                    placeholder="EAA..."
                    autoComplete="off"
                />
                <p className="mt-2 text-xs text-gray-500 font-medium">
                    {t('capiTokenHelp')}
                </p>
                {!capiToken.trim() && hasLegacyToken && (
                    <p className="mt-1 text-xs text-amber-600 font-medium">
                        {t('legacyFallbackNote')}
                    </p>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-3 bg-black text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    <Save className="w-4 h-4" />
                    {loading ? t('savingButton') : t('saveButton')}
                </button>
                <button
                    type="button"
                    disabled={testing}
                    onClick={handleTestCapi}
                    className="w-full sm:w-auto px-6 py-3 bg-white text-black border border-gray-300 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    <Activity className="w-4 h-4" />
                    {testing ? t('testingButton') : t('testButton')}
                </button>
            </div>
        </form>
    )
}
