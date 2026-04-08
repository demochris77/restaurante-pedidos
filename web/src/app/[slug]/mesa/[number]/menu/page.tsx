'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import {
    Utensils,
    Search,
    ShoppingCart,
    Plus,
    Minus,
    X,
    ChevronLeft,
    Loader2,
    Activity,
    Scissors,
    Trash2,
    MessageSquarePlus
} from 'lucide-react'
import Ably from 'ably'
import { useLanguage } from '@/components/providers/language-provider'
import { FloatingToggles } from '@/components/common/FloatingToggles'
import { getSecurityStatus } from '../actions'

interface MenuItem {
    id: string
    name: string
    price: number
    description: string | null
    imageUrl: string | null
    category: string
    available: boolean
    calculatedStock: number // Added field
}

interface CartItem extends MenuItem {
    cartItemId: string
    quantity: number
    notes: string
}

export default function CustomerMenuPage() {
    const { t } = useLanguage()
    const params = useParams()
    const router = useRouter()

    const slug = params.slug as string
    const tableNumber = params.number as string

    const [loading, setLoading] = useState(true)
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [cart, setCart] = useState<CartItem[]>([])
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [hasActiveOrder, setHasActiveOrder] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            // Fetch menu items for this organization
            const res = await fetch(`/api/public/organization/menu?slug=${slug}`)
            if (res.ok) {
                const data = await res.json()
                setMenuItems(data.items || [])
                const cats = Array.from(new Set((data.items || []).map((i: MenuItem) => i.category))) as string[]
                setCategories(cats)
            }

            // Check for active order on this table
            const orderRes = await fetch(`/api/public/orders/active?slug=${slug}&table=${tableNumber}`)
            if (orderRes.ok) {
                const orderData = await orderRes.json()
                if (orderData.active) {
                    setHasActiveOrder(true)
                }
            }
        } catch (error) {
            console.error('Error fetching menu:', error)
        } finally {
            setLoading(false)
        }
    }, [slug, tableNumber])

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const secStatus = await getSecurityStatus(slug, tableNumber)
                if (secStatus.required) {
                    router.replace(`/${slug}/mesa/${tableNumber}`)
                    return
                }
                fetchData()
            } catch (err) {
                console.error('Access check failed:', err)
                fetchData()
            }
        }
        checkAccess()
    }, [slug, tableNumber, router, fetchData])

    // Real-time stock updates
    useEffect(() => {
        if (!slug) return

        // For public users we use a simpler Ably setup if available
        // or we poll. Since this app has Ably, let's try to use it if public auth is allowed
        // or just rely on the manual fetch after order creation which is broadcasted.

        let ably: Ably.Realtime | null = null
        try {
            // Check if we have a way to authenticate public users, if not, we fallback to polling or manual refresh
            ably = new Ably.Realtime({ authUrl: '/api/ably/auth' })
            // Note: If /api/ably/auth requires login, this might fail for customers.
            // But usually organizationId is needed.

            // For now, let's just make sure we refresh when an order is created
            // We'll need a public organization channel
        } catch (e) {
            console.warn('Ably not available for public', e)
        }

        return () => {
            ably?.close()
        }
    }, [slug])

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description?.toLowerCase().includes(searchQuery.toLowerCase()))
        return matchesCategory && matchesSearch && item.available
    })

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            // Check if item exists with same notes (empty by default)
            const existingIndex = prev.findIndex(i => i.id === item.id && i.notes === '')
            if (existingIndex >= 0) {
                const newCart = [...prev]
                const inCart = newCart[existingIndex].quantity
                if (inCart >= item.calculatedStock) return prev

                newCart[existingIndex] = {
                    ...newCart[existingIndex],
                    quantity: inCart + 1
                }
                return newCart
            }

            if (item.calculatedStock <= 0) return prev

            return [...prev, {
                ...item,
                cartItemId: Math.random().toString(36).substring(7),
                quantity: 1,
                notes: ''
            }]
        })
    }

    const updateQuantity = (cartItemId: string, delta: number) => {
        setCart(prev => {
            const index = prev.findIndex(i => i.cartItemId === cartItemId)
            if (index === -1) return prev

            const item = prev[index]
            const newQty = item.quantity + delta

            if (newQty <= 0) {
                return prev.filter(i => i.cartItemId !== cartItemId)
            }

            // Check stock
            if (delta > 0) {
                // Find total quantity of this item in cart
                const totalInCart = prev
                    .filter(i => i.id === item.id)
                    .reduce((acc, i) => acc + i.quantity, 0)

                if (totalInCart >= item.calculatedStock) return prev
            }

            const newCart = [...prev]
            newCart[index] = { ...item, quantity: newQty }
            return newCart
        })
    }

    const removeFromCart = (cartItemId: string) => {
        setCart(prev => prev.filter(i => i.cartItemId !== cartItemId))
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
            newCart.splice(index + 1, 0, newItem)
            return newCart
        })
    }

    const updateItemNotes = (cartItemId: string, notes: string) => {
        setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, notes } : i))
    }

    const sendOrder = async () => {
        if (cart.length === 0) return

        setLoading(true)
        try {
            const res = await fetch('/api/public/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug,
                    tableNumber,
                    items: cart.map(item => ({
                        id: item.id,
                        quantity: item.quantity,
                        notes: item.notes
                    }))
                })
            })

            if (res.ok) {
                setCart([])
                setIsCartOpen(false)
                router.push(`/${slug}/mesa/${tableNumber}/status`)
            } else {
                const error = await res.json()
                if (error.details) {
                    const detailMsg = error.details.map((d: any) => `${d.name}: pedido ${d.requested}, disponible ${d.available}`).join('\n')
                    alert(`${t('waiter.low_stock')}:\n${detailMsg}`)
                } else {
                    alert(error.error || 'Error al enviar el pedido')
                }
                // Refresh menu to get latest stock
                fetchData()
            }
        } catch (error) {
            console.error('Error sending order:', error)
            alert('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="animate-spin text-orange-600" size={48} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 space-y-4">
                <div className="flex items-center justify-between skiptranslate">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ChevronLeft size={24} className="text-slate-600 dark:text-slate-400" />
                    </button>
                    <div className="text-center">
                        <h1 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">{t('common.table')} {tableNumber}</h1>
                        <p className="text-[10px] text-slate-500 font-medium">MENU DIGITAL</p>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                {hasActiveOrder && (
                    <button
                        onClick={() => router.push(`/${slug}/mesa/${tableNumber}/status`)}
                        className="w-full py-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl font-bold flex items-center justify-center gap-2 border border-orange-200 dark:border-orange-800/50 animate-pulse skiptranslate"
                    >
                        <Activity size={18} />
                        {t('customer.active_order_banner')}
                    </button>
                )}

                <div className="relative skiptranslate">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={t('waiter.search_dishes')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white transition-all shadow-inner"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all skiptranslate ${selectedCategory === 'all'
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        {t('category.all')}
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat
                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </header>

            {/* Menu Grid */}
            <main className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredItems.map(item => (
                    <div
                        key={item.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 flex gap-3 shadow-sm hover:shadow-md transition-shadow group active:scale-[0.98]"
                        onClick={() => addToCart(item)}
                    >
                        <div className="w-24 h-24 rounded-xl bg-orange-50 dark:bg-orange-950/20 overflow-hidden shrink-0 relative">
                            {item.imageUrl ? (
                                <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-orange-200 dark:text-orange-900/50">
                                    <Utensils size={32} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex-1">{item.name}</h3>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 border skiptranslate ${(item.calculatedStock - (cart.find(i => i.id === item.id)?.quantity || 0)) <= 0
                                        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                        }`}>
                                        {(item.calculatedStock - (cart.find(i => i.id === item.id)?.quantity || 0)) > 0
                                            ? `${(item.calculatedStock - (cart.find(i => i.id === item.id)?.quantity || 0))} und`
                                            : t('admin.menu.unavailable')}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="font-bold text-orange-600 dark:text-orange-400 skiptranslate">
                                    ${parseFloat(item.price.toString()).toLocaleString()}
                                </span>
                                {(item.calculatedStock - (cart.find(i => i.id === item.id)?.quantity || 0)) > 0 ? (
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-full">
                                        <Plus size={16} />
                                    </div>
                                ) : (
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 rounded-full">
                                        <X size={16} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </main>

            {/* Empty State */}
            {filteredItems.length === 0 && (
                <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <Search size={32} />
                    </div>
                    <p className="text-slate-500 font-medium font-bold">No encontramos platos...</p>
                </div>
            )}

            {/* Floating Cart Button */}
            {cart.length > 0 && (
                <button
                    onClick={() => setIsCartOpen(true)}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-orange-600 text-white rounded-2xl py-4 px-6 shadow-2xl shadow-orange-600/30 flex items-center justify-between animate-in slide-in-from-bottom-10 duration-500 z-40 skiptranslate"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <ShoppingCart size={24} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs opacity-80 font-bold uppercase tracking-widest">{t('waiter.order_summary')}</p>
                            <p className="font-bold">{cart.reduce((acc, i) => acc + i.quantity, 0)} items</p>
                        </div>
                    </div>
                    <p className="text-xl font-extrabold">
                        ${cart.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString()}
                    </p>
                </button>
            )}

            {/* Cart Modal Overlay - Logic will be implemented next */}
            {isCartOpen && (
                <div
                    className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setIsCartOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-lg mx-auto rounded-t-[2.5rem] shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-500"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center skiptranslate">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('waiter.order_summary')}</h2>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.map(item => (
                                <div key={item.cartItemId} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0 relative border border-slate-100 dark:border-slate-700">
                                            {item.imageUrl ? (
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <Utensils size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900 dark:text-white">{item.name}</h4>
                                            <p className="text-orange-600 font-bold text-sm">${item.price.toLocaleString()}</p>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.cartItemId)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1 hover:text-orange-600 transition-colors">
                                                <Minus size={18} />
                                            </button>
                                            <span className="font-bold w-6 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1 hover:text-orange-600 transition-colors">
                                                <Plus size={18} />
                                            </button>
                                        </div>

                                        {item.quantity > 1 && (
                                            <button
                                                onClick={() => splitItem(item.cartItemId)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 transition-colors"
                                            >
                                                <Scissors size={14} />
                                                {t('waiter.split') || 'Dividir'}
                                            </button>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <MessageSquarePlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder={t('waiter.add_note_placeholder') || 'Agregar nota...'}
                                            value={item.notes}
                                            onChange={(e) => updateItemNotes(item.cartItemId, e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 space-y-4 skiptranslate">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">
                                    ${cart.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString()}
                                </span>
                            </div>
                            <button
                                className="w-full py-4 bg-orange-600 text-white rounded-2xl text-xl font-bold shadow-xl shadow-orange-600/30 hover:bg-orange-700 transition-colors disabled:opacity-50"
                                onClick={sendOrder}
                                disabled={loading}
                            >
                                {loading ? t('loading.processing') : t('waiter.send_order')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <FloatingToggles />
        </div>
    )
}
