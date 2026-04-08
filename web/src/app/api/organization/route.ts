import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getOrganizationWithUsage } from '@/lib/subscription-limits'
import prisma from '@/lib/prisma'

/**
 * GET /api/organization
 * Get organization details with usage statistics
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

        // Get organization with usage
        const organization = await getOrganizationWithUsage(user.organizationId)

        return NextResponse.json(organization)
    } catch (error) {
        console.error('Error fetching organization:', error)
        return NextResponse.json(
            { error: 'Failed to fetch organization' },
            { status: 500 }
        )
    }
}

/**
 * PATCH /api/organization
 * Update organization details
 */
export async function PATCH(request: NextRequest) {
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
            select: { organizationId: true, role: true }
        })

        if (!user?.organizationId) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 404 }
            )
        }

        // Only admin can update organization
        if (user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Only administrators can update organization settings' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { name, tipPercentage, securityCode, securityEnabled, securityMode } = body
 
         // Update organization
         const updatedOrg = await prisma.organization.update({
             where: { id: user.organizationId },
             data: {
                 name: name || undefined,
                 tipPercentage: tipPercentage !== undefined ? parseInt(tipPercentage.toString()) : undefined,
                 securityCode: securityCode !== undefined ? securityCode : undefined,
                 securityEnabled: securityEnabled !== undefined ? !!securityEnabled : undefined,
                 securityMode: securityMode !== undefined ? securityMode : undefined
             }
         })

        return NextResponse.json(updatedOrg)
    } catch (error) {
        console.error('Error updating organization:', error)
        return NextResponse.json(
            { error: 'Failed to update organization' },
            { status: 500 }
        )
    }
}
