import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { validateStock, deductStock } from '@/lib/stock'
import { publishOrderUpdate } from '@/lib/ably'

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user organization and role
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true, role: true, id: true }
        })

        if (!user?.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const body = await req.json()
        const { tableId, tableNumber, items, orderNote, orderId } = body

        // Validate payload
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
        }

        // --- STOCK VALIDATION ---
        const stockErrors = await validateStock(items.map(i => ({
            menuItemId: i.menuItemId,
            quantity: parseInt(i.quantity)
        })))

        if (stockErrors.length > 0) {
            return NextResponse.json({
                error: 'Insufficient stock',
                details: stockErrors
            }, { status: 400 })
        }
        // ------------------------

        // Calculate totals and validate items
        let subtotal = 0
        const orderItemsData: any[] = []

        for (const item of items) {
            const menuItem = await prisma.menuItem.findUnique({
                where: { id: item.menuItemId, organizationId: user.organizationId }
            })

            if (!menuItem) {
                return NextResponse.json({ error: `Item ${item.menuItemId} not found` }, { status: 404 })
            }

            const quantity = parseInt(item.quantity)
            if (isNaN(quantity) || quantity <= 0) continue

            const unitPrice = Number(menuItem.price)
            const itemTotal = unitPrice * quantity
            subtotal += itemTotal

            orderItemsData.push({
                menuItemId: item.menuItemId,
                quantity: quantity,
                unitPrice: unitPrice,
                notes: item.notes || '',
                status: menuItem.isDirect ? 'listo' : 'pendiente',
                startedAt: menuItem.isDirect ? new Date() : null, // Direct items 'start' immediately
                completedAt: menuItem.isDirect ? new Date() : null, // And 'complete' immediately
            })
        }

        let order

        if (orderId) {
            // Update existing order
            const existingOrder = await prisma.order.findUnique({
                where: { id: orderId, organizationId: user.organizationId }
            })

            if (!existingOrder) {
                return NextResponse.json({ error: 'Order not found' }, { status: 404 })
            }

            // Use transaction to add items and update total
            order = await prisma.$transaction(async (tx) => {
                await tx.orderItem.createMany({
                    data: orderItemsData.map((item: any) => ({
                        ...item,
                        orderId: existingOrder.id
                    }))
                })

                // Deduct stock
                for (const item of orderItemsData) {
                    await deductStock(tx, item.menuItemId, item.quantity)
                }

                // Update order total
                const newTotal = Number(existingOrder.total) + subtotal
                const newSubtotal = Number(existingOrder.subtotal) + subtotal

                return await tx.order.update({
                    where: { id: existingOrder.id },
                    data: {
                        total: newTotal,
                        subtotal: newSubtotal,
                        notes: orderNote !== undefined ? orderNote : existingOrder.notes
                    },
                    include: { items: { include: { menuItem: true } } }
                })
            })

        } else {
            // Create new order
            if (!tableNumber) {
                return NextResponse.json({ error: 'Table number required for new orders' }, { status: 400 })
            }

            // Create Order Transaction
            order = await prisma.$transaction(async (tx) => {
                // 1. Create Order
                const newOrder = await tx.order.create({
                    data: {
                        tableNumber: parseInt(tableNumber), // Store number, not ID relation (legacy schema)
                        waiterId: user.id,
                        organizationId: user.organizationId!,
                        subtotal: subtotal,
                        total: subtotal, // Add tax logic if needed
                        status: 'nuevo',
                        notes: orderNote || '',
                        items: {
                            create: orderItemsData
                        }
                    },
                    include: {
                        items: {
                            include: {
                                menuItem: true
                            }
                        }
                    }
                })

                // Deduct stock
                for (const item of orderItemsData) {
                    await deductStock(tx, item.menuItemId, item.quantity)
                }

                // 2. Update Table Status to 'ocupada' if not already
                const table = await tx.table.findFirst({
                    where: {
                        number: parseInt(tableNumber),
                        organizationId: user.organizationId
                    }
                })

                if (table) {
                    const updateData: any = {}
                    if (table.isBlockable) {
                        updateData.status = 'ocupada'
                    }

                    if (Object.keys(updateData).length > 0) {
                        await tx.table.update({
                            where: { id: table.id },
                            data: updateData
                        })
                    }
                }

                return newOrder
            })
        }

        // Broadcast order creation via Ably
        await publishOrderUpdate(user.organizationId!, 'order-created', {
            type: 'new-order',
            orderId: order.id,
            tableNumber: order.tableNumber
        })

        return NextResponse.json(order)

    } catch (error) {
        console.error('Create order error:', error)
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true, role: true, id: true }
        })

        if (!user?.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status')

        const where: any = {
            organizationId: user.organizationId
        }

        if (status) {
            const statusList = status.split(',')
            if (statusList.length > 0) {
                where.status = { in: statusList }
            }
        } else {
            where.status = { notIn: ['cancelado', 'pagado'] }
        }

        // Waiter specific filtering: their orders + unassigned orders
        if (user.role === 'mesero') {
            where.OR = [
                { waiterId: user.id },
                { waiterId: null }
            ]
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                items: {
                    include: {
                        menuItem: true
                    }
                },
                waiter: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(orders)
    } catch (error) {
        console.error('Error fetching orders:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true, role: true }
        })

        if (!user?.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        // Only allow cleanup for administrators or authorized staff if needed
        // For now, let's just allow it for the organization's orders
        const { searchParams } = new URL(req.url)
        const cleanup = searchParams.get('cleanup')

        if (cleanup === 'true') {
            const deleted = await prisma.order.deleteMany({
                where: {
                    organizationId: user.organizationId,
                    status: 'cancelado'
                }
            })
            return NextResponse.json({ message: 'Cleanup successful', count: deleted.count })
        }

        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
    } catch (error) {
        console.error('Error cleaning up orders:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
