'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    Activity,
    CheckCircle2,
    ChevronDown,
    Trash2,
    Edit3,
    ClipboardList,
} from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'
import ConfirmationModal from '@/components/ui/confirmation-modal'
import QRModal from '@/components/staff/QRModal'
import { ReadyItem } from './components/ReadyItems'

import { TableSelection } from './components/TableSelection'
import { CartOverlay } from './components/CartOverlay'
import { ReadyItems } from './components/ReadyItems'
import { ActiveOrders } from './components/ActiveOrders'
import { CategorySelector } from './components/CategorySelector'
import { MenuList } from './components/MenuList'
import { WaiterHeader } from './components/WaiterHeader'
import { useWaiterData } from './hooks/useWaiterData'

// Interfaces
interface Table {
    id: string
    number: string
    capacity: number
    status: string
}

interface MenuItem {
    id: string
    name: string
    price: number
    description: string | null
    imageUrl: string | null
    category: string
    available: boolean
    isDirect: boolean
    calculatedStock: number
}

interface CartItem extends MenuItem {
    cartItemId: string
    quantity: number
    notes: string
}

export default function WaiterPage() {
    const params = useParams()
    const slug = params?.slug as string
    const { t } = useLanguage()
    const router = useRouter()

    // Use Custom Hook for Data & Realtime
    const {
        tables,
        categories,
        menuItems,
        activeOrders,
        loading,
        fetchData,
        status // Need status to redirect if unauthenticated
    } = useWaiterData()




    // UI states
    const [selectedTable, setSelectedTable] = useState<Table | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null) // ID of order being edited

    // Cart states
    const [cart, setCart] = useState<CartItem[]>([])
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [orderNote, setOrderNote] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Notification state
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
    const [tempNoteValue, setTempNoteValue] = useState('')
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<string | null>(null)
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
    const [orderToCancel, setOrderToCancel] = useState<string | null>(null)
    const [isSendToCashierModalOpen, setIsSendToCashierModalOpen] = useState(false)
    const [orderToSendToCashier, setOrderToSendToCashier] = useState<any | null>(null)
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

    // QR State
    const [isMenuQRModalOpen, setIsMenuQRModalOpen] = useState(false)

    // Clear notification after 3s
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [notification])

    const handleEditOrder = (order: any) => {
        // Find table
        const table = tables.find(t => t.number === order.tableNumber)
        if (table) {
            setSelectedTable(table)
            setActiveOrderId(order.id)
            setCart([]) // Cart is for NEW items
            setOrderNote(order.notes || '')
            // IsCartOpen? Maybe?
        }
    }

    const handleDeleteItem = async () => {
        if (!itemToDelete) return

        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/orders/items/${itemToDelete}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                setNotification({ type: 'success', message: t('waiter.delete_success') || 'Item deleted' })
                await fetchData()
                setIsDeleteModalOpen(false)
                setItemToDelete(null)
            } else {
                const err = await res.json()
                setNotification({ type: 'error', message: err.error || t('waiter.delete_error') || 'Failed to delete' })
            }
        } catch (error) {
            setNotification({ type: 'error', message: t('waiter.error_deleting_item') })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCancelOrder = async () => {
        if (!orderToCancel) return

        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/orders/${orderToCancel}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelado' })
            })

            if (res.ok) {
                setNotification({ type: 'success', message: t('waiter.order_cancelled') || 'Order cancelled' })
                await fetchData()
                setIsCancelModalOpen(false)
                setOrderToCancel(null)
            } else {
                const err = await res.json()
                setNotification({ type: 'error', message: err.error || 'Failed to cancel order' })
            }
        } catch (err) {
            setNotification({ type: 'error', message: t('waiter.error_cancelling_order') || 'Error cancelling order' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSendToCashier = async () => {
        if (!orderToSendToCashier) return

        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/orders/${orderToSendToCashier.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'listo_pagar' })
            })

            if (res.ok) {
                setNotification({ type: 'success', message: t('waiter.send_to_cashier_success') || 'Order sent to cashier' })
                await fetchData()
                setIsSendToCashierModalOpen(false)
                setOrderToSendToCashier(null)
            } else {
                const err = await res.json()
                setNotification({ type: 'error', message: err.error || 'Failed to send to cashier' })
            }
        } catch (err) {
            setNotification({ type: 'error', message: t('waiter.status_update_failed') || 'Error updating status' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClaimOrder = async (orderId: string) => {
        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/orders/${orderId}/claim`, {
                method: 'PATCH'
            })

            if (res.ok) {
                setNotification({ type: 'success', message: t('waiter.order_taken') || 'Order assigned correctly' })
                await fetchData()
            } else {
                const err = await res.json()
                setNotification({ type: 'error', message: err.error || t('waiter.take_order_error') || 'Error claiming order' })
            }
        } catch (err) {
            setNotification({ type: 'error', message: t('waiter.take_order_error') })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdateItemStatus = async (itemId: string, status: string) => {
        try {
            const res = await fetch(`/api/orders/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })

            if (res.ok) {
                setNotification({ type: 'success', message: t('waiter.status_updated') || 'Status updated' })
                fetchData()
            } else {
                console.error('Failed to update status')
                setNotification({ type: 'error', message: t('waiter.status_update_failed') })
            }
        } catch (err) {
            console.error('Error updating status:', err)
            setNotification({ type: 'error', message: t('waiter.status_update_failed') })
        }
    }

    const handleServeAll = async (items: ReadyItem[]) => {
        setIsSubmitting(true)
        try {
            // Sequential updates for now (simple implementation)
            // Ideally should be a batch API endpoint
            await Promise.all(items.map(item =>
                fetch(`/api/orders/items/${item.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'servido' })
                })
            ))
            setNotification({ type: 'success', message: t('waiter.all_served') || 'All items served' })
            fetchData()
        } catch (err) {
            console.error('Error serving all:', err)
            setNotification({ type: 'error', message: t('waiter.error_serving') })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Derived state: Ready Items
    const readyItems: ReadyItem[] = activeOrders.flatMap(order =>
        order.items
            .filter((item: ReadyItem) => item.status === 'listo')
            .map((item: ReadyItem) => ({ ...item, order }))
    )

    // --- CART LOGIC ---

    const addToCart = (item: MenuItem) => {
        const inCart = cart.filter(i => i.id === item.id).reduce((acc, i) => acc + i.quantity, 0)
        if (inCart >= item.calculatedStock) return

        setCart(prev => {
            // Check if item exists with same notes (empty by default)
            const existingIndex = prev.findIndex(i => i.id === item.id && i.notes === '')
            if (existingIndex >= 0) {
                const newCart = [...prev]
                newCart[existingIndex] = {
                    ...newCart[existingIndex],
                    quantity: newCart[existingIndex].quantity + 1
                }
                return newCart
            }
            return [...prev, {
                ...item,
                cartItemId: Math.random().toString(36).substring(7),
                quantity: 1,
                notes: ''
            }]
        })
        setNotification({ type: 'success', message: t('waiter.item_added', { name: item.name }) || `${item.name} added` })
    }

    const updateQuantity = (cartItemId: string, delta: number) => {
        setCart(prev => {
            const item = prev.find(i => i.cartItemId === cartItemId)
            if (!item) return prev

            const inCartTotal = prev.filter(i => i.id === item.id).reduce((acc, i) => acc + i.quantity, 0)
            const available = item.calculatedStock - inCartTotal

            if (delta > 0 && available < delta) return prev // Cannot add if not available

            return prev.map(i => {
                if (i.cartItemId === cartItemId) {
                    const newQty = i.quantity + delta
                    return newQty > 0 ? { ...i, quantity: newQty } : i
                }
                return i
            })
        })
    }

    const removeFromCart = (cartItemId: string) => {
        setCart(prev => prev.filter(item => item.cartItemId !== cartItemId))
    }

    const updateItemNotes = (cartItemId: string, notes: string) => {
        setCart(prev => prev.map(item =>
            item.cartItemId === cartItemId ? { ...item, notes } : item
        ))
    }

    const splitItem = (cartItemId: string) => {
        setCart(prev => {
            const index = prev.findIndex(i => i.cartItemId === cartItemId)
            if (index === -1) return prev

            const item = prev[index]
            if (item.quantity <= 1) return prev

            // Create new item (single)
            const newItem = {
                ...item,
                quantity: 1,
                cartItemId: Math.random().toString(36).substring(7)
            }

            // Reduce original item quantity
            const updatedOriginal = { ...item, quantity: item.quantity - 1 }

            const newCart = [...prev]
            newCart[index] = updatedOriginal
            newCart.splice(index + 1, 0, newItem) // Insert right after
            return newCart
        })
    }

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    const submitOrder = async () => {
        if (!selectedTable || cart.length === 0) return

        setIsSubmitting(true)
        try {
            const payload = {
                tableId: selectedTable.id,
                tableNumber: selectedTable.number,
                orderId: activeOrderId,
                items: cart.map(item => ({
                    menuItemId: item.id,
                    quantity: item.quantity,
                    notes: item.notes
                })),
                orderNote
            }

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                setCart([])
                setOrderNote('')
                setIsCartOpen(false)
                setSelectedTable(null) // Go back to table selection
                setNotification({
                    type: 'success',
                    message: activeOrderId
                        ? (t('waiter.order_updated') || 'Order updated successfully!')
                        : (t('waiter.order_created') || 'Order created successfully!')
                })
                await fetchData() // Refresh data (e.g. table status)
            } else {
                const error = await res.json()
                if (error.details) {
                    const detailMsg = error.details.map((d: any) => `${d.name}: pedido ${d.requested}, disponible ${d.available}`).join('\n')
                    setNotification({ type: 'error', message: `${t('waiter.low_stock')}:\n${detailMsg}` })
                } else {
                    setNotification({ type: 'error', message: error.error || 'Failed to submit order' })
                }
                await fetchData()
            }
        } catch (err) {
            console.error('Submit order error:', err)
            setNotification({
                type: 'error',
                message: activeOrderId ? t('waiter.update_order_failed') : t('waiter.create_order_failed')
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- RENDER ---

    const filteredItems = selectedCategory === 'all'
        ? menuItems
        : menuItems.filter(item => item.category === selectedCategory)

    // Get current items for editing and group them
    const currentOrderItems = activeOrderId
        ? activeOrders.find(o => o.id === activeOrderId)?.items || []
        : []

    const groupedCurrentItems = currentOrderItems.reduce((acc: any[], item: any) => {
        const existing = acc.find(i => i.menuItemId === item.menuItemId)
        if (existing) {
            existing.totalQuantity += item.quantity
            existing.items.push(item)
        } else {
            acc.push({
                menuItemId: item.menuItemId,
                name: item.menuItem?.name,
                totalQuantity: item.quantity,
                items: [item]
            })
        }
        return acc
    }, [])

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // Helper to update existing item note
    const saveExistingItemNote = async (itemId: string) => {
        try {
            const res = await fetch(`/api/orders/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: tempNoteValue })
            })

            if (res.ok) {
                setNotification({ type: 'success', message: t('waiter.note_updated') || 'Note updated' })
                setEditingNoteId(null)
                fetchData() // Simple refresh to update local state
            } else {
                setNotification({ type: 'error', message: t('waiter.note_update_failed') || 'Failed to update note' })
            }
        } catch (err) {
            setNotification({ type: 'error', message: t('waiter.note_update_error') || 'Error updating note' })
        }
    }

    if (status === 'loading' || (loading && !tables.length)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 relative">
            <WaiterHeader
                selectedTable={selectedTable}
                setSelectedTable={setSelectedTable}
                setCart={setCart}
                setActiveOrderId={setActiveOrderId}
                setOrderNote={setOrderNote}
                t={t}
                router={router}
                slug={slug}
                setIsMenuQRModalOpen={setIsMenuQRModalOpen}
            />

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${notification.type === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle2 size={18} /> : <Activity size={18} />}
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}

            <div className="p-4">
                {/* VIEW: TABLE SELECTION */}
                {!selectedTable && (
                    <>
                        <TableSelection
                            tables={tables}
                            activeOrders={activeOrders}
                            t={t}
                            setSelectedTable={setSelectedTable}
                            setActiveOrderId={setActiveOrderId}
                            setCart={setCart}
                            setOrderNote={setOrderNote}
                            setNotification={setNotification}
                        />
                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                            <ReadyItems
                                readyItems={readyItems}
                                t={t}
                                handleServeAll={handleServeAll}
                                isSubmitting={isSubmitting}
                            />
                            <ActiveOrders
                                activeOrders={activeOrders}
                                t={t}
                                handleEditOrder={handleEditOrder}
                                setOrderToCancel={setOrderToCancel}
                                setIsCancelModalOpen={setIsCancelModalOpen}
                                onSendToCashier={(order) => {
                                    setOrderToSendToCashier(order)
                                    setIsSendToCashierModalOpen(true)
                                }}
                                onClaimOrder={handleClaimOrder}
                                onServeItem={(itemId) => handleUpdateItemStatus(itemId, 'servido')}
                                onServeAll={handleServeAll}
                                slug={slug}
                            />
                        </div>
                    </>
                )}

                {/* VIEW: MENU & CATEGORIES */}
                {selectedTable && (
                    <div>
                        {/* Current Items (Editing) */}
                        {Boolean(activeOrderId) && currentOrderItems.length > 0 && (
                            <div className="mb-6 bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4 border border-orange-100 dark:border-orange-900/30">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-3 text-sm flex items-center gap-2">
                                    <ClipboardList size={16} className="text-orange-600" />
                                    {t('waiter.current_items') || 'Current Items'}
                                </h3>
                                <div className="space-y-3">
                                    {groupedCurrentItems.map((group: any) => (
                                        <div key={group.menuItemId} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                                            {/* Group Header */}
                                            <button
                                                onClick={() => toggleGroup(group.menuItemId)}
                                                className="w-full flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-orange-600 bg-orange-50 dark:bg-orange-950 px-2 py-0.5 rounded text-xs">
                                                        {group.totalQuantity}x
                                                    </span>
                                                    <span className="font-bold text-slate-800 dark:text-white text-sm">
                                                        {group.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    {group.items.some((i: any) => i.notes) && <Edit3 size={14} className="text-orange-500" />}
                                                    <ChevronDown size={18} className={`transition-transform duration-300 ${expandedGroups.has(group.menuItemId) ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>

                                            {/* Individual Items Loop (Expanded) */}
                                            {expandedGroups.has(group.menuItemId) && (
                                                <div className="border-t border-slate-50 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50 bg-slate-50/30 dark:bg-slate-900/10 animate-in fade-in slide-in-from-top-1">
                                                    {group.items.map((item: any) => (
                                                        <div key={item.id} className="p-3">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <div>
                                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                                                        {item.quantity}x
                                                                    </span>
                                                                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                                                                        ID: {item.id.split('-')[0].toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase border ${item.status === 'listo' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                    item.status === 'en_cocina' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                                    }`}>
                                                                    {t(`status.${item.status}`)}
                                                                </span>
                                                            </div>

                                                            <div className="mt-2 bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                {editingNoteId === item.id ? (
                                                                    <div className="flex flex-col gap-2">
                                                                        <textarea
                                                                            value={tempNoteValue}
                                                                            onChange={(e) => setTempNoteValue(e.target.value)}
                                                                            className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-orange-500 min-h-[60px] text-slate-900 dark:text-white font-medium"
                                                                            placeholder={t('waiter.add_note_placeholder')}
                                                                            autoFocus
                                                                        />
                                                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                                                            <button
                                                                                onClick={() => setEditingNoteId(null)}
                                                                                className="py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                                                                            >
                                                                                {t('modal.cancel')}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => saveExistingItemNote(item.id)}
                                                                                className="py-1.5 text-xs font-bold bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                                                            >
                                                                                {t('modal.save')}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-xs text-slate-500 italic flex-1 truncate">
                                                                            {item.notes || t('waiter.no_notes')}
                                                                        </p>
                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingNoteId(item.id)
                                                                                    setTempNoteValue(item.notes || '')
                                                                                }}
                                                                                className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-md"
                                                                            >
                                                                                <Edit3 size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setItemToDelete(item.id)
                                                                                    setIsDeleteModalOpen(true)
                                                                                }}
                                                                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <CategorySelector
                            categories={categories}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                            t={t}
                        />

                        <MenuList
                            items={filteredItems}
                            addToCart={addToCart}
                            cart={cart}
                        />

                        {/* Overlay Cart */}
                        <CartOverlay
                            cart={cart}
                            isCartOpen={isCartOpen}
                            setIsCartOpen={setIsCartOpen}
                            t={t}
                            removeFromCart={removeFromCart}
                            updateQuantity={updateQuantity}
                            splitItem={splitItem}
                            updateItemNotes={updateItemNotes}
                            orderNote={orderNote}
                            setOrderNote={setOrderNote}
                            cartTotal={cartTotal}
                            submitOrder={submitOrder}
                            isSubmitting={isSubmitting}
                            selectedTable={selectedTable}
                        />

                        {/* Active Orders & Ready Items Section for Waiter */}
                    </div>
                )}
            </div>

            {/* Confirmation Modal for Deletion */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false)
                    setItemToDelete(null)
                }}
                onConfirm={handleDeleteItem}
                title={t('modal.delete')}
                message={t('waiter.confirm_delete_item')}
                loading={isSubmitting}
            />

            {/* Confirmation Modal for Order Cancellation */}
            <ConfirmationModal
                isOpen={isCancelModalOpen}
                onClose={() => {
                    setIsCancelModalOpen(false)
                    setOrderToCancel(null)
                }}
                onConfirm={handleCancelOrder}
                title={t('waiter.cancel_order')}
                message={t('waiter.confirm_cancel_order')}
                loading={isSubmitting}
                isDestructive={true}
            />

            {/* Confirmation Modal for Sending to Cashier */}
            <ConfirmationModal
                isOpen={isSendToCashierModalOpen}
                onClose={() => {
                    setIsSendToCashierModalOpen(false)
                    setOrderToSendToCashier(null)
                }}
                onConfirm={handleSendToCashier}
                title={t('bill.send_to_cashier')}
                message={t('waiter.confirm_send_to_cashier')}
                loading={isSubmitting}
                isDestructive={false}
                confirmText={t('common.confirm')}
            />

            {/* QR Modal for Menu - Global */}
            <QRModal
                isOpen={isMenuQRModalOpen}
                onClose={() => setIsMenuQRModalOpen(false)}
                title={t('staff.tables.menu_qr') || 'QR del Menú'}
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/${slug}/menu`}
                subtitle={t('staff.tables.scan_instruction')}
            />
        </div>
    )
}
