import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { publishOrderUpdate } from '@/lib/ably'

export async function PUT(
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
        const { status } = body

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 })
        }

        // Validate status
        const validStatuses = ['nuevo', 'en_cocina', 'listo', 'servido', 'listo_pagar', 'pagado', 'cancelado']
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true, role: true }
        })

        if (!user?.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        // Transaction to update order and potential table update
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get current order to find table
            const currentOrder = await tx.order.findUnique({
                where: { id, organizationId: user.organizationId! },
                select: { tableNumber: true, status: true, total: true }
            })

            if (!currentOrder) {
                throw new Error('Order not found')
            }

            // 2. Update Order Status
            let newStatus = status

            // Auto-advance to 'pagado' if fully paid and moving to 'listo_pagar'
            if (status === 'listo_pagar') {
                const transactions = await tx.transaction.findMany({
                    where: { orderId: id, completed: true }
                })
                const totalPaid = transactions.reduce((acc, t) => acc + Number(t.amount), 0)
                const total = Number(currentOrder.total) || 0

                if (total > 0 && totalPaid >= (total - 0.01)) {
                    newStatus = 'pagado'
                }
            }

            const updatedOrder = await tx.order.update({
                where: { id },
                data: { status: newStatus }
            })

            // 3. Handle Table Unblocking if Paying or Cancelling
            if (['pagado', 'cancelado'].includes(newStatus)) {
                const otherActiveOrders = await tx.order.findFirst({
                    where: {
                        tableNumber: currentOrder.tableNumber,
                        organizationId: user.organizationId!,
                        NOT: { id }, // Exclude current order
                        status: {
                            notIn: ['pagado', 'cancelado', 'cerrado'] // Active statuses
                        }
                    }
                })

                if (!otherActiveOrders) {
                    // No other active orders -> Unblock table and free it
                    // Find table logic (Need ID)
                    const table = await tx.table.findFirst({
                        where: {
                            number: currentOrder.tableNumber,
                            organizationId: user.organizationId!
                        }
                    })

                    if (table) {
                        await tx.table.update({
                            where: { id: table.id },
                            data: {
                                status: 'disponible'
                            }
                        })
                    }
                }
            }

            return updatedOrder
        })

        // Broadcast update via Ably
        await publishOrderUpdate(user.organizationId!, 'order-update', {
            type: 'status-update',
            orderId: id,
            status,
            tableNumber: result.tableNumber
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error updating order status:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update status' },
            { status: 500 }
        )
    }
}
