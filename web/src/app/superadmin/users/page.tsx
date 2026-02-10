'use client'

import { useEffect, useState } from 'react'
import {
    Users,
    Search,
    Building2,
    Calendar,
    Shield,
    ShieldOff,
    Mail,
    Loader2,
    Filter,
    UserCircle,
    X
} from 'lucide-react'

interface User {
    id: string
    name: string
    username: string
    role: string
    isBanned: boolean
    createdAt: string
    organization: {
        name: string
        slug: string
    } | null
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/superadmin/users')
            if (res.ok) {
                const data = await res.json()
                setUsers(data)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleBan = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/superadmin/users/${id}/ban`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isBanned: !currentStatus })
            })
            if (res.ok) {
                setUsers(users.map(u => u.id === id ? { ...u, isBanned: !currentStatus } : u))
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const filteredUsers = users.filter(user =>
        (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.organization?.name.toLowerCase() || '').includes(searchQuery.toLowerCase())
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
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Usuarios Globales</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Lista completa de todos los usuarios registrados en todas las organizaciones.</p>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o restaurante..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Filter size={18} />
                    Filtros
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Usuario</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Rol</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Organización</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Registro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                <UserCircle size={24} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{user.name || 'Sin nombre'}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Mail size={12} />
                                                    {user.username}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <Shield size={14} className={user.role === 'admin' ? 'text-orange-600' : user.role === 'superadmin' ? 'text-purple-600' : 'text-slate-400'} />
                                            <span className={`text-xs font-bold uppercase ${user.role === 'superadmin' ? 'text-purple-600' :
                                                user.role === 'admin' ? 'text-orange-600' : 'text-slate-500'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.organization ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                                    <Building2 size={14} className="text-slate-400" />
                                                    {user.organization.name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 ml-5 font-mono">/{user.organization.slug}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Global / Sin Org</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-1.5 ">
                                                <Calendar size={14} />
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </div>
                                            {user.role !== 'superadmin' && (
                                                <button
                                                    onClick={() => handleToggleBan(user.id, user.isBanned)}
                                                    className={`p-2 rounded-lg transition-colors ${user.isBanned
                                                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                                        : 'bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50'
                                                        }`}
                                                    title={user.isBanned ? 'Quitar Baneo' : 'Banear Usuario'}
                                                >
                                                    <ShieldOff size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <div className="p-10 text-center text-slate-500">
                        No se encontraron usuarios.
                    </div>
                )}
            </div>
        </div>
    )
}
