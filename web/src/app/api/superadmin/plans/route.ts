import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

import { MERCADOPAGO_PLANS, PlanType } from '@/lib/mercadopago'

/**
 * GET /api/superadmin/plans
 */
export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== 'superadmin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let plans = await prisma.planDefinition.findMany({
            orderBy: { price: 'asc' }
        })

        // Synchronize or Seed
        const planSlugs = Object.keys(MERCADOPAGO_PLANS) as PlanType[]

        for (const slug of planSlugs) {
            const def = MERCADOPAGO_PLANS[slug]
            await (prisma as any).planDefinition.upsert({
                where: { slug },
                update: {
                    name: def.name,
                    price: def.price,
                    maxTables: def.maxTables,
                    maxUsers: def.maxUsers,
                },
                create: {
                    slug,
                    name: def.name,
                    price: def.price,
                    maxTables: def.maxTables,
                    maxUsers: def.maxUsers,
                    features: [def.description]
                }
            })
        }

        // Fetch again after sync
        plans = await prisma.planDefinition.findMany({
            orderBy: { price: 'asc' }
        })

        return NextResponse.json(plans)
    } catch (error) {
        console.error('Error fetching plans:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

