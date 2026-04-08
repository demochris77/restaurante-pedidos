'use client'

import { useState } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'

interface PlanUpgradeModalProps {
    isOpen: boolean
    onClose: () => void
    currentPlan: string
    onSuccess: () => void
    isTrial?: boolean
}

interface DowngradeErrorDetails {
    tablesToRemove: number
    usersToRemove: number
    currentTables: number
    currentUsers: number
    newMaxTables: number
    newMaxUsers: number
}

const PLANS = {
    basic: {
        name: 'Starter',
        price: 60000,
        tables: 5,
        users: 3,
        features: [
            { key: 'plan.feature.tables', params: { count: '5' } },
            { key: 'plan.feature.users', params: { count: '3' } },
            { key: 'plan.feature.basicSupport' }
        ]
    },
    professional: {
        name: 'Professional',
        price: 100000,
        tables: 15,
        users: 10,
        features: [
            { key: 'plan.feature.tables', params: { count: '15' } },
            { key: 'plan.feature.users', params: { count: '10' } },
            { key: 'plan.feature.prioritySupport' },
            { key: 'plan.feature.advancedReports' }
        ]
    },
    enterprise: {
        name: 'Enterprise',
        price: 400000,
        tables: 999,
        users: 999,
        features: [
            { key: 'plan.feature.unlimitedTables' },
            { key: 'plan.feature.unlimitedUsers' },
            { key: 'plan.feature.support247' },
            { key: 'plan.feature.fullCustomization' }
        ]
    }
}

export function PlanUpgradeModal({ isOpen, onClose, currentPlan, onSuccess, isTrial }: PlanUpgradeModalProps) {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [downgradeError, setDowngradeError] = useState<DowngradeErrorDetails | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)
    const [successType, setSuccessType] = useState<'immediate' | 'scheduled'>('immediate')

    if (!isOpen) {
        if (showSuccess) setShowSuccess(false)
        return null
    }

    const handleUpgrade = async (newPlan: string) => {
        setLoading(true)
        setError(null)
        setDowngradeError(null)

        try {
            const response = await fetch('/api/organization/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: newPlan })
            })

            const data = await response.json()

            if (!response.ok) {
                if (data.details) {
                    setDowngradeError(data.details as DowngradeErrorDetails)
                    setError(data.reason || 'Error')
                } else {
                    throw new Error(data.error || 'Error')
                }
                return
            }

            if (data.isUpgrade && data.initPoint) {
                window.location.href = data.initPoint
            } else {
                setSuccessType(data.isImmediate ? 'immediate' : 'scheduled')
                setShowSuccess(true)
                onSuccess()
            }
        } catch (error) {
            console.error('Error changing plan:', error)
            setError(error instanceof Error ? error.message : 'Error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {t('modal.upgrade.title')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {showSuccess ? (
                        <div className="py-12 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-6 scale-110">
                                <Check size={40} strokeWidth={3} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                {t('modal.upgrade.success')}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 max-w-sm mb-8">
                                {successType === 'immediate' 
                                    ? t('modal.upgrade.immediateDesc')
                                    : t('settings.sub.pendingChangeDesc')
                                }
                            </p>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition-all active:scale-[0.98]"
                            >
                                {t('common.done') || 'Entendido'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                                {error}
                                            </p>
                                            {downgradeError && (
                                                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                                    <p className="font-medium">{t('modal.upgrade.downgradeError')}</p>
                                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                                        {downgradeError.tablesToRemove > 0 && (
                                                            <li>{t('modal.upgrade.removeTables').replace('{count}', String(downgradeError.tablesToRemove))}</li>
                                                        )}
                                                        {downgradeError.usersToRemove > 0 && (
                                                            <li>{t('modal.upgrade.removeUsers').replace('{count}', String(downgradeError.usersToRemove))}</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {Object.entries(PLANS).map(([key, plan]) => {
                                    const isCurrent = key === currentPlan
                                    const currentPlanPrice = (PLANS as any)[currentPlan]?.price || 0
                                    const isUpgrade = plan.price > currentPlanPrice

                                    return (
                                        <div
                                            key={key}
                                            className={`relative border-2 rounded-lg p-6 flex flex-col ${isCurrent
                                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                                                : 'border-slate-200 dark:border-slate-700'
                                                }`}
                                        >
                                            {isCurrent && (
                                                <div className="absolute top-4 right-4">
                                                    <span className="px-2 py-1 text-xs font-medium bg-orange-500 text-white rounded">
                                                        {t('modal.upgrade.current')}
                                                    </span>
                                                </div>
                                            )}

                                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                                {plan.name}
                                            </h3>
                                            <div className="mb-4">
                                                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                                                    ${plan.price.toLocaleString()}
                                                </span>
                                                <span className="text-slate-600 dark:text-slate-400">/mes</span>
                                            </div>

                                            <ul className="space-y-2 mb-6 grow">
                                                {plan.features.map((feature, idx) => {
                                                    const params = (feature as any).params
                                                    const translatedFeature = params
                                                        ? t(feature.key).replace('{count}', params.count)
                                                        : t(feature.key)
                                                    return (
                                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                            <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                                                            {translatedFeature}
                                                        </li>
                                                    )
                                                })}
                                            </ul>

                                            {(!isCurrent || isTrial) && (
                                                <button
                                                    onClick={() => handleUpgrade(key)}
                                                    disabled={loading}
                                                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${isUpgrade || (isCurrent && isTrial)
                                                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                                        : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white'
                                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    {loading 
                                                        ? t('modal.processing') 
                                                        : (isCurrent && isTrial) 
                                                            ? t('settings.plan.activate') 
                                                            : isUpgrade 
                                                                ? t('settings.plan.upgrade') 
                                                                : t('settings.plan.changeBtn')}
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
