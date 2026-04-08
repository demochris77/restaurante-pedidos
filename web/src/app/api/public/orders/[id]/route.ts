import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                },
                organization: {
                    select: {
                        name: true,
                        nit: true,
                    }
                },
                waiter: {
                    select: {
                        name: true,
                    }
                }
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        return NextResponse.json(order)
    } catch (error) {
        console.error('Error in public order details:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
