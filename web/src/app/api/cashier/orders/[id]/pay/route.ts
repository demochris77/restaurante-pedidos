import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { publishOrderUpdate } from '@/lib/ably'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { amount, tipAmount, paymentMethod, orderItemIds } = body

        if (!amount || !paymentMethod) {
            return NextResponse.json({ error: 'Amount and payment method are required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true }
        })

        if (!user?.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        // Run transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get current order
            const order = await tx.order.findUnique({
                where: { id, organizationId: user.organizationId! },
                include: { transactions: true }
            })

            if (!order) {
                throw new Error('Order not found')
            }

            // 2. Create Transaction Record
            const transaction = await tx.transaction.create({
                data: {
                    orderId: id,
                    cashierId: session.user.id,
                    amount: amount,
                    tipAmount: tipAmount || 0,
                    paymentMethod: paymentMethod, // 'efectivo', 'tarjeta', etc.
                    completed: true
                }
            })

            // 3. If specific items are being paid, link them to the transaction
            // 3. If specific items are being paid, link them to the transaction
            const items = body.items // [{ id: string, quantity: number }]

            if (items && Array.isArray(items) && items.length > 0) {
                for (const itemToPay of items) {
                    const originalItem = await tx.orderItem.findUnique({
                        where: { id: itemToPay.id, orderId: id }
                    })

                    if (!originalItem || originalItem.transactionId) continue; // Skip if not found or already paid

                    const payQty = Number(itemToPay.quantity)

                    if (payQty >= originalItem.quantity) {
                        // Full payment of this line item
                        await tx.orderItem.update({
                            where: { id: originalItem.id },
                            data: { transactionId: transaction.id }
                        })
                    } else if (payQty > 0) {
                        // Partial payment -> Split item

                        // A. Decrement original item quantity
                        await tx.orderItem.update({
                            where: { id: originalItem.id },
                            data: { quantity: originalItem.quantity - payQty }
                        })

                        // B. Create new PAID item with the paid quantity
                        // We need to omit id, createdAt, updatedAt to let Prisma/DB handle them
                        const { id: _id, createdAt: _createdAt, ...itemData } = originalItem

                        await tx.orderItem.create({
                            data: {
                                ...itemData,
                                quantity: payQty,
                                transactionId: transaction.id,
                            }
                        })
                    }
                }
            } else if (orderItemIds && Array.isArray(orderItemIds) && orderItemIds.length > 0) {
                // Fallback for old frontend sending orderItemIds (full items)
                await tx.orderItem.updateMany({
                    where: {
                        id: { in: orderItemIds },
                        orderId: id,
                        transactionId: null
                    },
                    data: {
                        transactionId: transaction.id
                    }
                })
            }

            // 4. Calculate total paid including this new transaction
            // Note: We use order.transactions (previous) + current amount
            const previousPaid = order.transactions
                .filter(t => t.completed)
                .reduce((acc, t) => acc + Number(t.amount), 0)

            const totalPaid = previousPaid + Number(amount)
            const orderTotal = Number(order.total)

            // 5. Check if fully paid
            // We allow a small margin for floating point errors
            const isFullyPaid = totalPaid >= (orderTotal - 0.01)

            let newStatus = order.status

            // 6. Status Transition Logic
            // If fully paid, we move to 'pagado' ONLY if it was already 'listo_pagar'
            // OR if it's a "Pay in Advance" scenario, we might keep it or update it?
            // Requirement: "El pago adelantado no cambiara el estado del pedido pero si cuando lo manden a caja automaticamente se pagara"
            // So if order.status is 'listo_pagar' AND isFullyPaid -> 'pagado'

            if (isFullyPaid) {
                newStatus = 'pagado'

                await tx.order.update({
                    where: { id },
                    data: {
                        status: 'pagado',
                        tipAmount: { increment: tipAmount || 0 }
                    }
                })

                // Unblock table if needed (similar logic to status route)
                const otherActiveOrders = await tx.order.findFirst({
                    where: {
                        tableNumber: order.tableNumber,
                        organizationId: user.organizationId!,
                        NOT: { id },
                        status: { notIn: ['pagado', 'cancelado', 'cerrado'] }
                    }
                })

                if (!otherActiveOrders) {
                    const table = await tx.table.findFirst({
                        where: {
                            number: order.tableNumber,
                            organizationId: user.organizationId!
                        }
                    })
                    if (table) {
                        await tx.table.update({
                            where: { id: table.id },
                            data: { status: 'disponible' }
                        })
                    }
                }
            } else {
                // Not fully paid yet, but we should still record the tip if any
                if (tipAmount && Number(tipAmount) > 0) {
                    await tx.order.update({
                        where: { id },
                        data: {
                            tipAmount: { increment: tipAmount }
                        }
                    })
                }
            }

            return { transaction, newStatus, isFullyPaid, order }
        })

        // Broadcast update
        if (result.newStatus !== 'pagado') {
            // Order updated (active) but maybe paid?
            await publishOrderUpdate(user.organizationId!, 'order-update', {
                type: 'payment-update',
                orderId: id,
                tableNumber: result.order.tableNumber,
                transaction: result.transaction
            })
        } else {
            // Order completed
            await publishOrderUpdate(user.organizationId!, 'order-update', {
                type: 'status-update',
                orderId: id,
                tableNumber: result.order.tableNumber,
                status: 'pagado'
            })
        }

        return NextResponse.json(result)

    } catch (error) {
        console.error('Error processing payment:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process payment' },
            { status: 500 }
        )
    }
}
