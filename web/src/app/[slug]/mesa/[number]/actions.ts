'use server'

import { getVisitorId, hasVisitorOrderedToday, isVisitorAuthorized, authorizeVisitor, hasVisitorPaidRecently } from '@/lib/visitor-auth'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function getSecurityStatus(slug: string, tableNumber?: string) {
    // 0. Ensure visitor ID is established (sets cookie)
    const vid = await getVisitorId()

    // 1. If user is staff (waiter/admin/etc), bypass security
    const session = await auth()
    if (session?.user) return { required: false }

    // 2. Check for existing active order for this table
    // If order exists, anyone at the table can access the menu/status/bill
    let activeOrderId: string | undefined = undefined
    if (tableNumber) {
        const activeOrder = await prisma.order.findFirst({
            where: {
                organization: { slug },
                tableNumber: parseInt(tableNumber),
                status: { notIn: ['cancelado', 'pagado', 'cerrado'] }
            },
            select: { id: true }
        })
        if (activeOrder) {
            activeOrderId = activeOrder.id
            return { required: false, activeOrderId }
        }
    }

    // 3. Check organization security settings
    const org = await (prisma.organization as any).findUnique({
        where: { slug },
        select: { securityEnabled: true, securityMode: true }
    }) as { securityEnabled: boolean; securityMode: string } | null

    if (!org?.securityEnabled) return { required: false }

    // 4. Check if visitor is already authorized for today
    const authorized = await isVisitorAuthorized(slug)
    if (authorized) {
        // Even if authorized, check if the last order cycle ended (was paid)
        const cycleEnded = await hasVisitorPaidRecently(slug, vid, tableNumber!)
        if (!cycleEnded) {
            return { required: false }
        }
        // If cycle ended, we treat them as needing re-authorization
    }

    // 5. Check if this is a second order attempt
    const ordered = await hasVisitorOrderedToday(slug, vid)

    return { required: ordered }
}

export async function validateSecurityCode(slug: string, code: string) {
    const success = await authorizeVisitor(slug, code)
    return { success }
}
