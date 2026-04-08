'use client'

import React, { Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/components/providers/language-provider'
import { CheckCircle, FileText, Home, Utensils } from 'lucide-react'

function SuccessContent() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { t } = useLanguage()
    
    const slug = params.slug as string
    const tableNumber = params.number as string
    const orderId = searchParams.get('orderId')

    return (
        <div className="min-h-screen bg-linear-to-b from-green-50 to-white flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full rounded-4xl bg-white shadow-xl p-8 border border-green-100 animate-in fade-in zoom-in duration-700">
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-25"></div>
                        <div className="bg-green-500 rounded-full p-4 relative z-10 shadow-lg shadow-green-200">
                            <CheckCircle className="h-12 w-12 text-white" />
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {t('success.title')}
                </h1>
                
                <p className="text-gray-600 mb-8 leading-relaxed">
                    {t('success.subtitle')}
                </p>

                <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-sm text-gray-500 border border-gray-100">
                    <p className="mb-1 font-medium">{t('success.message')}</p>
                    {orderId && (
                        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
                            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                {t('success.order_id')}
                            </span>
                            <span className="font-mono text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                {orderId.split('-')[0]}
                            </span>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {orderId && (
                        <button
                            onClick={() => router.push(`/${slug}/receipt/${orderId}`)}
                            className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white font-semibold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-gray-200 group"
                        >
                            <FileText className="h-5 w-5 text-green-400 group-hover:scale-110 transition-transform" />
                            {t('success.view_receipt')}
                        </button>
                    )}

                    <button
                        onClick={() => router.push(`/${slug}/mesa/${tableNumber}`)}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 rounded-2xl transition-all border-2 border-gray-100 active:scale-[0.98] group"
                    >
                        <Utensils className="h-5 w-5 text-green-600 group-hover:rotate-12 transition-transform" />
                        {t('success.back_to_menu')}
                    </button>
                </div>
            </div>
            
            <div className="mt-8 flex items-center gap-2 text-gray-300">
                <div className="h-px w-8 bg-current"></div>
                <p className="text-xs font-bold tracking-[0.2em] uppercase">
                    Hamelin Foods
                </p>
                <div className="h-px w-8 bg-current"></div>
            </div>
        </div>
    )
}

export default function SuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <SuccessContent />
        </Suspense>
    )
}
