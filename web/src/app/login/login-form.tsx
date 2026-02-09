'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authenticate, googleAuthenticate } from '@/app/lib/actions'
import { useLanguage } from '@/components/providers/language-provider'
import { User, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { t } = useLanguage()
    const [isRedirecting, setIsRedirecting] = useState(false)
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined,
    )

    const initialUsername = searchParams.get('username') || ''

    // Handle successful login
    useEffect(() => {
        if (errorMessage === 'success') {
            setIsRedirecting(true)
            // Fetch user's organization slug
            fetch('/api/user/organization')
                .then(res => res.json())
                .then(data => {
                    if (data.slug) {
                        let targetPath = `/${data.slug}`
                        // Redirect based on role
                        if (data.role === 'admin') {
                            targetPath += '/admin/dashboard'
                        } else if (data.role === 'mesero') {
                            targetPath += '/waiter'
                        } else if (data.role === 'cocinero') {
                            targetPath += '/cook'
                        } else if (data.role === 'cajero' || data.role === 'facturero') {
                            targetPath += '/cashier'
                        } else {
                            // Fallback
                            targetPath += '/admin/dashboard'
                        }

                        // Use window.location.href for a clean transition between roles/sessions
                        window.location.href = targetPath
                    } else {
                        // Fallback to regular dashboard if no slug
                        window.location.href = '/dashboard'
                    }
                })
                .catch(error => {
                    console.error('Error fetching organization:', error)
                    // Fallback to regular dashboard on error
                    window.location.href = '/dashboard'
                })
        }
    }, [errorMessage, router])

    if (isRedirecting) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <Loader2 className="animate-spin text-orange-600" size={48} />
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                    {t('loading.general')}
                </p>
            </div>
        )
    }

    return (
        <form action={formAction} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="username">
                    {t('login.username')}
                </label>
                <div className="relative flex items-center">
                    <User className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none" size={18} />
                    <input
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        id="username"
                        type="text"
                        name="username"
                        defaultValue={initialUsername}
                        placeholder={t('login.usernamePlaceholder')}
                        required
                        disabled={isPending}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
                    {t('login.password')}
                </label>
                <div className="relative flex items-center">
                    <Lock className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none" size={18} />
                    <input
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        id="password"
                        type="password"
                        name="password"
                        placeholder={t('login.passwordPlaceholder')}
                        required
                        disabled={isPending}
                    />
                </div>
            </div>

            {errorMessage && errorMessage !== 'success' && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="text-red-600 dark:text-red-500 shrink-0" size={18} />
                    <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
            >
                {isPending ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        {t('login.submitting')}
                    </>
                ) : (
                    <>
                        {t('login.submit')}
                        <ArrowRight size={20} />
                    </>
                )}
            </button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-300 dark:border-slate-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-800 px-2 text-slate-500">
                        {t('login.orContinueWith')}
                    </span>
                </div>
            </div>

            <button
                type="button"
                onClick={() => googleAuthenticate()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors"
            >
                <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
                Google
            </button>
        </form >
    )
}
