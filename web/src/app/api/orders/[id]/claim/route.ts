import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { publishOrderUpdate } from '@/lib/ably'

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: orderId } = await params
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user || user.role !== 'mesero') {
            return NextResponse.json({ error: 'Only waiters can claim orders' }, { status: 403 })
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        if (order.waiterId) {
            return NextResponse.json({ error: 'Order already assigned' }, { status: 400 })
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { waiterId: user.id },
            include: { waiter: { select: { name: true } } }
        })

        // Notify others (especially cooks) that the order now has a waiter
        if (user.organizationId) {
            await publishOrderUpdate(user.organizationId!, 'order-update', {
                type: 'order-claimed',
                orderId: orderId,
                waiterName: user.name
            })
        }

        return NextResponse.json(updatedOrder)
    } catch (error) {
        console.error('Error claiming order:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
