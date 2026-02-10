'use client'

import { useEffect, useState } from 'react'
import {
    Building2,
    Search,
    MoreVertical,
    Filter,
    Users,
    LayoutGrid,
    Calendar,
    ChevronRight,
    Loader2,
    X,
    ExternalLink,
    Store,
    Smartphone
} from 'lucide-react'

interface Organization {
    id: string
    name: string
    slug: string
    subscriptionStatus: string
    subscriptionPlan: string
    createdAt: string
    _count: {
        users: number
        tables: number
        menuItems: number
    }
}

export default function OrganizationsPage() {
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)

    useEffect(() => {
        fetchOrganizations()
    }, [])

    const fetchOrganizations = async () => {
        try {
            const res = await fetch('/api/superadmin/organizations')
            if (res.ok) {
                const data = await res.json()
                setOrganizations(data)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/superadmin/organizations/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                setOrganizations(organizations.filter(o => o.id !== id))
            } else {
                alert('No se pudo eliminar la organización')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error al procesar la solicitud')
        }
    }

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-orange-600" size={48} />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Organizaciones</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona todas las empresas registradas en la plataforma.</p>
                </div>
                {/* <button className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-orange-700 transition-colors flex items-center gap-2">
                    <Building2 size={18} />
                    Nueva Organización
                </button> */}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o slug..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <Filter size={18} />
                        Filtros
                    </button>
                    {/* <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        Exportar
                    </button> */}
                </div>
            </div>

            {/* Organizations Grid/List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Organización</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Plan & Estado</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Recursos</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Registro</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredOrgs.map((org) => (
                                <tr key={org.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-bold">
                                                {org.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{org.name}</p>
                                                <p className="text-xs text-slate-400 tracking-tight">/{org.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-black uppercase text-slate-900 dark:text-white">{org.subscriptionPlan}</span>
                                            <StatusBadge status={org.subscriptionStatus} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4 text-slate-500">
                                            <span className="flex items-center gap-1 text-xs" title="Usuarios">
                                                <Users size={14} />
                                                {org._count.users}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs" title="Mesas">
                                                <LayoutGrid size={14} />
                                                {org._count.tables}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Calendar size={14} />
                                            {new Date(org.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrg(org)
                                                }}
                                                className="p-2 text-slate-400 hover:text-orange-600 transition-colors rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20"
                                                title="Ver Detalles"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('¿Seguro que deseas eliminar esta organización y TODOS sus datos?')) {
                                                        handleDelete(org.id)
                                                    }
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                                                title="Eliminar Organización"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredOrgs.length === 0 && (
                    <div className="p-10 text-center text-slate-500">
                        No se encontraron organizaciones que coincidan con la búsqueda.
                    </div>
                )}
            </div>

            {/* View Modal */}
            {selectedOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg text-2xl font-bold">
                                        {selectedOrg.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{selectedOrg.name}</h2>
                                        <p className="text-orange-600 font-bold tracking-tight">/{selectedOrg.slug}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedOrg(null)}
                                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Plan Actual</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white capitalize">{selectedOrg.subscriptionPlan}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Estado</p>
                                    <StatusBadge status={selectedOrg.subscriptionStatus} />
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha Registro</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">{new Date(selectedOrg.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Estadísticas de Uso</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                        <Users className="text-slate-400" size={20} />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400">Usuarios</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{selectedOrg._count.users}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                        <LayoutGrid className="text-slate-400" size={20} />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400">Mesas</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{selectedOrg._count.tables}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                        <Smartphone className="text-slate-400" size={20} />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400">Items Menú</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{selectedOrg._count.menuItems}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 flex gap-4">
                                <a
                                    href={`/${selectedOrg.slug}/login`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95"
                                >
                                    <ExternalLink size={20} />
                                    Ir a la Web Pública
                                </a>
                                <button
                                    onClick={() => setSelectedOrg(null)}
                                    className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
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
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter w-fit ${colors[status as keyof typeof colors] || colors.cancelled}`}>
            {status}
        </span>
    )
}
