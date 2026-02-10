'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Building2,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    Shield,
    CreditCard
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const navigation = [
        { name: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
        { name: 'Organizaciones', href: '/superadmin/organizations', icon: Building2 },
        { name: 'Usuarios Globales', href: '/superadmin/users', icon: Users },
        { name: 'Gestión de Planes', href: '/superadmin/plans', icon: CreditCard },
        // { name: 'Configuración', href: '/superadmin/settings', icon: Settings },
    ]

    const NavLink = ({ item }: { item: typeof navigation[0] }) => {
        const isActive = pathname === item.href
        return (
            <Link
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
            >
                <item.icon size={20} />
                {item.name}
            </Link>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 fixed inset-y-0 shadow-sm">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl text-slate-900 dark:text-white leading-tight">SuperAdmin</h1>
                        <p className="text-xs text-orange-600 font-semibold uppercase tracking-wider">Control Panel</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    {navigation.map((item) => (
                        <NavLink key={item.name} item={item} />
                    ))}
                </nav>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                        <LogOut size={20} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 px-4 flex items-center justify-between z-40 shadow-sm">
                <div className="flex items-center gap-2">
                    <Shield className="text-orange-600" size={24} />
                    <span className="font-bold text-lg text-slate-900 dark:text-white">SuperAdmin</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-white dark:bg-slate-900 pt-20 px-6">
                    <nav className="space-y-2">
                        {navigation.map((item) => (
                            <NavLink key={item.name} item={item} />
                        ))}
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors mt-6"
                        >
                            <LogOut size={20} />
                            Cerrar Sesión
                        </button>
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 lg:ml-72 pt-16 lg:pt-0">
                <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
