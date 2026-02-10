'use client'

import { useLanguage } from '@/components/providers/language-provider'

interface UsageIndicatorProps {
    current: number
    max: number
    label: string
    type: 'tables' | 'users'
    isUnlimited?: boolean
}

export function UsageIndicator({ current, max, label, type, isUnlimited = false }: UsageIndicatorProps) {
    const { t } = useLanguage()
    const percentage = isUnlimited ? 0 : (current / max) * 100
    const isNearLimit = percentage >= 80 && !isUnlimited
    const isAtLimit = current >= max && !isUnlimited

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </span>
                <span className={`text-sm font-semibold ${isAtLimit
                    ? 'text-red-600 dark:text-red-400'
                    : isNearLimit
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                    {current ?? 0}/{isUnlimited ? '∞' : max}
                </span>
            </div>

            {!isUnlimited && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-2 rounded-full transition-all duration-300 ${isAtLimit
                            ? 'bg-red-600'
                            : isNearLimit
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                        style={{ width: `${Math.min(percentage || 0, 100)}%` }}
                    />
                </div>
            )}

            {isAtLimit && (
                <p className="text-xs text-red-600 dark:text-red-400">
                    {t('usage.limit_reached')}
                </p>
            )}

            {isNearLimit && !isAtLimit && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    {t('usage.near_limit')}
                </p>
            )}

            {isUnlimited && (
                <p className="text-xs text-green-600 dark:text-green-400">
                    {t('usage.unlimited')}
                </p>
            )}
        </div>
    )
}
