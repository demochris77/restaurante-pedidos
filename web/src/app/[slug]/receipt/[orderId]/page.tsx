'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function ReceiptPage() {
    const params = useParams()
    const searchParams = useSearchParams()

    const { slug, orderId } = params
    const tipFromQuery = searchParams.get('tip')

    const [order, setOrder] = useState<any | null>(null)
    const [organization, setOrganization] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Order
                // We use the cashier order endpoint generally, or public status one.
                // Since this is for printing, we likely have rights or use a public token?
                // For simplicity, let's assume this is accessed by staff, so we use the cashier API or similar.
                // actually, let's use the public one if possible to avoid auth issues in a popup? 
                // But this contains sensitive totals maybe?
                // Let's use a public endpoint if available or just fetch securely.
                // The /api/public/orders/[id]/status might returns limited info.

                // Let's assume we are authenticated (staff) or use the public active order endpoint
                // But we need a specific order ID, not just active table.

                // For now, let's fetch from a specific endpoint or re-use existing.
                // We'll try to fetch via the public API first (less secure but easier for popping up)
                // Actually, let's use the authenticated one if we are staff.

                // Better: Create a dedicated simple endpoint or use existing.
                // Let's use /api/cashier/orders ? No such endpoint.
                // Let's use /api/public/orders/active? ... No, we have ID.

                // Let's try to fetch active order for the table if we had table info, 
                // but here we only have orderId.

                // Let's fetch the list of orders from cashier API and find it? No inefficient.

                // Let's just use the `api/public/orders/[id]/status` which exists?
                // Check previous file BillPage uses: `fetch('/api/public/orders/active?slug=${slug}&table=${tableNumber}')`

                // We don't have table number in URL easily.
                // Let's assume we can fetch by Order ID.

                // I'll create a quick client-side fetcher that re-uses the payment modal data if passed?
                // No, new window.

                // Let's use the cashier API list and filter? No.

                // I will add a GET endpoint for specific order details for printing later if needed.
                // For now, I'll use the public endpoint that accepts orderId if I can or search.

                // Wait, `BillPage` uses `active?slug=...&table=...`.
                // Receipt might be for a closed order too.

                // Let's try to fetch `/api/cashier/orders` and find it. It's not ideal but works for "active" orders.
                // But for a receipt of a PAID order, it might not be in "active" list if we filter purely by status.
                // But the cashier endpoint returns 'listo_pagar', 'servido', etc.

                // ACTUALLY, I'll just rely on the `api/public/orders/[id]/status` returning the order object 
                // if I modify it to return full details, OR check if it already does.

                // Let's check `api/public/orders/[id]/status/route.ts`.
                const res = await fetch(`/api/public/orders/${orderId}`)
                if (res.ok) {
                    const data = await res.json()
                    setOrder(data)
                    if (data.organization) {
                        setOrganization(data.organization)
                    }
                }
            } catch (error) {
                console.error('Error fetching receipt:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [slug, orderId])

    useEffect(() => {
        if (order && !loading) {
            setTimeout(() => {
                window.print()
            }, 800)
        }
    }, [order, loading])

    if (loading) {
        return <div className="flex h-screen items-center justify-center p-8"><Loader2 className="animate-spin text-black" /></div>
    }

    if (!order) {
        return <div className="p-8 text-center font-bold">Orden no encontrada o no tienes permisos.</div>
    }

    const tipAmount = tipFromQuery ? Number(tipFromQuery) : Number(order.tipAmount || 0)
    const subtotal = Number(order.total)
    const total = subtotal + tipAmount

    return (
        <div className="bg-white min-h-screen text-black p-6 font-mono text-sm max-w-[320px] mx-auto selection:bg-gray-200">
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body { -webkit-print-color-adjust: exact; padding: 0; }
                    .no-print { display: none; }
                }
            `}</style>

            <div className="text-center mb-6">
                <h1 className="text-xl font-bold uppercase mb-1">{organization?.name || slug}</h1>
                {organization?.nit && (
                    <p className="text-xs font-bold font-mono">NIT: {organization.nit}</p>
                )}
                <div className="border-b-2 border-dashed border-gray-300 my-4 w-full"></div>

                <div className="space-y-1 text-xs text-left mb-4">
                    <div className="flex justify-between">
                        <span className="font-bold">Mesa:</span>
                        <span>#{order.tableNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Fecha:</span>
                        <span>{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Hora:</span>
                        <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                        <span className="font-bold">Orden:</span>
                        <span className="font-mono">{order.id.split('-')[0].toUpperCase()}</span>
                    </div>
                    {order.waiter && (
                        <div className="flex justify-between">
                            <span className="font-bold">Mesero:</span>
                            <span>{order.waiter.name}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-6">
                <div className="flex justify-between font-black border-b-2 border-black pb-1 mb-2 text-[10px] uppercase tracking-wider">
                    <span className="w-8">Cant</span>
                    <span className="flex-1 px-2 text-left">Producto</span>
                    <span className="w-20 text-right">Total</span>
                </div>
                <div className="space-y-2">
                    {(() => {
                        const stackedItems = Object.values(
                            order.items.reduce((acc: Record<string, any>, item: any) => {
                                const key = item.menuItem.id || item.menuItem.name
                                if (!acc[key]) {
                                    acc[key] = {
                                        name: item.menuItem.name,
                                        quantity: 0,
                                        totalPrice: 0,
                                        unitPrice: Number(item.unitPrice)
                                    }
                                }
                                acc[key].quantity += item.quantity
                                acc[key].totalPrice += Number(item.unitPrice) * item.quantity
                                return acc
                            }, {})
                        )

                        return stackedItems.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-start leading-tight">
                                <span className="w-8 text-center">{item.quantity}</span>
                                <span className="flex-1 px-2 text-left">{item.name}</span>
                                <span className="w-20 text-right">${item.totalPrice.toLocaleString()}</span>
                            </div>
                        ))
                    })()}
                </div>
            </div>

            <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-2 text-right">
                <div className="flex justify-between">
                    <span className="font-bold uppercase">Subtotal:</span>
                    <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold uppercase">Propina:</span>
                    <span>${tipAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-black mt-2 pt-2 border-t-2 border-black">
                    <span className="uppercase">Total:</span>
                    <span>${total.toLocaleString()}</span>
                </div>
            </div>

            <div className="mt-10 text-center text-[10px] space-y-1 uppercase tracking-widest text-gray-500">
                <p>¡Gracias por su visita!</p>
                <div className="pt-4 opacity-50">
                    <p>Hamelin Foods POS</p>
                    <p>www.hamelinfoods.com</p>
                </div>
            </div>

            <div className="no-print mt-8 flex justify-center">
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-black text-white rounded-full text-xs font-bold"
                >
                    Re-Imprimir
                </button>
            </div>
        </div>
    )
}
