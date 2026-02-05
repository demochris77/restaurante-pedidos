'use client'

import { Suspense } from 'react'
import { PublicNavbar } from '@/components/public/navbar'
import { PublicFooter } from '@/components/public/footer'
import { Container } from '@/components/ui/container'
import { useLanguage } from '@/components/providers/language-provider'
import { Clock } from 'lucide-react'
import Link from 'next/link'

function PendingContent() {
    const { t } = useLanguage()

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <PublicNavbar />

            <section className="py-20 flex items-center justify-center min-h-[calc(100vh-200px)]">
                <Container>
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-6">
                            <Clock className="w-12 h-12 text-yellow-600 dark:text-yellow-500" />
                        </div>

                        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
                            {t('payment.pending.title')}
                        </h1>

                        <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                            {t('payment.pending.subtitle')}
                        </p>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 mb-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                {t('payment.pending.whatNext')}
                            </h2>
                            <div className="text-left space-y-3 text-slate-600 dark:text-slate-300">
                                <p>• {t('payment.pending.info1')}</p>
                                <p>• {t('payment.pending.info2')}</p>
                                <p>• {t('payment.pending.info3')}</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-bold rounded-lg transition-colors shadow-lg"
                            >
                                {t('payment.pending.button')}
                            </Link>
                        </div>
                    </div>
                </Container>
            </section>

            <PublicFooter />
        </div>
    )
}

export default function RegisterPendingPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <PendingContent />
        </Suspense>
    )
}
