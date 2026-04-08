import { cookies } from 'next/headers'
import prisma from './prisma'

const VISITOR_ID_COOKIE = 'v_id'
const AUTH_COOKIE_PREFIX = 'v_auth_'
const SECURITY_INTERVAL = 60 // 1 minute window for TOTP

/**
 * Gets the current visitor ID or creates a new one
 */
export async function getVisitorId() {
    const cookieStore = await cookies()
    let vid = cookieStore.get(VISITOR_ID_COOKIE)?.value

    if (!vid) {
        vid = crypto.randomUUID()
        // Set the cookie right away so it's available for subsequent requests
        cookieStore.set(VISITOR_ID_COOKIE, vid, {
            maxAge: 60 * 60 * 24 * 365, // 1 year
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
        })
    }
    return vid
}

/**
 * Sets the visitor ID cookie (to be used in actions or middleware)
 */
export async function setVisitorIdCookie(vid: string) {
    const cookieStore = await cookies()
    cookieStore.set(VISITOR_ID_COOKIE, vid, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
    })
}

/**
 * Checks if the visitor has already placed an order today in the given organization
 */
export async function hasVisitorOrderedToday(slug: string, visitorId: string) {
    const now = new Date()
    const start = new Date(now.setHours(0, 0, 0, 0))
    const end = new Date(now.setHours(23, 59, 59, 999))

    const orderCount = await (prisma.order as any).count({
        where: {
            organization: { slug },
            visitorId,
            createdAt: {
                gte: start,
                lte: end,
            },
            status: { notIn: ['cancelado'] }, // Ignore cancelled orders
        },
    })

    return orderCount > 0
}

/**
 * Checks if the visitor's last order at this table is already paid (cycle ended)
 */
export async function hasVisitorPaidRecently(slug: string, visitorId: string, tableNumber: string) {
    const lastOrder = await (prisma.order as any).findFirst({
        where: {
            organization: { slug },
            visitorId,
            tableNumber: parseInt(tableNumber),
        },
        orderBy: { createdAt: 'desc' },
        select: { status: true }
    })

    // If the last order for this visitor at this table is 'pagado' or 'cerrado', 
    // it means the cycle ended and they should re-authorize to start a new one.
    return lastOrder && (['pagado', 'cerrado'].includes(lastOrder.status))
}

/**
 * Checks if the visitor is authorized (e.g. entered a code) for today
 */
export async function isVisitorAuthorized(slug: string) {
    const cookieStore = await cookies()
    const authorized = cookieStore.get(`${AUTH_COOKIE_PREFIX}${slug}`)?.value
    return authorized === 'true'
}

/**
 * Verifies the security code and sets the authorization cookie
 */
export async function authorizeVisitor(slug: string, code: string) {
    const { validateTOTP } = await import('./security')
    
    const org = await (prisma.organization as any).findUnique({
        where: { slug },
        select: { 
            securityCode: true, 
            securityEnabled: true, 
            securityMode: true 
        }
    }) as { securityCode: string | null; securityEnabled: boolean; securityMode: string } | null

    if (!org?.securityEnabled) return true
    if (!org?.securityCode) return true // No code set means open

    let isValid = false

    if (org.securityMode === 'dynamic') {
        isValid = validateTOTP(org.securityCode, code, SECURITY_INTERVAL)
    } else {
        isValid = org.securityCode === code
    }

    if (isValid) {
        const cookieStore = await cookies()
        const endOfToday = new Date()
        endOfToday.setHours(23, 59, 59, 999)
        
        cookieStore.set(`${AUTH_COOKIE_PREFIX}${slug}`, 'true', {
            expires: endOfToday,
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
        })
        return true
    }

    return false
}

/**
 * Clears the authorization cookie for the given organization
 */
export async function clearVisitorAuthorization(slug: string) {
    const cookieStore = await cookies()
    cookieStore.delete(`${AUTH_COOKIE_PREFIX}${slug}`)
}
