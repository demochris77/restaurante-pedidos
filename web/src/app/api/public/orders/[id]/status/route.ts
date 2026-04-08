import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { publishOrderUpdate } from '@/lib/ably'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { status } = body

        if (status !== 'listo_pagar') {
            return NextResponse.json({ error: 'Only pronto status is allowed via public API' }, { status: 400 })
        }

        // Get the order to find organizationId
        const order = await prisma.order.findUnique({
            where: { id },
            select: { organizationId: true, tableNumber: true }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status }
        })

        // Broadcast update via Ably
        if (order.organizationId) {
            await publishOrderUpdate(order.organizationId!, 'order-update', {
                type: 'status-update',
                orderId: id,
                status
            })
        }

        return NextResponse.json(updatedOrder)
    } catch (error) {
        console.error('Error in public order update:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
