import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

/**
 * PATCH /api/superadmin/plans/[id]
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== 'superadmin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const data = await req.json()

        const updated = await (prisma as any).planDefinition.update({
            where: { id },
            data: {
                name: data.name,
                price: data.price,
                maxTables: data.maxTables,
                maxUsers: data.maxUsers,
                features: data.features
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating plan:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
