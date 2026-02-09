'use client'

import { useState, useEffect } from 'react'
import {
    UtensilsCrossed,
    LogOut,
    Wifi,
    WifiOff,
    ChevronDown,
    Sun,
    Moon,
    Check,
    User,
    Settings,
    Users,
    ArrowLeft,
    ChevronRight,
    Plus,
    Trash2
} from 'lucide-react'
import { signIn, signOut } from 'next-auth/react' // Client-side signIn/signOut
import { Button } from '@/components/ui/button' // We might need to create this or use raw HTML
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useLanguage } from '@/components/providers/language-provider'

interface User {
    name?: string | null
    email?: string | null
    role?: string
    username?: string | null
    switchToken?: string | null
}

interface NavbarProps {
    user: User
    slug: string
}

export default function Navbar({ user, slug }: NavbarProps) {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const [menuView, setMenuView] = useState<'main' | 'accounts'>('main')
    const { theme, setTheme } = useTheme()
    const { language, setLanguage, t } = useLanguage()
    const isConnected = true // Mock for now

    // Account Switching State
    interface SavedAccount {
        name: string
        username: string
        role: string
        avatar: string
        switchToken?: string | null
    }
    const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])

    useEffect(() => {
        // Load existing accounts
        const stored = localStorage.getItem('restaurant_saved_accounts_v2')
        let accounts: SavedAccount[] = stored ? JSON.parse(stored) : []

        // Add/Update current user
        // Use username if available, fallback to email or name
        const currentUserAcc: SavedAccount = {
            name: user.name || 'Usuario',
            username: user.username || user.email || user.name || 'user',
            role: user.role || 'user',
            avatar: user.name?.charAt(0).toUpperCase() || 'U',
            switchToken: user.switchToken
        }

        // Remove if exists to update (avoid duplicates)
        accounts = accounts.filter(a => a.username !== currentUserAcc.username)
        // Add to front
        accounts.unshift(currentUserAcc)

        // Limit to 5
        if (accounts.length > 5) accounts = accounts.slice(0, 5)

        setSavedAccounts(accounts)
        localStorage.setItem('restaurant_saved_accounts_v2', JSON.stringify(accounts))
    }, [user])

    const handleSwitchAccount = async (account: SavedAccount) => {
        // Determine redirect path based on role
        let redirectPath = `/${slug}`
        switch (account.role) {
            case 'admin':
                redirectPath += '/admin/dashboard'
                break
            case 'mesero':
                redirectPath += '/waiter'
                break
            case 'cocinero':
                redirectPath += '/cook'
                break
            case 'cajero':
            case 'facturero':
                redirectPath += '/cashier'
                break
            default:
                // If we don't know the role, go to the root of the org or a safe fallback
                redirectPath += '/admin/dashboard'
        }

        if (account.switchToken) {
            // Seamless switch
            await signIn('credentials', {
                username: account.username,
                switchToken: account.switchToken,
                redirect: true,
                callbackUrl: redirectPath
            })
        } else {
            // Fallback to manual login
            signOut({ callbackUrl: `/login?username=${encodeURIComponent(account.username)}` })
        }
    }

    const handleRemoveAccount = (e: React.MouseEvent, accountUsername: string) => {
        e.stopPropagation()
        const newAccounts = savedAccounts.filter(a => a.username !== accountUsername)
        setSavedAccounts(newAccounts)
        localStorage.setItem('restaurant_saved_accounts_v2', JSON.stringify(newAccounts))
    }

    const roleColors: Record<string, string> = {
        mesero: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        cocinero: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        facturero: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        cajero: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        admin: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    }

    const roleName = user.role || 'Usuario'

    const toggleLanguage = () => {
        setLanguage(language === 'es' ? 'en' : 'es')
        setIsUserMenuOpen(false) // Close menu after selection
    }

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (isUserMenuOpen && !target.closest('.user-menu-container')) {
                setIsUserMenuOpen(false)
                setTimeout(() => setMenuView('main'), 200) // Reset view after animation
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isUserMenuOpen])

    return (
        <nav className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 flex items-center shadow-sm">
            <div className="max-w-[1600px] w-full mx-auto px-4 flex justify-between items-center">
                {/* Left Side: Brand & Status */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-500">
                            <UtensilsCrossed size={18} />
                        </div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight hidden sm:block">
                            Restaurante
                        </h1>
                    </div>

                    <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${isConnected
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                            }`}
                    >
                        {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                        <span className="hidden sm:inline">{isConnected ? t('nav.online') : t('nav.offline')}</span>
                    </div>
                </div>

                {/* Right Side: Role & User Menu */}
                <div className="flex items-center gap-3">
                    {/* Role Badge */}
                    <span
                        className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide hidden md:block ${roleColors[roleName] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                    >
                        {t('role.' + roleName) || roleName}
                    </span>

                    {/* User Menu */}
                    <div className="relative user-menu-container">
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm">
                                {user.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">
                                {user.name || 'Usuario'}
                            </span>
                            <ChevronDown
                                size={16}
                                className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {isUserMenuOpen && (
                            <div
                                className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right"
                            >
                                {menuView === 'main' ? (
                                    <>
                                        {/* Header */}
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50">
                                            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg">
                                                {user.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">{user.name}</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</span>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

                                        {user.role === 'admin' && (
                                            <>
                                                <div className="p-2 pb-0">
                                                    <Link
                                                        href={`/${slug}/settings`}
                                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                                                        onClick={() => setIsUserMenuOpen(false)}
                                                    >
                                                        <Settings size={16} />
                                                        <span>{t('nav.settings')}</span>
                                                    </Link>
                                                </div>
                                            </>
                                        )}

                                        {/* Switch Account Trigger */}
                                        <div className="p-2 pb-0">
                                            <button
                                                onClick={() => setMenuView('accounts')}
                                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Users size={16} />
                                                    <span>{t('nav.switch_accounts') || 'Cambiar cuenta'}</span>
                                                </div>
                                                <ChevronRight size={16} className="text-slate-400" />
                                            </button>
                                        </div>

                                        <div className="my-2 h-px bg-slate-200 dark:bg-slate-700"></div>

                                        {/* Theme Section */}
                                        <div className="p-3">
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                {t('nav.theme')}
                                            </label>
                                            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg">
                                                <button
                                                    onClick={() => setTheme('light')}
                                                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${theme === 'light'
                                                        ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                                        }`}
                                                >
                                                    <Sun size={14} />
                                                    <span>{t('nav.light')}</span>
                                                </button>
                                                <button
                                                    onClick={() => setTheme('dark')}
                                                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${theme === 'dark'
                                                        ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                                        }`}
                                                >
                                                    <Moon size={14} />
                                                    <span>{t('nav.dark')}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Language Section */}
                                        <div className="p-3 pt-0">
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                {t('nav.language')}
                                            </label>
                                            <div className="flex flex-col gap-0.5">
                                                <button
                                                    onClick={() => {
                                                        setLanguage('es')
                                                        setIsUserMenuOpen(false)
                                                    }}
                                                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${language === 'es'
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                                        }`}
                                                >
                                                    <span className="text-lg">🇪🇸</span>
                                                    <span className="flex-1 text-left">Español</span>
                                                    {language === 'es' && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setLanguage('en')
                                                        setIsUserMenuOpen(false)
                                                    }}
                                                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${language === 'en'
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                                        }`}
                                                >
                                                    <span className="text-lg">🇺🇸</span>
                                                    <span className="flex-1 text-left">English</span>
                                                    {language === 'en' && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

                                        {/* Logout */}
                                        <div className="p-2">
                                            <button
                                                onClick={() => signOut({ callbackUrl: '/login' })}
                                                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <LogOut size={16} />
                                                <span>{t('nav.logout')}</span>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Accounts Header */}
                                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50">
                                            <button
                                                onClick={() => setMenuView('main')}
                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                                            >
                                                <ArrowLeft size={16} />
                                            </button>
                                            <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                                {t('nav.accounts') || 'Cuentas'}
                                            </span>
                                        </div>
                                        <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

                                        {/* Accounts List */}
                                        <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                                            {savedAccounts.map((account, idx) => {
                                                const isActive = account.username === (user.username || user.email || user.name || 'user')
                                                return isActive ? (
                                                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50">
                                                        <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                                            {account.avatar}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{account.name}</p>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                                                <p className="text-[10px] text-green-600 dark:text-green-400 uppercase font-medium">{t('status.active') || 'Activo'}</p>
                                                            </div>
                                                        </div>
                                                        <Check size={16} className="text-orange-600 dark:text-orange-400" />
                                                    </div>
                                                ) : (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleSwitchAccount(account)}
                                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center font-bold text-xs uppercase group-hover:bg-slate-300 dark:group-hover:bg-slate-600 transition-colors">
                                                            {account.avatar}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{account.name}</p>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{t('role.' + account.role) || account.role}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <div
                                                                role="button"
                                                                onClick={(e) => handleRemoveAccount(e, account.username)}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                                title={t('nav.remove_account')}
                                                            >
                                                                <Trash2 size={14} />
                                                            </div>
                                                            <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        <div className="h-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

                                        {/* Add Account Button */}
                                        <div className="p-2 pt-1">
                                            <button
                                                onClick={() => signOut({ callbackUrl: '/login?action=add_account' })}
                                                className="w-full flex items-center gap-2 p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hover:text-slate-900 dark:hover:text-white"
                                            >
                                                <div className="w-8 h-8 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                                                    <Plus size={14} />
                                                </div>
                                                <span className="text-sm font-medium">{t('nav.add_account') || 'Agregar cuenta'}</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
