import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import {
    Building2,
    Users,
    CreditCard,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react'

export default async function SuperAdminDashboard() {
    const session = await auth()

    if (session?.user?.role !== 'superadmin') {
        redirect('/')
    }

    // Get statistics
    const [orgCount, userCount, activeSubscriptions] = await Promise.all([
        prisma.organization.count(),
        prisma.user.count(),
        prisma.organization.count({
            where: { subscriptionStatus: 'active' }
        })
    ])

    const recentOrgs = await prisma.organization.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { users: true, tables: true }
            }
        }
    })

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Panel de Control</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Bienvenido, {session.user.name}. Aquí tienes un resumen de la plataforma.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Organizaciones"
                    value={orgCount}
                    icon={<Building2 size={24} />}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Usuarios Totales"
                    value={userCount}
                    icon={<Users size={24} />}
                    color="bg-orange-500"
                />
                <StatCard
                    title="Suscripciones Activas"
                    value={activeSubscriptions}
                    icon={<CreditCard size={24} />}
                    color="bg-green-500"
                />
                <StatCard
                    title="Crecimiento Est."
                    value="+12%"
                    trend="up"
                    icon={<TrendingUp size={24} />}
                    color="bg-purple-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Organizations */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h2 className="font-bold text-lg text-slate-900 dark:text-white">Organizaciones Recientes</h2>
                        <button className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">Ver todas</button>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recentOrgs.map((org) => (
                            <div key={org.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
                                        {org.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{org.name}</p>
                                        <p className="text-xs text-slate-500">{org.slug}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <StatusBadge status={org.subscriptionStatus} />
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">
                                        {org._count.users} Usuarios • {org._count.tables} Mesas
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Activity Placeholder */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white mb-6">Estado del Sistema</h2>
                    <div className="flex-1 flex flex-col gap-6 justify-center items-center text-center opacity-75">
                        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                            <CheckCircle2 size={48} />
                        </div>
                        <div>
                            <p className="font-bold text-xl text-slate-900 dark:text-white">Todos los servicios operacionales</p>
                            <p className="text-slate-500 mt-1">Última revisión: hace 5 minutos</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full mt-4">
                            <ServiceItem name="API Gateway" status="operational" />
                            <ServiceItem name="Database" status="operational" />
                            <ServiceItem name="Web Sockets" status="operational" />
                            <ServiceItem name="Payment Webhooks" status="operational" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon, color, trend }: { title: string, value: string | number, icon: React.ReactNode, color: string, trend?: 'up' | 'down' }) {
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-xl ${color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
            </div>
            {trend && (
                <div className={`mt-4 flex items-center gap-1 text-xs font-bold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp size={14} className={trend === 'down' ? 'rotate-180' : ''} />
                    <span>{trend === 'up' ? '+5.4%' : '-2.1%'} este mes</span>
                </div>
            )}
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const colors = {
        active: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
        trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
        past_due: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
        blocked: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
        cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400'
    }

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${colors[status as keyof typeof colors] || colors.cancelled}`}>
            {status}
        </span>
    )
}

function ServiceItem({ name, status }: { name: string, status: 'operational' | 'degraded' | 'down' }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{name}</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
        </div>
    )
}
