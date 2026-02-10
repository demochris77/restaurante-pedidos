import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

/**
 * PATCH /api/superadmin/users/[id]/ban
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (session?.user?.role !== 'superadmin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { isBanned } = await request.json()
        const { id } = await params

        const updated = await prisma.user.update({
            where: { id },
            data: { isBanned }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error toggling ban state:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
