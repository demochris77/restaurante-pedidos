'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
    Receipt,
    ChevronLeft,
    Loader2,
    CheckCircle2,
    CreditCard,
    ArrowLeft,
    CreditCard as PaymentIcon
} from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'
import { FloatingToggles } from '@/components/common/FloatingToggles'
import Ably from 'ably'

interface OrderItem {
    id: string
    quantity: number
    unitPrice: number
    status: string
    menuItem: {
        name: string
    }
}

interface Order {
    id: string
    status: string
    total: number
    subtotal: number
    tipAmount: number
    tableNumber: number
    waiter?: {
        name: string
    }
    items: OrderItem[]
}

export default function BillPage() {
    const { t } = useLanguage()
    const params = useParams()
    const router = useRouter()
    const { data: session } = useSession()

    const slug = params.slug as string
    const tableNumber = params.number as string

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [order, setOrder] = useState<Order | null>(null)
    const [tipPercentage, setTipPercentage] = useState(10)

    const isStaff = !!session?.user

    const fetchOrder = useCallback(async () => {
        try {
            const res = await fetch(`/api/public/orders/active?slug=${slug}&table=${tableNumber}`)
            if (res.ok) {
                const data = await res.json()
                if (data.active) {
                    setOrder(data.order)
                    if (data.tipPercentage !== undefined) {
                        setTipPercentage(data.tipPercentage)
                    }
                    return data.organizationId
                }
            }
        } catch (error) {
            console.error('Error fetching order for bill:', error)
        } finally {
            setLoading(false)
        }
        return null
    }, [slug, tableNumber])

    useEffect(() => {
        fetchOrder()

        let ably: Ably.Realtime | null = null
        let channel: any | null = null

        const setupAbly = async () => {
            const orgId = await fetchOrder()
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
                            fetchOrder()
                        }
                    }
                })
            } catch (e) {
                console.error('Ably setup failed in bill:', e)
            }
        }
        setupAbly()

        return () => {
            if (channel) channel.unsubscribe()
            if (ably) ably.close()
        }
    }, [fetchOrder, tableNumber, router, isStaff, slug])

    const handleRequestBill = async () => {
        if (!order) return
        setSubmitting(true)
        try {
            const res = await fetch(`/api/public/orders/${order.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'listo_pagar' })
            })
            if (res.ok) {
                const updated = await res.json()
                setOrder(prev => prev ? { ...prev, status: updated.status } : null)
            }
        } catch (error) {
            console.error('Error requesting bill:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleBack = () => {
        if (session?.user) {
            const role = (session.user as any).role
            if (['admin', 'cajero', 'cashier'].includes(role)) {
                router.push(`/${slug}/cashier`)
                return
            }
            // Default staff fallback to waiter
            router.push(`/${slug}/waiter`)
        } else {
            router.push(`/${slug}/mesa/${tableNumber}/status`)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="animate-spin text-orange-600" size={48} />
            </div>
        )
    }

    const getBackLabel = () => {
        if (session?.user) {
            const role = (session.user as any).role
            if (['admin', 'cajero', 'cashier'].includes(role)) return t('cashier.title')
            return t('bill.back_to_waiter')
        }
        return t('bill.back_to_status')
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 text-center">
                <Receipt size={64} className="text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('order_status.empty_title')}</h2>
                <button onClick={handleBack} className="text-orange-600 font-bold flex items-center gap-2">
                    <ChevronLeft size={20} />
                    {getBackLabel()}
                </button>
            </div>
        )
    }

    const subtotal = Number(order.subtotal || order.items.reduce((acc, i) => acc + (Number(i.unitPrice) * i.quantity), 0))
    const tip = subtotal * (tipPercentage / 100)
    const total = subtotal + tip

    const allServed = order.items.every(item => item.status === 'servido')

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
            <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 flex items-center justify-between skiptranslate">
                <button onClick={handleBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full flex items-center gap-1">
                    <ChevronLeft size={24} className="text-slate-600 dark:text-slate-400" />
                    {session?.user && <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{getBackLabel()}</span>}
                </button>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t('bill.title')}</h1>
                <div className="w-10" />
            </header>

            <main className="p-4 max-w-lg mx-auto space-y-6">
                {/* Order Meta */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 space-y-2 skiptranslate">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-bold uppercase tracking-widest">{t('bill.order_number')}</span>
                        <span className="font-mono text-slate-900 dark:text-white">{order.id.split('-')[0].toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-bold uppercase tracking-widest">{t('common.table')}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{order.tableNumber}</span>
                    </div>
                    {order.waiter && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-bold uppercase tracking-widest">{t('bill.waiter_info')}</span>
                            <span className="font-bold text-orange-600">{order.waiter.name}</span>
                        </div>
                    )}
                </div>

                {/* Items Detail */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-b border-slate-100 dark:border-slate-800 skiptranslate">
                        <div className="grid grid-cols-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="col-span-2">{t('bill.item')}</span>
                            <span className="text-center">{t('bill.quantity')}</span>
                            <span className="text-right">{t('bill.price')}</span>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {order.items.reduce((acc: any[], item) => {
                            const existing = acc.find(i => i.menuItem.name === item.menuItem.name)
                            if (existing) {
                                existing.quantity += item.quantity
                            } else {
                                acc.push({ ...item })
                            }
                            return acc
                        }, []).map((item) => (
                            <div key={item.id} className="px-6 py-4 grid grid-cols-4 items-center">
                                <span className="col-span-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {item.menuItem.name}
                                </span>
                                <span className="text-center text-sm font-medium text-slate-500 skiptranslate">{item.quantity}</span>
                                <span className="text-right text-sm font-bold text-slate-900 dark:text-white skiptranslate">${(Number(item.unitPrice) * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 skiptranslate">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">{t('bill.subtotal')}</span>
                            <span className="font-bold text-slate-900 dark:text-white">${subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">{t('bill.tip', { percent: tipPercentage })}</span>
                            <span className="font-bold text-green-600 dark:text-green-400">${tip.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <span className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('bill.total')}</span>
                        <span className="text-3xl font-black text-orange-600">
                            ${total.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Status and Action */}
                <div className="skiptranslate">
                    {order.status === 'listo_pagar' ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-6 rounded-[2rem] flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center animate-pulse">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-green-800 dark:text-green-300">{t('bill.ready_to_pay')}</p>
                                <p className="text-xs text-green-600/80">{t('customer.wait_waiter')}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {!allServed && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-800/50 text-orange-600 rounded-full shrink-0">
                                        <Loader2 className="animate-spin" size={18} />
                                    </div>
                                    <p className="text-sm font-bold text-orange-800 dark:text-orange-300">
                                        {t('bill.items_pending') || 'Aún hay platos en cocina o por servir'}
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={handleRequestBill}
                                disabled={submitting || !allServed}
                                className={`w-full py-5 rounded-[2rem] font-black text-xl shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                                    !allServed 
                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' 
                                        : 'bg-orange-600 text-white shadow-orange-600/30 hover:bg-orange-700'
                                }`}
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : <CreditCard size={24} />}
                                {isStaff ? t('bill.send_to_cashier') : t('bill.request_bill')}
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <FloatingToggles />
        </div>
    )
}
