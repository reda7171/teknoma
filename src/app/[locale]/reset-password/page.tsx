'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetPassword } from '@/lib/actions/auth'
import { Lock, Mail, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || ''
    const router = useRouter()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!email) {
            setError("L'email est requis. Veuillez utiliser le lien fourni.")
            return
        }

        if (password.length < 12) {
            setError('Le mot de passe doit contenir au moins 12 caractères.')
            return
        }

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.')
            return
        }

        setLoading(true)
        const res = await resetPassword(email, password, searchParams.get('token') || undefined)
        setLoading(false)

        if (res.success) {
            setSuccess(true)
        } else {
            setError(res.error || 'Une erreur est survenue.')
        }
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                    <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">Mot de passe défini avec succès !</h2>
                <p className="text-gray-500">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                <Link
                    href="/fr/admin/login"
                    className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-black hover:bg-gray-800 transition-colors"
                >
                    Aller à la connexion <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md mx-auto">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-gray-900 mb-2">Définir votre mot de passe</h1>
                <p className="text-gray-500 text-sm">Créez un nouveau mot de passe pour votre compte vendeur.</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="email"
                        value={email}
                        readOnly
                        disabled
                        className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-gray-200 rounded-xl text-sm font-bold text-gray-500 cursor-not-allowed border"
                    />
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nouveau mot de passe"
                        required
                        className="block w-full pl-11 pr-12 py-4 bg-white border-gray-200 focus:border-black focus:ring-black rounded-xl text-sm font-bold transition-colors border outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                        <span className="sr-only">
                            {showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        </span>
                    </button>
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirmer le mot de passe"
                        required
                        className="block w-full pl-11 pr-12 py-4 bg-white border-gray-200 focus:border-black focus:ring-black rounded-xl text-sm font-bold transition-colors border outline-none"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-black text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
            </button>
        </form>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-12 px-8 shadow-xl shadow-black/5 rounded-[2rem] border border-gray-100">
                    <Suspense fallback={<div className="text-center font-bold text-gray-500">Chargement...</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </div>
            </div>
        </div>
    )
}
