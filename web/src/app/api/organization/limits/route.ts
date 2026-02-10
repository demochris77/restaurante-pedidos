import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getOrganizationWithUsage } from '@/lib/subscription-limits'
import prisma from '@/lib/prisma'

/**
 * GET /api/organization/limits
 * Get current usage and limits for the authenticated user's organization
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get user's organization
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true }
        })

        if (!user?.organizationId) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 404 }
            )
        }

        // Get organization with usage data
        const organization = await getOrganizationWithUsage(user.organizationId)

        if (!organization) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 404 }
            )
        }

        // Calculate limits for each resource
        const calculateLimit = (current: number, max: number | null) => {
            const isUnlimited = max === null || max === undefined
            const percentage = isUnlimited ? 0 : Math.round((current / max) * 100)
            const canAdd = isUnlimited || current < max

            return {
                current,
                max: max ?? 0,
                percentage,
                canAdd,
                isUnlimited
            }
        }

        return NextResponse.json({
            users: organization.usage.users,
            menuItems: calculateLimit(organization.usage.menuItems, organization.maxMenuItems),
            tables: organization.usage.tables
        })
    } catch (error) {
        console.error('Error fetching organization limits:', error)
        return NextResponse.json(
            { error: 'Failed to fetch limits' },
            { status: 500 }
        )
    }
}
