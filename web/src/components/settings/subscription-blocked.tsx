'use client'

import React from 'react'
import Link from 'next/link'
import { AlertCircle, CreditCard, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'
import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

interface SubscriptionBlockedProps {
    slug: string
    isAdmin: boolean
}

export function SubscriptionBlocked({ slug, isAdmin }: SubscriptionBlockedProps) {
    const { t } = useLanguage()

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-6">
                        <AlertCircle size={32} />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {t('settings.sub.blocked.title')}
                    </h2>
                    
                    <p className="text-slate-600 dark:text-slate-400 mb-8">
                        {t('settings.sub.blocked.description')}
                    </p>

                    <div className="space-y-3">
                        {isAdmin && (
                            <Link
                                href={`/${slug}/settings/subscription`}
                                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98]"
                            >
                                <CreditCard size={18} />
                                {t('settings.sub.blocked.button')}
                                <ArrowRight size={18} />
                            </Link>
                        )}

                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all active:scale-[0.98]"
                        >
                            <LogOut size={18} />
                            {t('nav.logout')}
                        </button>
                        
                        <div className="pt-2">
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                {t('footer.tagline')}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-4 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                        Si crees que esto es un error, contacta con soporte.
                    </p>
                </div>
            </div>
        </div>
    )
}
