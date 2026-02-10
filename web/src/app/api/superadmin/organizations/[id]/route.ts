import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

/**
 * DELETE /api/superadmin/organizations/[id]
 * Delete organization and all associated data
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (session?.user?.role !== 'superadmin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Prisma will handle cascades if defined, but let's be safe
        // Most relationships in our schema have onDelete: Cascade
        await prisma.organization.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting organization:', error)
        return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
    }
}

/**
 * PATCH /api/superadmin/organizations/[id]
 * Manually update organization plan or limits
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

        const data = await request.json()
        const { id } = await params

        const updated = await prisma.organization.update({
            where: { id },
            data: {
                subscriptionPlan: data.subscriptionPlan,
                subscriptionStatus: data.subscriptionStatus,
                maxTables: data.maxTables,
                maxUsers: data.maxUsers,
                maxMenuItems: data.maxMenuItems,
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating organization:', error)
        return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    }
}
