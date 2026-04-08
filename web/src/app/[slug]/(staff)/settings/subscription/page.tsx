'use client'

import { useEffect, useState } from 'react'
import { UsageIndicator } from '@/components/settings/usage-indicator'
import { UpgradeBanner } from '@/components/settings/upgrade-banner'
import { PlanUpgradeModal } from '@/components/settings/plan-upgrade-modal'
import { CancelSubscriptionModal } from '@/components/settings/cancel-subscription-modal'
import { Loader2, Building2, Calendar, Tag, ArrowUpCircle, CreditCard, AlertCircle, CheckCircle, XCircle, Check, X } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'

interface UsageLimits {
    tables: {
        current: number
        max: number
        percentage: number
        canAdd: boolean
        isUnlimited: boolean
    }
    users: {
        current: number
        max: number
        percentage: number
        canAdd: boolean
        isUnlimited: boolean
    }
}

interface Subscription {
    id: string
    status: string
    plan: string
    nextBillingDate: string | null
    cancelAtPeriodEnd: boolean
    pendingPlan: string | null
}

interface Organization {
    id: string
    name: string
    slug: string
    createdAt: string
    maxTables: number
    maxUsers: number
    subscriptionStatus: string
    trialEndsAt: string | null
    usage: UsageLimits
    subscription?: Subscription
    subscriptionPlan: string
}

