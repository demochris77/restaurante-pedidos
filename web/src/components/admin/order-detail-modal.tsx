'use client'

import { useState, useEffect } from 'react'
import { X, Receipt, Clock, User, Hash, Utensils, CheckCircle2, AlertTriangle, Loader2, LayoutGrid, List } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useLanguage } from '@/components/providers/language-provider'
import clsx from 'clsx'

interface OrderDetailModalProps {
    isOpen: boolean
    onClose: () => void
    orderId: string | null
}

export default function OrderDetailModal({ isOpen, onClose, orderId }: OrderDetailModalProps) {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(true)
    const [order, setOrder] = useState<any>(null)
    const [error, setError] = useState('')
    const [isStacked, setIsStacked] = useState(true)

    useEffect(() => {
        if (isOpen && orderId) {
            fetchOrder()
        }
    }, [isOpen, orderId])

    const fetchOrder = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/admin/orders/${orderId}`)
            if (!res.ok) throw new Error('Failed to fetch order details')
            const data = await res.json()
            setOrder(data)
        } catch (err: any) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Helper to group items by menuItemId
    const getGroupedItems = () => {
        if (!order?.items) return []
        return order.items.reduce((acc: any[], item: any) => {
            const existing = acc.find(i => i.menuItemId === item.menuItemId)
            if (existing) {
                existing.quantity += item.quantity
                existing.totalPrice += Number(item.unitPrice) * item.quantity
            } else {
                acc.push({
                    ...item,
                    totalPrice: Number(item.unitPrice) * item.quantity
                })
            }
            return acc
        }, [])
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                            <Receipt size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {t('order_detail.title') || 'Order Details'}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono">
                                ID: {orderId}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto custom-scrollbar p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader2 className="animate-spin text-orange-600" size={40} />
                            <p className="text-slate-500 animate-pulse">{t('common.loading')}</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-100 dark:border-red-900/30 flex flex-col items-center gap-3 text-center">
                            <AlertTriangle size={48} className="text-red-500" />
                            <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                            <button
                                onClick={fetchOrder}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold"
                            >
                                {t('admin.refresh')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Meta Info */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <InfoCard icon={Hash} label={t('order_detail.table')} value={`#${order.tableNumber}`} />
                                <InfoCard icon={User} label={t('order_detail.waiter')} value={order.waiter?.name || '---'} />
                                <InfoCard
                                    icon={CheckCircle2}
                                    label={t('order_detail.status')}
                                    value={t('status.' + order.status) || order.status}
                                    status={order.status}
                                />
                                <InfoCard
                                    icon={Clock}
                                    label={t('admin.dashboard.table.time')}
                                    value={new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                />
                            </div>

                            {/* Items Table */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Utensils size={18} />
                                        {t('order_detail.items')}
                                    </h4>
                                    <button
                                        onClick={() => setIsStacked(!isStacked)}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                                    >
                                        {isStacked ? <List size={14} /> : <LayoutGrid size={14} />}
                                        {isStacked ? (t('order_detail.decouple') || 'Desacoplar') : (t('order_detail.stack') || 'Apilar')}
                                    </button>
                                </div>
                                <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">{t('bill.item')}</th>
                                                <th className="px-4 py-3 text-center">{t('bill.quantity')}</th>
                                                <th className="px-4 py-3 text-right">{t('bill.price')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {(isStacked ? getGroupedItems() : order.items).map((item: any) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <p className="font-bold text-slate-900 dark:text-white">{item.menuItem.name}</p>
                                                        {!isStacked && item.notes && <p className="text-xs text-slate-400 italic font-medium">“{item.notes}”</p>}
                                                        {isStacked && order.items.filter((i: any) => i.menuItemId === item.menuItemId && i.notes).length > 0 && (
                                                            <p className="text-[10px] text-orange-500 font-bold uppercase tracking-tighter mt-0.5">{t('order_detail.has_notes') || 'Tiene notas'}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                                                        {formatCurrency(isStacked ? item.totalPrice : (Number(item.unitPrice) * item.quantity))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">{t('bill.subtotal')}</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">{t('admin.stats.tips')}</span>
                                    <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(order.tipAmount)}</span>
                                </div>
                                <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <span className="font-black uppercase tracking-widest text-slate-900 dark:text-white">{t('order_detail.total')}</span>
                                    <span className="text-2xl font-black text-orange-600">{formatCurrency(order.total)}</span>
                                </div>
                            </div>

                            {/* Payments */}
                            {order.transactions && order.transactions.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Receipt size={18} />
                                        {t('admin.payment_methods')}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {order.transactions.map((t: any) => (
                                            <div key={t.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">{t.paymentMethod}</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(t.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        {t('common.back')}
                    </button>
                </div>
            </div>
        </div>
    )
}

function InfoCard({ icon: Icon, label, value, status }: { icon: any, label: string, value: string, status?: string }) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-2 mb-1 text-slate-400">
                <Icon size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <p className={clsx(
                "text-sm font-bold truncate",
                status === 'pagado' ? 'text-green-600 dark:text-green-400' :
                    status === 'cancelado' ? 'text-red-600 dark:text-red-400' :
                        'text-slate-900 dark:text-white'
            )}>
                {value}
            </p>
        </div>
    )
}
