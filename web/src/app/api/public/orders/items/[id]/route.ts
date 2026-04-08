import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { publishOrderUpdate } from '@/lib/ably'

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { searchParams } = new URL(req.url)
        const slug = searchParams.get('slug')
        const table = searchParams.get('table')

        if (!slug || !table) {
            return NextResponse.json({ error: 'Missing slug or table' }, { status: 400 })
        }

        const organization = await prisma.organization.findUnique({
            where: { slug },
            select: { id: true }
        })

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const item = await prisma.orderItem.findUnique({
            where: { id },
            include: {
                order: true,
                menuItem: true
            }
        })

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // Validate that the item belongs to the correct context
        if (item.order.organizationId !== organization.id || item.order.tableNumber !== parseInt(table)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Validate status for cancellation
        // Cancellation rules:
        // 1. Pending items can always be cancelled
        // 2. Direct items that are 'listo' can be cancelled (haven't been delivered/served yet)
        // 3. Items 'en_preparacion' can be cancelled within 30 seconds of creation

        const isDirect = item.menuItem.isDirect
        const timeSinceCreation = Date.now() - new Date(item.createdAt).getTime()
        const isFresh = timeSinceCreation < 30000 // 30 seconds

        const canCancel =
            item.status === 'pendiente' ||
            (item.status === 'listo' && isDirect) ||
            (item.status === 'en_preparacion' && isFresh)

        if (!canCancel) {
            return NextResponse.json({ error: 'Item cannot be cancelled (time limit exceeded or status change)' }, { status: 400 })
        }

        // If 'pendiente', just delete?
        // If 'listo' and direct, it means it hasn't been served/delivered yet in a sense of kitchen flow?
        // Yes, delete/remove the item.

        // Update totals
        const itemTotal = Number(item.unitPrice) * item.quantity

        await prisma.$transaction(async (tx) => {
            await tx.orderItem.delete({
                where: { id }
            })

            await tx.order.update({
                where: { id: item.orderId },
                data: {
                    total: { decrement: itemTotal },
                    subtotal: { decrement: itemTotal }
                }
            })
        })

        // Broadcast update
        await publishOrderUpdate(organization.id!, 'order-update', {
            type: 'item-deleted',
            itemId: id,
            orderId: item.orderId
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error cancelling public item:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
