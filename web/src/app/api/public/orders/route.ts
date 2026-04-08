import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateStock, deductStock } from '@/lib/stock'
import { publishOrderUpdate } from '@/lib/ably'
import { getVisitorId } from '@/lib/visitor-auth'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { slug, tableNumber, items, orderNote } = body

        if (!slug || !tableNumber || !items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const organization = await prisma.organization.findUnique({
            where: { slug },
            select: { id: true }
        })

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        // --- STOCK VALIDATION ---
        const stockErrors = await validateStock(items.map(i => ({
            menuItemId: i.id,
            quantity: parseInt(i.quantity)
        })))

        if (stockErrors.length > 0) {
            return NextResponse.json({
                error: 'Insufficient stock',
                details: stockErrors
            }, { status: 400 })
        }
        // ------------------------

        // Validate table existence
        const table = await prisma.table.findFirst({
            where: {
                number: parseInt(tableNumber),
                organizationId: organization.id
            }
        })

        if (!table) {
            return NextResponse.json({ error: 'Table not found' }, { status: 404 })
        }

        // Calculate total and prepare items
        let subtotal = 0
        const orderItemsData: any[] = []

        for (const item of items) {
            const menuItem = await prisma.menuItem.findUnique({
                where: { id: item.id, organizationId: organization.id }
            })

            if (!menuItem || !menuItem.available) continue

            const quantity = parseInt(item.quantity)
            if (isNaN(quantity) || quantity <= 0) continue

            const price = Number(menuItem.price)
            subtotal += price * quantity

            const isDirect = menuItem.isDirect;
            orderItemsData.push({
                menuItemId: menuItem.id,
                quantity: quantity,
                unitPrice: price,
                notes: item.notes || '',
                status: isDirect ? 'listo' : 'en_preparacion',
                startedAt: new Date(), // Start immediately for both (direct=ready, non-direct=cooking)
                completedAt: isDirect ? new Date() : undefined
            })
        }

        if (orderItemsData.length === 0) {
            return NextResponse.json({ error: 'No valid items in order' }, { status: 400 })
        }

        // Create or Update the order
        const order = await prisma.$transaction(async (tx) => {
            // Check for existing active order for this table
            const existingOrder = await tx.order.findFirst({
                where: {
                    organizationId: organization.id,
                    tableNumber: parseInt(tableNumber),
                    status: { notIn: ['cancelado', 'pagado', 'cerrado'] }
                }
            })

            let orderResult

            if (existingOrder) {
                // Update existing order
                orderResult = await tx.order.update({
                    where: { id: existingOrder.id },
                    data: {
                        total: { increment: subtotal },
                        subtotal: { increment: subtotal },
                        // Append notes if new ones provided
                        notes: orderNote ? (existingOrder.notes ? `${existingOrder.notes}\n${orderNote}` : orderNote) : undefined,
                        // Update status to 'nuevo' to alert kitchen? Or keep as is?
                        // Usually if adding items, maybe set to 'nuevo' or 'updated'?
                        // Let's keep status if it's already in progress, but the new items will be 'pendiente'
                        // status: 'nuevo', 
                        items: {
                            create: orderItemsData.map(item => ({
                                menuItemId: item.menuItemId,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                notes: item.notes,
                                status: item.status,
                                startedAt: item.startedAt,
                                completedAt: item.completedAt
                            }))
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
            } else {
                // Create new order
                orderResult = await (tx.order as any).create({
                    data: {
                        tableNumber: parseInt(tableNumber),
                        organizationId: organization.id,
                        visitorId: await getVisitorId(),
                        total: subtotal,
                        subtotal: subtotal,
                        status: 'nuevo',
                        notes: orderNote || '',
                        items: {
                            create: orderItemsData.map(item => ({
                                menuItemId: item.menuItemId,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                notes: item.notes,
                                status: item.status,
                                startedAt: item.startedAt,
                                completedAt: item.completedAt
                            }))
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

                // Update table status if needed
                if (table.isBlockable) {
                    await tx.table.update({
                        where: { id: table.id },
                        data: { status: 'ocupada' }
                    })
                }
            }

            // Deduct stock for new items
            for (const item of orderItemsData) {
                await deductStock(tx, item.menuItemId, item.quantity)
            }

            return orderResult
        })

        // Broadcast update via Ably
        await publishOrderUpdate(organization.id, 'order-created', order)

        return NextResponse.json(order)
    } catch (error) {
        console.error('Error creating public order:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
