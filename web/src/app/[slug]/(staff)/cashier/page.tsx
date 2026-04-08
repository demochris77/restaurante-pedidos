'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLanguage } from '@/components/providers/language-provider'
import { Search, RotateCw, Filter, Receipt } from 'lucide-react'
import { CashierOrderList } from './components/CashierOrderList'
import { PaymentModal } from './components/PaymentModal'
import OrderDetailModal from '@/components/admin/order-detail-modal'
import { useAbly } from '@/lib/ably-hooks'

export default function CashierPage() {
    const { t } = useLanguage()
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string

    const [orders, setOrders] = useState<any[]>([])
    const [sales, setSales] = useState<any[]>([])
    const [tipPercentage, setTipPercentage] = useState<number>(10)
    const [paymentMethods, setPaymentMethods] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'ready'>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'orders' | 'sales'>('orders')

    const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [viewOrderId, setViewOrderId] = useState<string | null>(null)

    const fetchOrders = async () => {
        try {
            if (activeTab === 'orders') setLoading(true)
            const res = await fetch('/api/cashier/orders')
            if (res.ok) {
                const data = await res.json()
                if (data.orders) {
                    setOrders(data.orders)
                    setTipPercentage(data.tipPercentage || 10)
                    setPaymentMethods(data.paymentMethods || [])
                } else if (Array.isArray(data)) {
                    setOrders(data)
                }
            }
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            if (activeTab === 'orders') setLoading(false)
        }
    }

    const fetchSales = async () => {
        try {
            if (activeTab === 'sales') setLoading(true)
            const res = await fetch('/api/cashier/sales')
            if (res.ok) {
                const data = await res.json()
                setSales(data)
            }
        } catch (error) {
            console.error('Error fetching sales:', error)
        } finally {
            if (activeTab === 'sales') setLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'orders') {
            fetchOrders()
        } else {
            fetchSales()
        }
    }, [activeTab])

    useAbly('order-update', (message) => {
        if (activeTab === 'orders') {
            fetchOrders()
        } else if (message.data.status === 'pagado') {
            fetchSales()
        }
    })

    const handlePaymentClick = (order: any) => {
        setSelectedOrder(order)
        setIsPaymentModalOpen(true)
    }

    const handlePaymentSuccess = () => {
        setIsPaymentModalOpen(false)
        setSelectedOrder(null)
        if (activeTab === 'orders') fetchOrders()
        else fetchSales()
    }

    const handleViewBill = (order: any) => {
        router.push(`/${slug}/mesa/${order.tableNumber}/bill`)
    }

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.tableNumber.toString().includes(searchTerm) ||
            order.waiter?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.id.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesFilter = filter === 'all' ||
            (filter === 'ready' && order.status === 'listo_pagar')

        return matchesSearch && matchesFilter
    })

    const filteredSales = sales.filter(sale => {
        const matchesSearch =
            sale.tableNumber.toString().includes(searchTerm) ||
            sale.waiterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sale.id.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesSearch
    })

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-16 z-10 px-4 py-4 shadow-sm">
                <div className="flex flex-col gap-4 max-w-7xl mx-auto">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                {t('cashier.title') || 'Caja'}
                            </h1>

                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'orders'
                                        ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    {t('cashier.tabs.orders') || 'Activos'}
                                </button>
                                <button
                                    onClick={() => setActiveTab('sales')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'sales'
                                        ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    {t('cashier.tabs.sales') || 'Ventas'}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={activeTab === 'orders' ? fetchOrders : fetchSales}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <RotateCw size={20} className={loading ? 'animate-spin text-orange-600' : 'text-slate-500'} />
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder={t('cashier.search') || 'Buscar mesa, mesero o ID...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white font-medium"
                            />
                        </div>
                        {activeTab === 'orders' && (
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    {t('cashier.filter_all') || 'Todos'}
                                </button>
                                <button
                                    onClick={() => setFilter('ready')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'ready'
                                        ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    {t('cashier.filter_ready') || 'Por Cobrar'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="p-4 max-w-7xl mx-auto">
                {activeTab === 'orders' ? (
                    <CashierOrderList
                        orders={filteredOrders}
                        onPaymentClick={handlePaymentClick}
                        onViewBillClick={handleViewBill}
                    />
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[11px] font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-3 py-4">{t('cashier.sales.time') || 'Hora Pago'}</th>
                                        <th className="px-3 py-4">{t('cashier.sales.table') || 'Mesa'}</th>
                                        <th className="px-3 py-4">{t('cashier.sales.total') || 'Total'}</th>
                                        <th className="px-3 py-4 text-right">{t('common.actions') || 'Acciones'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredSales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-3 py-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {new Date(sale.paymentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-3 py-4">
                                                <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                                    #{sale.tableNumber}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 font-black text-slate-900 dark:text-white">
                                                ${sale.total.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-4 text-right">
                                                <button
                                                    onClick={() => setViewOrderId(sale.id)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                >
                                                    <Search size={14} />
                                                    {t('cashier.view') || 'Ver'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredSales.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center text-slate-400">
                                                <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                                                <p className="text-lg">{t('cashier.no_sales') || 'No se han registrado ventas hoy'}</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Payment Modal */}
            {isPaymentModalOpen && selectedOrder && (
                <PaymentModal
                    order={selectedOrder}
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={handlePaymentSuccess}
                    slug={slug}
                    defaultTipPercentage={tipPercentage}
                    paymentMethods={paymentMethods}
                />
            )}

            {/* Order Detail Modal */}
            <OrderDetailModal
                isOpen={!!viewOrderId}
                onClose={() => setViewOrderId(null)}
                orderId={viewOrderId}
            />
        </div>
    )
}
