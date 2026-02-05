'use client'

import { Suspense, useEffect, useState } from 'react'
import { PublicNavbar } from '@/components/public/navbar'
import { PublicFooter } from '@/components/public/footer'
import { Container } from '@/components/ui/container'
import { useLanguage } from '@/components/providers/language-provider'
import { CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function SuccessContent() {
    const { t } = useLanguage()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Simulate verification delay
        const timer = setTimeout(() => {
            setLoading(false)
        }, 2000)

        return () => clearTimeout(timer)
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-orange-600 dark:text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-300">Procesando tu pago...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <PublicNavbar />

            <section className="py-20 flex items-center justify-center min-h-[calc(100vh-200px)]">
                <Container>
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
                            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-500" />
                        </div>

                        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
                            {t('payment.success.title')}
                        </h1>

                        <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                            {t('payment.success.subtitle')}
                        </p>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 mb-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                {t('payment.success.steps')}
                            </h2>
                            <div className="text-left space-y-3 text-slate-600 dark:text-slate-300">
                                <p>✅ {t('payment.success.step1')}</p>
                                <p>✅ {t('payment.success.step2')}</p>
                                <p>✅ {t('payment.success.step3')}</p>
                                <p className="mt-6 font-semibold text-slate-900 dark:text-white">
                                    {t('payment.success.message')}
                                </p>
                            </div>
                        </div>

                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-bold rounded-lg transition-colors shadow-lg"
                        >
                            {t('payment.success.button')}
                        </Link>
                    </div>
                </Container>
            </section>

            <PublicFooter />
        </div>
    )
}

export default function RegisterSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-orange-600 dark:text-orange-500 animate-spin" />
            </div>
        }>
            <SuccessContent />
        </Suspense>
    )
}
