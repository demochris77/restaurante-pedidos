import { Activity, Coffee, Edit3, Trash2, Receipt, DollarSign, ChevronDown, CheckCircle2, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'

interface Order {
    id: string
    tableNumber: string
    status: string
    total: string
    waiterId: string | null
    items?: any[]
}

interface ActiveOrdersProps {
    activeOrders: Order[]
    t: (key: string, params?: any) => string
    handleEditOrder: (order: Order) => void
    setOrderToCancel: (orderId: string) => void
    setIsCancelModalOpen: (open: boolean) => void
    onSendToCashier: (order: Order) => void
    onClaimOrder: (orderId: string) => void
    onServeItem: (itemId: string) => void
    onServeAll: (items: any[]) => void
    slug: string
}

export const ActiveOrders: React.FC<ActiveOrdersProps> = ({
    activeOrders,
    t,
    handleEditOrder,
    setOrderToCancel,
    setIsCancelModalOpen,
    onSendToCashier,
    onClaimOrder,
    onServeItem,
    onServeAll,
    slug
}) => {
    const router = useRouter()
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

    const toggleOrder = (orderId: string) => {
        setExpandedOrders(prev => {
            const next = new Set(prev)
            if (next.has(orderId)) next.delete(orderId)
            else next.add(orderId)
            return next
        })
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Activity size={20} className="text-blue-500" />
                {t('waiter.orders_in_progress')}
            </h3>

            {activeOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                    <Coffee size={32} className="mx-auto mb-2 opacity-50" />
                    <p>{t('waiter.no_active_orders')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeOrders.map((order) => {
                        const allServed = order.items && order.items.length > 0 && order.items.every(item => item.status === 'servido')
                        const allReady = order.items && order.items.length > 0 && order.items.every(item => ['listo', 'servido'].includes(item.status))

                        // Infer status if aggregate status is lagging
                        const effectiveStatus = order.status === 'listo_pagar' ? 'listo_pagar' :
                            allServed ? 'servido' :
                                allReady ? 'listo' :
                                    order.status;

                        const getStatusStyles = (status: string) => {
                            switch (status) {
                                case 'listo': return 'bg-green-100 text-green-700 border-green-200'
                                case 'servido': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                case 'listo_pagar': return 'bg-purple-100 text-purple-700 border-purple-200'
                                case 'en_cocina': return 'bg-blue-100 text-blue-700 border-blue-200'
                                case 'nuevo': return 'bg-orange-100 text-orange-700 border-orange-200'
                                default: return 'bg-slate-100 text-slate-600 border-slate-200'
                            }
                        }

                        const isUnassigned = !order.waiterId;

                        return (
                            <div key={order.id} className={clsx(
                                "border rounded-xl p-3 transition-colors",
                                isUnassigned
                                    ? "border-orange-200 bg-orange-50/30 dark:border-orange-900/40 dark:bg-orange-900/10 border-dashed"
                                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            )}>
                                <div 
                                    className="cursor-pointer"
                                    onClick={() => toggleOrder(order.id)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-md">
                                                {t('common.table')} {order.tableNumber}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${getStatusStyles(effectiveStatus)}`}>
                                                {t(`status.${effectiveStatus}`)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                ${parseFloat(order.total).toLocaleString()}
                                            </span>
                                            <ChevronDown size={14} className={clsx("text-slate-400 transition-transform duration-300", expandedOrders.has(order.id) && "rotate-180")} />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                        <span>
                                            {t('waiter.items_count', { count: order.items?.length || 0 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded Items View */}
                                {expandedOrders.has(order.id) && order.items && order.items.length > 0 && (
                                    <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        {/* Serve All Button */}
                                        {!allServed && !isUnassigned && (
                                            <button
                                                onClick={() => onServeAll(order.items!)}
                                                className="w-full py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
                                            >
                                                <UserCheck size={14} /> {t('waiter.serve_all') || 'Servir Todo'}
                                            </button>
                                        )}

                                        <div className="space-y-2">
                                            {(() => {
                                                const grouped = order.items.reduce((acc: any[], item: any) => {
                                                    const existing = acc.find(i => i.menuItemId === item.menuItemId && i.status === item.status)
                                                    if (existing) {
                                                        existing.quantity += item.quantity
                                                        existing.ids.push(item.id)
                                                    } else {
                                                        acc.push({
                                                            menuItemId: item.menuItemId,
                                                            name: item.menuItem?.name,
                                                            quantity: item.quantity,
                                                            status: item.status,
                                                            ids: [item.id]
                                                        })
                                                    }
                                                    return acc
                                                }, [])

                                                return grouped.map((group, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-orange-600 min-w-[20px]">{group.quantity}x</span>
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{group.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${getStatusStyles(group.status)}`}>
                                                                {t(`status.${group.status}`)}
                                                            </span>
                                                            {group.status !== 'servido' && !isUnassigned && (
                                                                <button
                                                                    onClick={() => onServeItem(group.ids[0])} // Serve first one for now, or we can serve all in group
                                                                    className="p-1.5 bg-white dark:bg-slate-800 text-emerald-600 rounded-md border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-50 transition-colors shadow-sm"
                                                                    title={t('waiter.serve')}
                                                                >
                                                                    <CheckCircle2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            })()}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/50 flex justify-end gap-2">
                                    {isUnassigned ? (
                                        <button
                                            onClick={() => onClaimOrder(order.id)}
                                            className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors shadow-sm font-bold text-xs flex items-center gap-2"
                                        >
                                            <Activity size={14} />
                                            {t('waiter.take_order')}
                                        </button>
                                    ) : (
                                        <>
                                            {(allServed || order.status === 'servido') && order.status !== 'listo_pagar' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onSendToCashier(order)
                                                    }}
                                                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
                                                    title={t('bill.send_to_cashier')}
                                                >
                                                    <DollarSign size={18} />
                                                </button>
                                            )}
                                            {(allServed || order.status === 'servido' || order.status === 'listo_pagar') && (
                                                <button
                                                    onClick={() => router.push(`/${slug}/mesa/${order.tableNumber}/bill`)}
                                                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors shadow-sm"
                                                    title={t('customer.view_bill')}
                                                >
                                                    <Receipt size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleEditOrder(order)}
                                                className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors shadow-sm"
                                                title={t('waiter.edit')}
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setOrderToCancel(order.id)
                                                    setIsCancelModalOpen(true)
                                                }}
                                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors shadow-sm"
                                                title={t('waiter.cancel_order')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
