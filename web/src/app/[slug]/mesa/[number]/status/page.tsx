'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    ClipboardList,
    ChefHat,
    Utensils,
    CheckCircle2,
    ChevronUp,
    ChevronDown,
    Plus,
    Receipt,
    Loader2,
    ChevronLeft,
    Clock,
    Trash2,
    AlertTriangle
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/components/providers/language-provider'
import { FloatingToggles } from '@/components/common/FloatingToggles'
import Ably from 'ably'
import { getSecurityStatus } from '../actions'

interface OrderItem {
    id: string
    quantity: number
    status: string // pendiente, en_preparacion, listo, servido
    notes: string | null
    menuItem: {
        name: string
        estimatedTime: number
        isDirect: boolean
    }
    startedAt: string | null
    createdAt: string
}

interface Order {
    id: string
    status: string
    items: OrderItem[]
}

export default function CustomerStatusPage() {
    const { t } = useLanguage()
    const params = useParams()
    const router = useRouter()
    const { data: session } = useSession()
    const isStaff = !!session?.user

    const slug = params.slug as string
    const tableNumber = params.number as string

    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
    const [now, setNow] = useState(Date.now())
    const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
    const [isCancelling, setIsCancelling] = useState(false)

    const toggleGroup = (name: string) => {
        setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }))
    }

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(`/api/public/orders/active?slug=${slug}&table=${tableNumber}`)
            if (res.ok) {
                const data = await res.json()
                if (data.active) {
                    setOrder(data.order)
                    return data.organizationId
                } else {
                    setOrder(null)
                }
            }
        } catch (error) {
            console.error('Error fetching status:', error)
        } finally {
            setLoading(false)
        }
        return null
    }, [slug, tableNumber])

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const secStatus = await getSecurityStatus(slug, tableNumber)
                if (secStatus.required) {
                    router.replace(`/${slug}/mesa/${tableNumber}`)
                    return
                }
                await fetchStatus()
            } catch (error) {
                console.error('Access check failed:', error)
                await fetchStatus()
            }
        }
        checkAccess()

        let ably: Ably.Realtime | null = null
        let channel: any | null = null

        const setupAbly = async () => {
            const orgId = await fetchStatus()
            if (!orgId) return

            try {
                ably = new Ably.Realtime({ authUrl: '/api/ably/auth' })
                channel = ably.channels.get(`orders:${orgId}`)
                
                channel.subscribe('order-update', (message: any) => {
                    const data = message.data
                    const currentTable = parseInt(tableNumber)
                    const matchesTable = data.tableNumber === currentTable || 
                                       (Array.isArray(data.tableNumbers) && data.tableNumbers.includes(currentTable))

                    if (matchesTable) {
                        if (data.type === 'status-update' && data.status === 'pagado') {
                            if (!isStaff) {
                                router.push(`/${slug}/mesa/${tableNumber}/success?orderId=${data.orderId}`)
                            }
                        } else {
                            fetchStatus()
                        }
                    }
                })
            } catch (e) {
                console.error('Ably setup failed:', e)
            }
        }
        setupAbly()

        const timer = setInterval(() => setNow(Date.now()), 1000)

        return () => {
            clearInterval(timer)
            if (channel) channel.unsubscribe()
            if (ably) ably.close()
        }
    }, [slug, tableNumber, router, fetchStatus, isStaff])

    const handleCancelClick = (itemId: string) => {
        setCancelTargetId(itemId)
    }

    const confirmCancel = async () => {
        if (!cancelTargetId) return

        setIsCancelling(true)
        try {
            const res = await fetch(`/api/public/orders/items/${cancelTargetId}?slug=${slug}&table=${tableNumber}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                // Optimistically update
                setOrder(prev => {
                    if (!prev) return null
                    const newItems = prev.items.filter(i => i.id !== cancelTargetId)
                    if (newItems.length === 0) return null
                    return { ...prev, items: newItems }
                })
                setCancelTargetId(null)
            } else {
                const err = await res.json()
                alert(err.error || 'Error al cancelar')
            }
        } catch (error) {
            console.error('Error cancelling item:', error)
            alert('Error de conexión')
        } finally {
            setIsCancelling(false)
        }
    }

    // Steps for the progress bar
    const steps = [
        { key: 'received', label: t('order_status.received'), icon: ClipboardList },
        { key: 'preparing', label: t('order_status.preparing'), icon: ChefHat },
        { key: 'ready', label: t('order_status.ready'), icon: Utensils },
        { key: 'served', label: t('order_status.served'), icon: CheckCircle2 },
    ]

    const getCurrentStep = () => {
        if (!order) return 0
        const items = order.items
        if (items.length === 0) return 0

        const hasCooking = items.some(i => ['en_preparacion'].includes(i.status))
        const hasReady = items.some(i => i.status === 'listo')
        const allServed = items.every(i => i.status === 'servido')

        if (allServed) return 3
        if (hasReady) return 2
        if (hasCooking) return 1
        return 0
    }

    const currentStep = getCurrentStep()

    const getItemProgress = (item: OrderItem) => {
        if (item.status === 'servido' || item.status === 'listo') return 100
        if (item.status === 'pendiente' || !item.startedAt) return 5

        const startTime = new Date(item.startedAt).getTime()
        const elapsed = (now - startTime) / 1000 / 60 // in minutes
        const estimated = item.menuItem.estimatedTime || 15

        const percent = (elapsed / estimated) * 100

        // If it's en_preparacion but exceeded time, cap at 99 and indicate delay
        if (percent >= 100) return 99
        return Math.min(Math.max(percent, 5), 99)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 gap-4">
                <Loader2 className="animate-spin text-orange-600" size={48} />
                <p className="text-slate-500 font-medium animate-pulse">{t('common.loading.status')}</p>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 text-center space-y-6">
                <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-orange-600">
                    <Utensils size={48} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('order_status.empty_title')}</h2>
                    <p className="text-slate-500">{t('order_status.empty_desc')}</p>
                </div>
                <button
                    onClick={() => router.push(`/${slug}/mesa/${tableNumber}/menu`)}
                    className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg"
                >
                    {t('order_status.go_to_menu')}
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
            {/* Header */}
            <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 flex items-center justify-between skiptranslate">
                <button
                    onClick={() => isStaff ? router.push(`/${slug}/waiter`) : router.push(`/${slug}/mesa/${tableNumber}/menu`)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                    <ChevronLeft size={24} className="text-slate-600 dark:text-slate-400" />
                </button>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t('customer.order_status_title')}</h1>
                <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold">
                    {t('common.table')} {tableNumber}
                </div>
            </header>

            <main className="p-4 space-y-6 max-w-lg mx-auto">
                {/* Progress Steps Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-4xl shadow-sm border border-slate-200 dark:border-slate-800 skiptranslate">
                    <div className="flex justify-between relative mb-8">
                        {/* Connecting Line */}
                        <div className="absolute top-5 left-[15%] right-[15%] h-[2px] bg-slate-100 dark:bg-slate-800 z-0" />

                        {steps.map((step, idx) => {
                            const isActive = idx === currentStep
                            const isCompleted = idx < currentStep
                            return (
                                <div key={step.key} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-orange-600 text-white scale-110 shadow-lg shadow-orange-600/30' :
                                        isCompleted ? 'bg-orange-200 dark:bg-orange-900/30 text-orange-600' :
                                            'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                        }`}>
                                        <step.icon size={20} />
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-tight text-center leading-none max-w-[64px] ${isActive ? 'text-orange-600' : 'text-slate-400'
                                        }`}>
                                        {step.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl text-center skiptranslate">
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                            {currentStep === 0 && t('customer.preparing')}
                            {currentStep === 1 && t('customer.preparing')}
                            {currentStep === 2 && t('customer.ready')}
                            {currentStep === 3 && t('customer.served')}
                        </p>
                    </div>
                </div>
                {/* Items List */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2 skiptranslate">{t('order_status.your_order')}</h3>
                    <div className="space-y-3">
                        {(() => {
                            const stackedItems = Object.values(
                                order.items.reduce((acc: Record<string, { name: string, items: OrderItem[], totalQuantity: number }>, item) => {
                                    const key = item.menuItem.name
                                    if (!acc[key]) acc[key] = { name: key, items: [], totalQuantity: 0 }
                                    acc[key].items.push(item)
                                    acc[key].totalQuantity += item.quantity
                                    return acc
                                }, {})
                            )

                            return stackedItems.map((group) => {
                                const isStackable = group.items.length > 1
                                const isExpanded = isStackable && !!expandedGroups[group.name]
                                const firstItem = group.items[0]

                                if (!isStackable) {
                                    // Normal view for a single item (or single order entry with quantity > 1)
                                    const item = firstItem
                                    const progress = getItemProgress(item)
                                    const isDelayed = item.status === 'en_preparacion' && progress >= 99

                                    return (
                                        <div key={item.id} className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm skiptranslate">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex gap-3 items-center">
                                                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center font-black">
                                                        {item.quantity}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.menuItem.name}</h4>
                                                        {item.notes && <p className="text-[10px] text-slate-400 italic">&quot;{item.notes}&quot;</p>}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-2">
                                                        {(() => {
                                                            const isDirect = item.menuItem.isDirect
                                                            const createdAt = new Date(item.createdAt).getTime()
                                                            const age = now - createdAt
                                                            const canCancel = item.status === 'pendiente' ||
                                                                (item.status === 'listo' && isDirect) ||
                                                                (item.status === 'en_preparacion' && age < 30000)

                                                            if (canCancel) {
                                                                return (
                                                                    <button
                                                                        onClick={() => handleCancelClick(item.id)}
                                                                        className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                                        title={t('common.cancel')}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )
                                                            }
                                                            return null
                                                        })()}

                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${item.status === 'servido' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            item.status === 'listo' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                item.status === 'en_preparacion' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                    'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                                            }`}>
                                                            {t(`status.${item.status}`)}
                                                        </span>
                                                    </div>

                                                    {item.status === 'en_preparacion' && item.startedAt && (
                                                        <span className="text-[9px] text-slate-400 flex items-center gap-1 font-medium">
                                                            <Clock size={10} />
                                                            {(() => {
                                                                const elapsed = Math.floor((now - new Date(item.startedAt).getTime()) / 1000 / 60)
                                                                const est = item.menuItem.estimatedTime || 15
                                                                return elapsed > est
                                                                    ? `${elapsed} min (${t('admin.stats.delayed') || 'Delayed'})`
                                                                    : `${elapsed}/${est} min`
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                                                <div
                                                    className={`h-full transition-all duration-1000 ease-linear ${item.status === 'servido' ? 'bg-green-500' :
                                                        item.status === 'listo' ? 'bg-blue-500' :
                                                            isDelayed ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                                                        }`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                }

                                return (
                                    <div key={group.name} className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all duration-300">
                                        {/* Group Header (Stacked View) */}
                                        <div
                                            onClick={() => toggleGroup(group.name)}
                                            className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex gap-3 items-center">
                                                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center font-black">
                                                        {group.totalQuantity}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{group.name}</h4>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                                </div>
                                            </div>
                                            {/* Unified Average Progress Bar */}
                                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                                                {(() => {
                                                    const totalQuantity = group.totalQuantity
                                                    const totalProgress = group.items.reduce((sum, item) => {
                                                        return sum + (getItemProgress(item) * item.quantity)
                                                    }, 0)
                                                    const averageProgress = totalProgress / totalQuantity

                                                    // Determine representative status for color
                                                    const isAnyPreparing = group.items.some(i => i.status === 'en_preparacion')
                                                    const isAnyReady = group.items.some(i => i.status === 'listo')
                                                    const allServed = group.items.every(i => i.status === 'servido')
                                                    const isDelayed = isAnyPreparing && averageProgress >= 95 // Roughly estimate delay for group

                                                    let colorClass = "bg-orange-500"
                                                    if (allServed) colorClass = "bg-green-500"
                                                    else if (isAnyReady && !isAnyPreparing) colorClass = "bg-blue-500"
                                                    else if (isAnyPreparing) colorClass = isDelayed ? "bg-red-500 animate-pulse" : "bg-orange-500"

                                                    return (
                                                        <div
                                                            className={`h-full transition-all duration-1000 ease-linear ${colorClass}`}
                                                            style={{ width: `${averageProgress}%` }}
                                                        />
                                                    )
                                                })()}
                                            </div>

                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 animate-in slide-in-from-top-2 duration-300">
                                                {group.items.map((item) => (
                                                    <div key={item.id} className="p-4 space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold px-2 py-0.5 rounded-full text-slate-500">
                                                                        {item.quantity}x
                                                                    </span>
                                                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                                        {t(`status.${item.status}`)}
                                                                    </span>
                                                                </div>
                                                                {item.notes && <p className="text-[10px] text-slate-400 italic">&quot;{item.notes}&quot;</p>}
                                                            </div>

                                                            <div className="flex flex-col items-end gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    {(() => {
                                                                        const isDirect = item.menuItem.isDirect
                                                                        const createdAt = new Date(item.createdAt).getTime()
                                                                        const age = now - createdAt
                                                                        const canCancel = item.status === 'pendiente' ||
                                                                            (item.status === 'listo' && isDirect) ||
                                                                            (item.status === 'en_preparacion' && age < 30000)

                                                                        if (canCancel) {
                                                                            return (
                                                                                <button
                                                                                    onClick={() => handleCancelClick(item.id)}
                                                                                    className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                                                    title={t('common.cancel')}
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            )
                                                                        }
                                                                        return null
                                                                    })()}
                                                                </div>
                                                                {item.status === 'en_preparacion' && item.startedAt && (
                                                                    <span className="text-[9px] text-slate-400 flex items-center gap-1 font-medium">
                                                                        <Clock size={10} />
                                                                        {(() => {
                                                                            const elapsed = Math.floor((now - new Date(item.startedAt).getTime()) / 1000 / 60)
                                                                            const est = item.menuItem.estimatedTime || 15
                                                                            return elapsed > est
                                                                                ? `${elapsed} min (${t('admin.stats.delayed') || 'Delayed'})`
                                                                                : `${elapsed}/${est} min`
                                                                        })()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Individual Progress Bar */}
                                                        {(() => {
                                                            const progress = getItemProgress(item)
                                                            const isDelayed = item.status === 'en_preparacion' && progress >= 99
                                                            return (
                                                                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full transition-all duration-1000 ease-linear ${item.status === 'servido' ? 'bg-green-500' :
                                                                            item.status === 'listo' ? 'bg-blue-500' :
                                                                                isDelayed ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                                                                            }`}
                                                                        style={{ width: `${progress}%` }}
                                                                    />
                                                                </div>
                                                            )
                                                        })()}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        })()}
                    </div>
                </div>

            </main >

            {/* Footer Actions */}
            < div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex gap-3 z-10 transition-all skiptranslate" >
                {currentStep === 3 || order.status === 'listo_pagar' ? (
                    <button
                        onClick={() => router.push(`/${slug}/mesa/${tableNumber}/bill`)}
                        className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-orange-600/30 hover:bg-orange-700 animate-in zoom-in duration-300"
                    >
                        <Receipt size={20} />
                        {t('customer.view_bill')}
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => router.push(`/${slug}/mesa/${tableNumber}/menu`)}
                            className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-orange-600/30 hover:bg-orange-700 transition-all"
                        >
                            <Plus size={20} />
                            {t('customer.add_more')}
                        </button>
                        <button
                            onClick={() => router.push(`/${slug}/mesa/${tableNumber}/bill`)}
                            className="py-4 px-6 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2"
                        >
                            <Receipt size={20} />
                        </button>
                    </>
                )
                }
            </div >

            {/* Cancel Confirmation Modal */}
            {cancelTargetId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-4xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
                                <AlertTriangle size={32} />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {t('common.cancel_confirm_title') || '¿Cancelar producto?'}
                                </h3>
                                <p className="text-slate-500 text-sm">
                                    {t('common.cancel_confirm_desc') || 'Esta acción eliminará el producto de tu pedido. Si ya se está preparando, avisa al mesero.'}
                                </p>
                            </div>

                            <div className="flex gap-3 w-full mt-4">
                                <button
                                    onClick={() => setCancelTargetId(null)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    disabled={isCancelling}
                                >
                                    {t('common.keep') || 'No, volver'}
                                </button>
                                <button
                                    onClick={confirmCancel}
                                    disabled={isCancelling}
                                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                                >
                                    {isCancelling ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                    {t('common.confirm_cancel') || 'Sí, cancelar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <FloatingToggles />
        </div >
    )
}
