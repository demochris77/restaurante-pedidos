import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { publishOrderUpdate } from '@/lib/ably'

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true }
        })

        if (!user?.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const body = await req.json()
        const { itemIds, status } = body

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return NextResponse.json({ error: 'Invalid items' }, { status: 400 })
        }

        const validStatuses = ['pendiente', 'en_preparacion', 'listo', 'servido']
        if (!status || !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        // Verify and Update items in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Check if all items belong to the organization
            const items = await tx.orderItem.findMany({
                where: {
                    id: { in: itemIds },
                    order: { organizationId: user.organizationId! }
                },
                include: { order: true }
            })

            if (items.length !== itemIds.length) {
                throw new Error('Some items were not found or belong to another organization')
            }

            const tableNumbers = Array.from(new Set(items.map(i => i.order.tableNumber)))

            const updateData: any = { status }
            const now = new Date()

            if (status === 'en_preparacion') {
                updateData.startedAt = now
            } else if (status === 'listo') {
                updateData.completedAt = now
            } else if (status === 'servido') {
                updateData.servedAt = now
            }

            await tx.orderItem.updateMany({
                where: {
                    id: { in: itemIds }
                },
                data: updateData
            })

            return { tableNumbers, count: itemIds.length }
        })

        // Broadcast update via Ably
        await publishOrderUpdate(user.organizationId!, 'order-update', {
            type: 'batch-item-update',
            itemIds,
            status,
            tableNumbers: result.tableNumbers
        })

        return NextResponse.json({ success: true, count: result.count })
    } catch (error) {
        console.error('Batch status update error:', error)
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Batch update failed' }, { status: 500 })
    }
}
