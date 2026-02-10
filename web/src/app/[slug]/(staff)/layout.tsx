import { ReactNode } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import Navbar from '@/components/dashboard/navbar'

export default async function StaffLayout({
    children,
    params
}: {
    children: ReactNode
    params: Promise<{ slug: string }>
}) {
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/login')
    }

    // Await params to get the slug
    const { slug } = await params

    // Verify that the user belongs to this organization
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            organization: true
        }
    })

    if (!user || !user.organization || user.organization.slug !== slug) {
        // User doesn't belong to this organization or organization mismatch
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Navbar
                user={{
                    ...session.user,
                    id: user.id,
                    hasSeenSettingsHint: (user as any).hasSeenSettingsHint
                }}
                slug={slug}
            />
            {children}
        </div>
    )
}
