import { auth } from '@/auth'
import Navbar from '@/components/dashboard/navbar'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar user={session.user} slug={session.user.organizationSlug || ''} />
            <main className="max-w-[1600px] mx-auto px-4 py-6">
                {children}
            </main>
        </div>
    )
}
