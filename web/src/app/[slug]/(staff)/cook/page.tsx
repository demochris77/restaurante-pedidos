'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useLanguage } from '@/components/providers/language-provider'
import {
    ChefHat,
    RefreshCw,
    Bell,
    Flame,
    Play,
    CheckCircle2,
    Clock,
    User,
    Hash,
    ChevronDown,
    ChevronUp,
    Filter,
    Inbox,
    AlertCircle,
    Loader2
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import Ably from 'ably'
import { Container } from '@/components/ui/container'
import ConfirmationModal from '@/components/ui/confirmation-modal'

interface OrderItem {
    id: string
    menuItemId: string
    quantity: number
    notes: string | null
    status: string
    startedAt: string | null
    completedAt: string | null
    menuItem: {
        name: string
        category: string
        isDirect: boolean
    }
}

interface Order {
    id: string
    tableNumber: number
    status: string
    notes: string | null
    createdAt: string
    waiter: { name: string } | null
    items: OrderItem[]
}

interface Category {
    id: number
    name: string
}

export default function CookPanelPage() {
    const { t } = useLanguage()
    const { data: session, status } = useSession()
    const params = useParams()
    const slug = params.slug as string

    const [loading, setLoading] = useState(true)
    const [orders, setOrders] = useState<Order[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [expandedTables, setExpandedTables] = useState<number[]>([])
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
    const [now, setNow] = useState(Date.now())

    // Modal state
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean
        title: string
        message: string
        onConfirm: () => void
    }>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => { }
    })

    useEffect(() => {
        fetchData()
        fetchCategories()
        // Removed polling interval in favor of Ably real-time updates

        const timerInterval = setInterval(() => {
            setNow(Date.now())
        }, 1000)

        return () => {
            clearInterval(timerInterval)
        }
    }, [])

    useEffect(() => {
        if (status === 'authenticated' && session?.user && (session.user as any).organizationId) {
            const orgId = (session.user as any).organizationId
            let ably: Ably.Realtime

            try {
                ably = new Ably.Realtime({ authUrl: '/api/ably/auth' })
                const channel = ably.channels.get(`orders:${orgId}`)

                const handleMessage = () => {
                    fetchData()
                }

                channel.subscribe('order-update', handleMessage)
                channel.subscribe('order-created', handleMessage)

                return () => {
                    channel.unsubscribe()
                    ably.close()
                }
            } catch (error) {
                console.error('Error initializing Ably:', error)
            }
        }
    }, [status, session])

    const fetchData = async () => {
        try {
            const res = await fetch('/api/orders?status=nuevo,en_cocina,listo')
            if (res.ok) {
                const data = await res.json()
                setOrders(data)
            }
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/menu/categories')
            if (res.ok) {
                const data = await res.json()
                setCategories(data)
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
        }
    }

    const updateOrderStatus = async (orderId: string, status: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })
            if (res.ok) fetchData()
        } catch (error) {
            console.error('Error updating order status:', error)
        }
    }

    const updateItemStatus = async (itemId: string, status: string) => {
        try {
            const res = await fetch(`/api/orders/items/${itemId}`, {
                method: 'PATCH', // Our generic status update
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })
            if (res.ok) fetchData()
        } catch (error) {
            console.error('Error updating item status:', error)
        }
    }

    const batchUpdateStatus = async (itemIds: string[], status: string) => {
        try {
            const res = await fetch('/api/orders/items/batch-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds, status })
            })
            if (res.ok) fetchData()
        } catch (error) {
            console.error('Error batch updating status:', error)
        }
    }

    const handleCompleteAll = (orderIds: string[], items: OrderItem[], tableNumber: number) => {
        const itemIds = items
            .filter(i => ['nuevo', 'pendiente', 'en_cocina', 'en_preparacion'].includes(i.status))
            .map(i => i.id)

        if (itemIds.length === 0) return

        setConfirmModal({
            open: true,
            title: t('kitchen.complete_all'),
            message: t('kitchen.confirm_complete_all', { count: itemIds.length, table: tableNumber.toString() }),
            onConfirm: () => {
                // Also update order status if needed, but batch item update is key
                batchUpdateStatus(itemIds, 'listo')
                // If all items are done, maybe update order? Backend should handle or we poll.
                // For now just batch update items.
                // Also ensure orders are moved from 'nuevo' if they were.
                orderIds.forEach(id => updateOrderStatus(id, 'en_cocina')) // Move to cooking if not already, or just rely on item status.
                // Actually, if we complete all, they are ready.
                setConfirmModal(prev => ({ ...prev, open: false }))
            }
        })
    }

    const toggleMesa = (tableNumber: number) => {
        setExpandedTables(prev =>
            prev.includes(tableNumber)
                ? prev.filter(n => n !== tableNumber)
                : [...prev, tableNumber]
        )
    }

    const toggleItemExpansion = (tableNumber: number, menuItemId: string) => {
        const key = `${tableNumber}-${menuItemId}`
        setExpandedItems(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const toggleCategory = (categoryName: string) => {
        setSelectedCategories(prev =>
            prev.includes(categoryName)
                ? prev.filter(c => c !== categoryName)
                : [...prev, categoryName]
        )
    }

    const getTimeElapsed = (startedAt: string | null) => {
        if (!startedAt) return '0m'
        const diff = Math.floor((now - new Date(startedAt).getTime()) / 60000)
        return `${diff}m`
    }

    const getOldestItemTime = (items: OrderItem[]) => {
        const cookingItems = items.filter(i => i.status === 'en_preparacion' && i.startedAt)
        if (cookingItems.length === 0) return null

        const oldest = cookingItems.reduce((prev, curr) => {
            const prevTime = new Date(prev.startedAt!).getTime()
            const currTime = new Date(curr.startedAt!).getTime()
            return prevTime < currTime ? prev : curr
        })

        return getTimeElapsed(oldest.startedAt)
    }

    const getProgress = (items: OrderItem[]) => {
        if (items.length === 0) return 0
        const readyItems = items.filter(i => ['listo', 'servido'].includes(i.status)).length
        return Math.round((readyItems / items.length) * 100)
    }

    // Filter logic
    const filterItems = (orderItems: OrderItem[]) => {
        if (selectedCategories.length === 0) return orderItems
        return orderItems.filter(item => selectedCategories.includes(item.menuItem.category))
    }

    // Simplified: All active orders (new + cooking + ready but not served)
    const cookingOrders = orders.filter(o => ['nuevo', 'en_cocina', 'listo'].includes(o.status))
    const tablesMap: Record<number, { tableNumber: number, waiter: string, items: OrderItem[], orderIds: string[], notes: string[] }> = {}

    cookingOrders.forEach(order => {
        if (!tablesMap[order.tableNumber]) {
            tablesMap[order.tableNumber] = {
                tableNumber: order.tableNumber,
                waiter: order.waiter?.name || '---',
                items: [],
                orderIds: [],
                notes: []
            }
        }
        // Filter out direct items from the cook view
        const visibleItems = order.items.filter(item => !item.menuItem.isDirect)
        if (visibleItems.length > 0) {
            tablesMap[order.tableNumber].items.push(...visibleItems)
        }
        tablesMap[order.tableNumber].orderIds.push(order.id)
        if (order.notes) {
            tablesMap[order.tableNumber].notes.push(order.notes)
        }
    })

    const allTables = Object.values(tablesMap).sort((a, b) => a.tableNumber - b.tableNumber)
    
    // A table is active if it has items that are not 'listo' and not 'servido'
    const activeTables = allTables.filter(t => 
        t.items.some(i => !['listo', 'servido'].includes(i.status))
    )
    
    // A table is completed if all its items are 'listo' or 'servido'
    const completedTables = allTables.filter(t => 
        t.items.length > 0 && t.items.every(i => ['listo', 'servido'].includes(i.status))
    )

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-6 space-y-6">
            <Container>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
                            <ChefHat size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {t('kitchen.title')}
                            </h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                                    <Flame size={12} /> {activeTables.length} {t('kitchen.cooking')}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Category Filter */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mr-2 border-r border-slate-200 dark:border-slate-800 pr-3">
                        <Filter size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">{t('kitchen.filter_categories')}</span>
                    </div>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => toggleCategory(cat.name)}
                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-black transition-all ${selectedCategories.includes(cat.name)
                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                    {selectedCategories.length > 0 && (
                        <button
                            onClick={() => setSelectedCategories([])}
                            className="text-xs font-bold text-orange-600 underline px-2"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Active Cooking Grid (Full Width) */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Flame size={16} /> {t('kitchen.cooking')}
                            </h2>
                        </div>

                        {activeTables.length === 0 ? (
                            <div className="bg-white/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-20 text-center flex flex-col items-center justify-center gap-4">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                                    <ChefHat size={32} />
                                </div>
                                <p className="text-lg font-black text-slate-400">{t('kitchen.empty_cooking')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                {activeTables.map(table => {
                                    const items = filterItems(table.items)
                                    if (items.length === 0 && selectedCategories.length > 0) return null

                                    const isExpanded = expandedTables.includes(table.tableNumber)
                                    const oldestTime = getOldestItemTime(table.items)
                                    const progress = getProgress(table.items)

                                    // Deduplicate notes
                                    const uniqueNotes = Array.from(new Set(table.notes.filter(Boolean)))

                                    return (
                                        <div key={table.tableNumber} className={`group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg transition-all duration-500 ${isExpanded ? 'ring-2 ring-orange-500/20' : 'hover:scale-[1.01]'}`}>
                                            {/* Table Header */}
                                            <div
                                                className="p-6 cursor-pointer select-none flex flex-col gap-4"
                                                onClick={() => toggleMesa(table.tableNumber)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-[1.5rem] flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">{t('common.table')}</span>
                                                            <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{table.tableNumber}</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <p className="text-xs font-black text-slate-400 flex items-center gap-1">
                                                                    <User size={12} /> {table.waiter}
                                                                </p>
                                                                {oldestTime && (
                                                                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 text-[10px] font-black rounded-full flex items-center gap-1 uppercase">
                                                                        <Clock size={10} /> {oldestTime}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="mt-2 flex items-center gap-3">
                                                                <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-orange-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                                                                </div>
                                                                <span className="text-[10px] font-black text-orange-600 uppercase">{progress}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {!isExpanded && progress < 100 && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleCompleteAll(table.orderIds, table.items, table.tableNumber) }}
                                                                className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                                                                title={t('kitchen.complete_all')}
                                                            >
                                                                <CheckCircle2 size={20} />
                                                            </button>
                                                        )}
                                                        <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'bg-orange-100 text-orange-600 rotate-180' : 'bg-slate-50 text-slate-400'}`}>
                                                            <ChevronDown size={20} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Table Notes */}
                                                {uniqueNotes.length > 0 && (
                                                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                                                        <p className="text-[10px] font-bold text-yellow-600 uppercase mb-1 flex items-center gap-1">
                                                            <AlertCircle size={10} /> {t('common.notes')}
                                                        </p>
                                                        {uniqueNotes.map((note, idx) => (
                                                            <p key={idx} className="text-xs font-medium text-slate-700 dark:text-slate-300 break-words leading-tight">
                                                                {note}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Group Actions */}
                                            {isExpanded && (
                                                <div className="px-6 pb-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCompleteAll(table.orderIds, table.items, table.tableNumber) }}
                                                        className="flex-1 py-3 bg-green-600 text-white rounded-xl font-black text-xs hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                                                    >
                                                        <CheckCircle2 size={14} /> {t('kitchen.complete_all')}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Item List */}
                                            {isExpanded && (
                                                <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/50 animate-in fade-in duration-300">
                                                    {(() => {
                                                        const groupedItems = items.reduce((acc: any[], item) => {
                                                            const existing = acc.find(i => i.menuItemId === item.menuItemId)
                                                            if (existing) {
                                                                existing.totalQuantity += item.quantity
                                                                existing.items.push(item)
                                                            } else {
                                                                acc.push({
                                                                    menuItemId: item.menuItemId,
                                                                    name: item.menuItem.name,
                                                                    totalQuantity: item.quantity,
                                                                    items: [item]
                                                                })
                                                            }
                                                            return acc
                                                        }, [])

                                                        return groupedItems.map(group => {
                                                            const isItemExpanded = expandedItems.has(`${table.tableNumber}-${group.menuItemId}`)
                                                            const hasNotes = group.items.some((i: any) => i.notes)
                                                            const isSingle = group.totalQuantity === 1
                                                            const singleItem = group.items[0]
                                                            const allCompleted = group.items.every((i: any) => i.status === 'listo')

                                                            if (isSingle) {
                                                                return (
                                                                    <div key={group.menuItemId} className="p-4 sm:p-5 flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-4">
                                                                                <span className="w-8 h-8 shrink-0 bg-orange-100 dark:bg-orange-950/40 rounded-xl flex items-center justify-center text-sm font-black text-orange-600">
                                                                                    1
                                                                                </span>
                                                                                <h4 className="font-black text-slate-900 dark:text-white leading-tight break-words text-sm sm:text-base">
                                                                                    {group.name}
                                                                                </h4>
                                                                            </div>
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                                    {getTimeElapsed(singleItem.startedAt || orders.find(o => o.items.some(i => i.id === singleItem.id))?.createdAt || null)}
                                                                                </span>
                                                                                {['pendiente', 'nuevo', 'en_cocina', 'en_preparacion'].includes(singleItem.status) ? (
                                                                                    <button
                                                                                        onClick={() => updateItemStatus(singleItem.id, 'listo')}
                                                                                        className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-green-600/20 hover:bg-green-700"
                                                                                        title={t('kitchen.complete') || 'Listo'}
                                                                                    >
                                                                                        <CheckCircle2 size={20} />
                                                                                    </button>
                                                                                ) : (
                                                                                    <div className="w-10 h-10 flex items-center justify-center text-green-600">
                                                                                        <CheckCircle2 size={20} />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {singleItem.notes && (
                                                                            <div className="ml-12 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                                                                                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                                                                <span className="text-xs text-red-600 font-bold uppercase break-words leading-tight">{singleItem.notes}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            }

                                                            return (
                                                                <div key={group.menuItemId} className="flex flex-col border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                                    {/* Group Summary Row */}
                                                                    <div className="flex items-center">
                                                                        <button
                                                                            onClick={() => toggleItemExpansion(table.tableNumber, group.menuItemId)}
                                                                            className="flex-1 p-4 sm:p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                                                                        >
                                                                            <span className="w-8 h-8 shrink-0 bg-orange-100 dark:bg-orange-950/40 rounded-xl flex items-center justify-center text-sm font-black text-orange-600">
                                                                                {group.totalQuantity}
                                                                            </span>
                                                                            <div className="flex-1">
                                                                                <h4 className="font-black text-slate-900 dark:text-white leading-tight break-words text-sm sm:text-base">
                                                                                    {group.name}
                                                                                </h4>
                                                                                {hasNotes && !isItemExpanded && (
                                                                                    <span className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 mt-1">
                                                                                        <AlertCircle size={10} /> {t('common.notes')}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className={`p-1.5 rounded-full transition-transform duration-300 ${isItemExpanded ? 'bg-orange-100 text-orange-600 rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                                                                                <ChevronDown size={16} />
                                                                            </div>
                                                                        </button>
                                                                        
                                                                        {!allCompleted && (
                                                                            <div className="pr-4 sm:pr-5">
                                                                                <button
                                                                                    onClick={() => batchUpdateStatus(group.items.map((i: any) => i.id), 'listo')}
                                                                                    className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-200 transition-all border border-green-200"
                                                                                    title={t('kitchen.complete_all') || 'Listo Todo'}
                                                                                >
                                                                                    <CheckCircle2 size={20} />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Expanded Group Items */}
                                                                    {isItemExpanded && (
                                                                        <div className="bg-slate-50/50 dark:bg-slate-900/30 divide-y divide-slate-100 dark:divide-slate-800 px-4 pb-4 space-y-3">
                                                                            {group.items.map((item: any) => (
                                                                                <div key={item.id} className={`pt-3 flex flex-col gap-3 ${item.status === 'listo' ? 'opacity-60' : ''}`}>
                                                                                    <div className="flex items-start gap-3">
                                                                                        <span className="text-xs font-black text-slate-400 mt-0.5">#{item.id.split('-')[0].toUpperCase()}</span>
                                                                                        <div className="flex-1 space-y-2">
                                                                                            {item.notes && (
                                                                                                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                                                                                                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                                                                                    <span className="text-xs text-red-600 font-bold uppercase break-words leading-tight">{item.notes}</span>
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="flex items-center justify-between gap-4">
                                                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                                                    {getTimeElapsed(item.startedAt || orders.find(o => o.items.some(i => i.id === item.id))?.createdAt || null)}
                                                                                                </span>
                                                                                                {['pendiente', 'nuevo', 'en_cocina', 'en_preparacion'].includes(item.status) ? (
                                                                                                    <button
                                                                                                        onClick={() => updateItemStatus(item.id, 'listo')}
                                                                                                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-black text-[10px] uppercase transition-all shadow-lg shadow-green-600/20 hover:bg-green-700"
                                                                                                    >
                                                                                                        {t('kitchen.complete') || 'Listo'}
                                                                                                    </button>
                                                                                                ) : (
                                                                                                    <div className="flex items-center gap-1.5 text-green-600 text-[10px] font-black uppercase">
                                                                                                        <CheckCircle2 size={12} /> {t('common.ready') || 'Listo'}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })
                                                    })()}
                                                </div>
                                            )}

                                            {!isExpanded && (
                                                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                                                    {(() => {
                                                        const previewGroups = items.reduce((acc: any[], item) => {
                                                            const existing = acc.find(i => i.menuItemId === item.menuItemId)
                                                            if (existing) {
                                                                existing.totalQuantity += item.quantity
                                                            } else {
                                                                acc.push({
                                                                    menuItemId: item.menuItemId,
                                                                    name: item.menuItem.name,
                                                                    totalQuantity: item.quantity,
                                                                    status: item.status
                                                                })
                                                            }
                                                            return acc
                                                        }, [])

                                                        return (
                                                            <>
                                                                {previewGroups.slice(0, 4).map(group => (
                                                                    <div key={group.menuItemId} className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${group.status === 'listo' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800'}`}>
                                                                        <span className={group.status === 'listo' ? 'text-green-600' : 'text-orange-600'}>{group.totalQuantity}x</span>
                                                                        <span className="text-slate-600 dark:text-slate-400">{group.name}</span>
                                                                    </div>
                                                                ))}
                                                                {previewGroups.length > 4 && (
                                                                    <span className="text-[10px] font-black text-slate-400 px-2">+{previewGroups.length - 4}</span>
                                                                )}
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Completed Tables Section */}
                    {completedTables.length > 0 && (
                        <div className="lg:col-span-4 space-y-4 pt-10 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <CheckCircle2 size={16} /> {t('common.ready') || 'Completados'}
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 opacity-75 grayscale hover:grayscale-0 transition-all duration-500">
                                {completedTables.map(table => {
                                    const isExpanded = expandedTables.includes(table.tableNumber)
                                    const progress = getProgress(table.items)
                                    return (
                                        <div key={table.tableNumber} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all duration-500 ${isExpanded ? 'ring-2 ring-green-500/20' : ''}`}>
                                            <div 
                                                className="p-6 cursor-pointer select-none flex items-center justify-between"
                                                onClick={() => toggleMesa(table.tableNumber)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center border border-green-100 dark:border-green-800">
                                                        <span className="text-lg font-black text-green-600">{table.tableNumber}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{table.waiter}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="w-16 h-1 bg-green-100 dark:bg-green-900/30 rounded-full overflow-hidden">
                                                                <div className="h-full bg-green-600" style={{ width: '100%' }} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-green-600 uppercase">{t('common.ready') || 'Listo'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    <ChevronDown size={18} />
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 p-4 space-y-2">
                                                    {(() => {
                                                        const grouped = table.items.reduce((acc: any[], item) => {
                                                            const existing = acc.find(i => i.menuItemId === item.menuItemId)
                                                            if (existing) {
                                                                existing.totalQuantity += item.quantity
                                                                // If any item is 'listo', group status is 'listo' (prioritize over 'servido' as it's more relevant for visibility)
                                                                if (item.status === 'listo') existing.status = 'listo'
                                                            } else {
                                                                acc.push({
                                                                    menuItemId: item.menuItemId,
                                                                    name: item.menuItem.name,
                                                                    totalQuantity: item.quantity,
                                                                    status: item.status
                                                                })
                                                            }
                                                            return acc
                                                        }, [])

                                                        return grouped.map(group => (
                                                            <div key={group.menuItemId} className="flex items-center justify-between text-xs py-1">
                                                                <span className="font-bold text-slate-600 dark:text-slate-400">
                                                                    {group.totalQuantity}x {group.name}
                                                                </span>
                                                                <span className={`text-[10px] font-black uppercase ${group.status === 'servido' ? 'text-slate-400' : 'text-green-600'}`}>
                                                                    {group.status === 'servido' ? t('common.served') || 'Servido' : t('common.ready') || 'Listo'}
                                                                </span>
                                                            </div>
                                                        ))
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Container>

            {/* Modals */}
            <ConfirmationModal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={t('common.yes')}
                isDestructive={false}
            />

            {/* Custom Styles for no-scrollbar */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}