export default function SubscriptionPage() {
    const { t } = useLanguage()
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [loading, setLoading] = useState(true)
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
    const [cancelLoading, setCancelLoading] = useState(false)
    const [showPageSuccess, setShowPageSuccess] = useState(false)
    const [pageSuccessMessage, setPageSuccessMessage] = useState('')

    useEffect(() => {
        fetchOrganization()
    }, [])

    const fetchOrganization = async () => {
        try {
            const response = await fetch('/api/organization')
            const data = await response.json()
            setOrganization(data)
        } catch (error) {
            console.error('Error fetching organization:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCancelSubscription = async () => {
        setCancelLoading(true)
        try {
            const response = await fetch('/api/subscriptions/cancel', {
                method: 'POST'
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || t('modal.cancel.error'))
            }

            await fetchOrganization()
            setIsCancelModalOpen(false)
            alert(t('modal.cancel.success'))
        } catch (error) {
            console.error('Error canceling subscription:', error)
            alert(error instanceof Error ? error.message : t('modal.cancel.error'))
        } finally {
            setCancelLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        )
    }

    if (!organization) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
                <p className="text-slate-600 dark:text-slate-400">
                    {t('settings.error.loading')}
                </p>
            </div>
        )
    }

    const getPlanName = () => {
        if (organization.maxTables >= 999) return t('pricing.enterprise.name')
        if (organization.maxTables >= 15) return t('pricing.professional.name')
        return t('pricing.starter.name')
    }

    const getStatusBadge = () => {
        const status = organization.subscriptionStatus

        const badges = {
            trial: { color: 'blue', icon: CheckCircle, label: t('settings.sub.status.trial') },
            active: { color: 'green', icon: CheckCircle, label: t('settings.sub.status.active') },
            past_due: { color: 'orange', icon: AlertCircle, label: t('settings.sub.status.past_due') },
            blocked: { color: 'red', icon: XCircle, label: t('settings.sub.status.blocked') },
            cancelled: { color: 'slate', icon: XCircle, label: t('settings.sub.status.cancelled') }
        }

        const badge = badges[status as keyof typeof badges]
        if (!badge) return null

        const Icon = badge.icon
        const colorClass = {
            blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
            green: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
            orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
            red: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
            slate: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
        }[badge.color]

        let label = badge.label
        if (status === 'trial') {
            const days = getTrialDaysRemaining()
            if (days !== null) {
                label = days > 0 
                    ? t('settings.sub.status.trial_days').replace('{days}', days.toString())
                    : t('settings.sub.status.trial_expired')
            }
        }

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
                <Icon size={14} />
                {label}
            </span>
        )
    }

    const getTrialDaysRemaining = () => {
        if (!organization?.trialEndsAt) return null
        const ends = new Date(organization.trialEndsAt)
        const now = new Date()
        const diff = ends.getTime() - now.getTime()
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
        return days > 0 ? days : 0
    }

    const showTablesWarning = organization.usage.tables.percentage >= 80 && !organization.usage.tables.isUnlimited
    const showUsersWarning = organization.usage.users.percentage >= 80 && !organization.usage.users.isUnlimited
    const tablesAtLimit = !organization.usage.tables.canAdd
    const usersAtLimit = !organization.usage.users.canAdd

    return (
        <div className="space-y-6">
            {/* Organization Info Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                    {t('settings.org.title')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <Building2 className="text-slate-400" size={20} />
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.org.name')}</p>
                            <p className="font-medium text-slate-900 dark:text-white">{organization.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Tag className="text-slate-400" size={20} />
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.org.slug')}</p>
                            <p className="font-medium text-slate-900 dark:text-white">{organization.slug}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Calendar className="text-slate-400" size={20} />
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.org.created')}</p>
                            <p className="font-medium text-slate-900 dark:text-white">
                                {new Date(organization.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subscription Status Card - Show if subscription exists OR if it's a trial */}
            {(organization.subscription || organization.subscriptionStatus === 'trial') && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {t('settings.sub.statusTitle')}
                        </h2>
                        {getStatusBadge()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {organization.subscription?.nextBillingDate && (
                            <div className="flex items-center gap-3">
                                <CreditCard className="text-slate-400" size={20} />
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.sub.nextBilling')}</p>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                        {new Date(organization.subscription.nextBillingDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {organization.subscription?.pendingPlan && (
                            <div className="col-span-full">
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        <strong>{t('settings.sub.pendingChange')}</strong> {t('settings.sub.pendingChangeDesc').replace('{plan}', organization.subscription.pendingPlan)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {organization.subscription?.cancelAtPeriodEnd && (
                            <div className="col-span-full">
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                                    <p className="text-sm text-orange-800 dark:text-orange-200">
                                        <strong>{t('settings.sub.cancelledState')}</strong> {t('settings.sub.cancelledStateDesc').replace('{date}', organization.subscription.nextBillingDate ? new Date(organization.subscription.nextBillingDate).toLocaleDateString() : '')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {organization.subscription?.status === 'authorized' && !organization.subscription.cancelAtPeriodEnd && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setIsCancelModalOpen(true)}
                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                            >
                                {t('settings.sub.cancelBtn')}
                            </button>
                        </div>
                    )}

                    {organization.subscriptionStatus === 'trial' && (
                         <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                             <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                                 new Date(organization.trialEndsAt!) > new Date() 
                                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"
                                    : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
                             }`}>
                                 <AlertCircle className={`${
                                     new Date(organization.trialEndsAt!) > new Date()
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-red-600 dark:text-red-400"
                                 } shrink-0 mt-0.5`} size={18} />
                                 <div className={`text-sm ${
                                     new Date(organization.trialEndsAt!) > new Date()
                                        ? "text-blue-800 dark:text-blue-200"
                                        : "text-red-800 dark:text-red-200"
                                 }`}>
                                     <p className="font-medium">
                                         {new Date(organization.trialEndsAt!) > new Date() 
                                            ? "Periodo de Prueba Activo" 
                                            : "Periodo de Prueba Expirado"}
                                     </p>
                                     <p className="mt-1 opacity-90">
                                         {new Date(organization.trialEndsAt!) > new Date()
                                            ? "Tienes acceso completo a todas las funciones. Al terminar la prueba, deberás elegir un plan para continuar."
                                            : "Tu periodo de prueba ha terminado. Por favor, selecciona un plan para reactivar tu cuenta y continuar usando el sistema."}
                                     </p>
                                 </div>
                             </div>
                         </div>
                    )}
                </div>
            )}

            {/* Plan Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <div className="max-w-md">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {t('settings.plan.title')}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {t('settings.plan.subtitle')}
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t('modal.upgrade.current')}</span>
                            <p className="text-2xl font-black text-orange-600 dark:text-orange-500">
                                {getPlanName()}
                            </p>
                        </div>
                        
                        <button
                            onClick={() => setIsUpgradeModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                        >
                            <ArrowUpCircle size={18} strokeWidth={2.5} />
                            {t('settings.plan.changeBtn')}
                        </button>
                    </div>
                </div>

                {/* Usage Indicators */}
                <div className="space-y-6">
                    <UsageIndicator
                        current={organization.usage.tables.current}
                        max={organization.maxTables}
                        label={t('settings.tables.title').replace('Gestión de ', '')}
                        type="tables"
                        isUnlimited={organization.usage.tables.isUnlimited}
                    />

                    <UsageIndicator
                        current={organization.usage.users.current}
                        max={organization.maxUsers}
                        label={t('settings.users.title').replace('Gestión de ', '')}
                        type="users"
                        isUnlimited={organization.usage.users.isUnlimited}
                    />
                </div>
            </div>

            {showPageSuccess && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-between animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3 text-green-800 dark:text-green-200">
                        <Check size={20} />
                        <span className="font-medium">{pageSuccessMessage}</span>
                    </div>
                    <button onClick={() => setShowPageSuccess(false)} className="text-green-600 dark:text-green-400">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Warnings */}
            {(showTablesWarning || tablesAtLimit) && (
                <UpgradeBanner
                    type={tablesAtLimit ? 'limit-reached' : 'warning'}
                    resourceType="mesas"
                    currentPlan={getPlanName()}
                />
            )}

            {(showUsersWarning || usersAtLimit) && (
                <UpgradeBanner
                    type={usersAtLimit ? 'limit-reached' : 'warning'}
                    resourceType="usuarios"
                    currentPlan={getPlanName()}
                />
            )}

            {/* Plan Upgrade Modal */}
            <PlanUpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                currentPlan={organization.subscriptionPlan || 'basic'}
                isTrial={organization.subscriptionStatus === 'trial'}
                onSuccess={() => {
                    fetchOrganization()
                    setPageSuccessMessage(t('modal.upgrade.success'))
                    setShowPageSuccess(true)
                    setTimeout(() => setShowPageSuccess(false), 8000)
                }}
            />

            {/* Cancel Subscription Modal */}
            <CancelSubscriptionModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={handleCancelSubscription}
                loading={cancelLoading}
                nextBillingDate={organization.subscription?.nextBillingDate ? new Date(organization.subscription.nextBillingDate) : null}
            />
        </div>
    )
}


