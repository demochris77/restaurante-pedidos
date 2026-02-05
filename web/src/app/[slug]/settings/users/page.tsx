'use client'

import { useEffect, useState } from 'react'
import { UsageIndicator } from '@/components/settings/usage-indicator'
import { UpgradeBanner } from '@/components/settings/upgrade-banner'
import { AddUserModal } from '@/components/settings/add-user-modal'
import { Loader2, Users as UsersIcon, Mail, Shield } from 'lucide-react'

interface User {
    id: string
    name: string
    username: string
    role: string
    createdAt: string
}

interface UsageLimits {
    users: {
        current: number
        max: number
        percentage: number
        canAdd: boolean
        isUnlimited: boolean
    }
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [limits, setLimits] = useState<UsageLimits | null>(null)
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [limitsRes, usersRes] = await Promise.all([
                fetch('/api/organization/limits'),
                fetch('/api/users')
            ])

            const limitsData = await limitsRes.json()
            setLimits(limitsData)

            if (usersRes.ok) {
                const usersData = await usersRes.json()
                setUsers(usersData)
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        )
    }

    const showWarning = limits && limits.users.percentage >= 80 && !limits.users.isUnlimited
    const atLimit = limits ? !limits.users.canAdd : false

    return (
        <div className="space-y-6">
            {/* Header with Usage */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            Gestión de Usuarios
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Administra los usuarios de tu organización
                        </p>
                    </div>
                </div>

                {limits && (
                    <UsageIndicator
                        current={limits.users.current}
                        max={limits.users.max}
                        label="Usuarios"
                        type="users"
                        isUnlimited={limits.users.isUnlimited}
                    />
                )}
            </div>

            {/* Warnings */}
            {(showWarning || atLimit) && (
                <UpgradeBanner
                    type={atLimit ? 'limit-reached' : 'warning'}
                    resourceType="usuarios"
                />
            )}

            {/* Users List */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                        Usuarios Actuales
                    </h3>
                    <button
                        disabled={atLimit}
                        onClick={() => setIsModalOpen(true)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${atLimit
                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                            }`}
                    >
                        Agregar Usuario
                    </button>
                </div>

                {users.length === 0 ? (
                    <div className="text-center py-12">
                        <UsersIcon className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
                        <p className="text-slate-500 dark:text-slate-400">
                            No hay usuarios registrados
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                        <UsersIcon className="text-orange-600 dark:text-orange-400" size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                <Mail size={14} />
                                                {user.username}
                                            </span>
                                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                <Shield size={14} />
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                    Eliminar
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchData}
            />
        </div>
    )
}
