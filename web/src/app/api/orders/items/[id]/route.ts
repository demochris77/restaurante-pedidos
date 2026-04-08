
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { publishOrderUpdate } from '@/lib/ably'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Params is a Promise in Next.js 15+
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params // Await params

        const orderItem = await prisma.orderItem.findUnique({
            where: { id },
            include: { order: true }
        })

        if (!orderItem) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // Check organization
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true }
        })

        if (orderItem.order.organizationId !== user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Only allow delete if status is 'new' or 'pending' (check with user logic)
        // User requested: "pudiendo eliminar platos"
        // In Vue, it was allowed if status !== 'listo'?
        // Usually if it's 'en_cocina', maybe we shouldn't delete without warning?
        // For now, allow unless 'servido' or 'listo_pagar'?
        if (['pagado', 'cancelado'].includes(orderItem.order.status)) {
            return NextResponse.json({ error: 'Cannot delete item from completed order' }, { status: 400 })
        }

        // Delete item
        await prisma.orderItem.delete({
            where: { id }
        })

        // Update order totals
        // We need to re-fetch order or recalculate
        // Simple way: decrement total
        const itemTotal = Number(orderItem.unitPrice) * orderItem.quantity

        await prisma.order.update({
            where: { id: orderItem.orderId },
            data: {
                total: { decrement: itemTotal },
                subtotal: { decrement: itemTotal }
            }
        })

        // Broadcast update via Ably
        await publishOrderUpdate(user.organizationId!, 'order-update', {
            type: 'item-deleted',
            itemId: id
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete item error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(
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
        const { notes, status } = body

        if (notes !== undefined && typeof notes !== 'string') {
            return NextResponse.json({ error: 'Invalid notes' }, { status: 400 })
        }

        const validStatuses = ['pendiente', 'en_preparacion', 'listo', 'servido']
        if (status !== undefined && !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const orderItem = await prisma.orderItem.findUnique({
            where: { id },
            include: { order: true }
        })

        if (!orderItem) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // Check organization
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true }
        })

        if (orderItem.order.organizationId !== user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const updateData: any = {}
        if (notes !== undefined) updateData.notes = notes

        let resultItem: any

        if (status !== undefined) {
            // Partial completion logic: if quantity > 1 and setting to 'listo', split the item
            if (status === 'listo' && orderItem.quantity > 1) {
                // Using transaction to ensure atomicity
                resultItem = await prisma.$transaction(async (tx) => {
                    // 1. Create the completed unit
                    const completedUnit = await tx.orderItem.create({
                        data: {
                            orderId: orderItem.orderId,
                            menuItemId: orderItem.menuItemId,
                            quantity: 1,
                            unitPrice: orderItem.unitPrice,
                            notes: orderItem.notes,
                            status: 'listo',
                            startedAt: orderItem.startedAt,
                            completedAt: new Date(),
                            createdAt: orderItem.createdAt,
                            transactionId: orderItem.transactionId
                        }
                    })

                    // 2. Decrease quantity of the original item
                    await tx.orderItem.update({
                        where: { id },
                        data: {
                            quantity: { decrement: 1 }
                        }
                    })

                    return completedUnit
                })
            } else {
                updateData.status = status
                // Handle timestamps based on status
                if (status === 'en_preparacion' && !orderItem.startedAt) {
                    updateData.startedAt = new Date()
                } else if (status === 'listo' && !orderItem.completedAt) {
                    updateData.completedAt = new Date()
                } else if (status === 'servido' && !orderItem.servedAt) {
                    updateData.servedAt = new Date()
                }

                resultItem = await prisma.orderItem.update({
                    where: { id },
                    data: updateData
                })
            }
        } else if (Object.keys(updateData).length > 0) {
            resultItem = await prisma.orderItem.update({
                where: { id },
                data: updateData
            })
        } else {
            resultItem = orderItem
        }

        // Broadcast update via Ably
        await publishOrderUpdate(user.organizationId!, 'order-update', {
            type: 'item-update',
            itemId: id,
            status: status,
            notes: notes,
            tableNumber: orderItem.order.tableNumber
        })

        return NextResponse.json(resultItem)

    } catch (error) {
        console.error('Update item error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
