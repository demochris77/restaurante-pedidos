'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/components/providers/language-provider'
import {
    Settings as SettingsIcon,
    Layers,
    CreditCard,
    Plus,
    Edit,
    Trash2,
    CheckCircle2,
    XCircle,
    Smartphone,
    Banknote,
    Loader2,
    Wrench,
    Database,
    Building,
    Save
} from 'lucide-react'
import CategoryModal from '@/components/admin/category-modal'
import PaymentMethodModal from '@/components/admin/payment-method-modal'
import ConfirmationModal from '@/components/ui/confirmation-modal'

interface Category {
    id: number
    name: string
    displayOrder: number
    active: boolean
    _count?: { menuItems: number }
}

interface PaymentMethod {
    id: number
    name: string
    label: string
    active: boolean
    isDigital: boolean
}

interface Organization {
    id: string
    name: string
    tipPercentage: number
    securityCode?: string
    securityEnabled?: boolean
    securityMode?: 'static' | 'dynamic'
}

export default function AdminSettingsPage() {
    const { t } = useLanguage()
    const [activeTab, setActiveTab] = useState<'categories' | 'payment' | 'maintenance' | 'organization'>('categories')
    const [loading, setLoading] = useState(true)

    const [categories, setCategories] = useState<Category[]>([])
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [organization, setOrganization] = useState<Organization | null>(null)

    const [categoryModalOpen, setCategoryModalOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined)

    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | undefined>(undefined)

    // Confirmation state (shared)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [deleteType, setDeleteType] = useState<'category' | 'payment' | 'cleanup' | null>(null)
    const [deleteId, setDeleteId] = useState<number | string | null>(null)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [catsRes, payRes, orgRes] = await Promise.all([
                fetch('/api/admin/menu/categories'),
                fetch('/api/admin/settings/payment-methods'),
                fetch('/api/organization')
            ])

            if (catsRes.ok) setCategories(await catsRes.json())
            if (payRes.ok) setPaymentMethods(await payRes.json())
            if (orgRes.ok) setOrganization(await orgRes.json())
        } catch (error) {
            console.error('Error loading settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleEditCategory = (cat: Category) => {
        setSelectedCategory(cat)
        setCategoryModalOpen(true)
    }

    const handleDeleteCategoryClick = (id: number) => {
        setDeleteId(id)
        setDeleteType('category')
        setConfirmOpen(true)
    }

    const handleDeletePaymentClick = (id: number) => {
        setDeleteId(id)
        setDeleteType('payment')
        setConfirmOpen(true)
    }

    const handleEditPayment = (method: PaymentMethod) => {
        setSelectedMethod(method)
        setPaymentModalOpen(true)
    }

    const confirmDelete = async () => {
        if (deleteType === 'cleanup') {
            try {
                const res = await fetch('/api/orders?cleanup=true', { method: 'DELETE' })
                if (res.ok) {
                    const data = await res.json()
                    alert(t('admin.settings.cleanup_success') + ` (${data.count} orders deleted)`)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setConfirmOpen(false)
                setDeleteType(null)
            }
            return
        }

        if (!deleteId || !deleteType) return

        try {
            const url = deleteType === 'category'
                ? `/api/admin/menu/categories/${deleteId}`
                : `/api/admin/settings/payment-methods/${deleteId}`

            const res = await fetch(url, { method: 'DELETE' })
            if (res.ok) {
                fetchData()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setConfirmOpen(false)
            setDeleteId(null)
            setDeleteType(null)
        }
    }

    const handleCleanupClick = () => {
        setDeleteType('cleanup')
        setConfirmOpen(true)
    }

    const handleUpdateOrganization = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!organization || saveStatus === 'saving') return

        setSaveStatus('saving')
        try {
            const res = await fetch('/api/organization', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: organization.name,
                    tipPercentage: organization.tipPercentage,
                    securityCode: organization.securityCode,
                    securityEnabled: organization.securityEnabled,
                    securityMode: organization.securityMode || 'static'
                })
            })

            if (res.ok) {
                const data = await res.json()
                setOrganization(data)
                setSaveStatus('success')
                setTimeout(() => setSaveStatus('idle'), 3000)
            } else {
                setSaveStatus('error')
                setTimeout(() => setSaveStatus('idle'), 3000)
            }
        } catch (err) {
            console.error(err)
            setSaveStatus('error')
            setTimeout(() => setSaveStatus('idle'), 3000)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <SettingsIcon className="text-orange-600 dark:text-orange-400" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {t('admin.settings')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('admin.settings.subtitle')}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'categories'
                        ? 'border-orange-600 text-orange-600 dark:text-orange-500'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    <Layers size={18} />
                    <span className="hidden sm:inline">{t('admin.categories')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('organization')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'organization'
                        ? 'border-orange-600 text-orange-600 dark:text-orange-500'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    <Building size={18} />
                    <span className="hidden sm:inline">{t('admin.settings.organization.title') || 'Organization'}</span>
                </button>
                <button
                    onClick={() => setActiveTab('payment')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'payment'
                        ? 'border-orange-600 text-orange-600 dark:text-orange-500'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    <CreditCard size={18} />
                    <span className="hidden sm:inline">{t('admin.payment')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('maintenance')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'maintenance'
                        ? 'border-orange-600 text-orange-600 dark:text-orange-500'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    <Wrench size={18} />
                    <span className="hidden sm:inline">{t('admin.settings.maintenance')}</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-orange-600" size={32} />
                </div>
            ) : activeTab === 'categories' ? (
                // Categories Section
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                setSelectedCategory(undefined)
                                setCategoryModalOpen(true)
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                        >
                            <Plus size={18} />
                            {t('admin.categories.add')}
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('admin.categories.order')}</th>
                                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('admin.categories.name')}</th>
                                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('admin.categories.status')}</th>
                                        <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('admin.categories.items')}</th>
                                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('admin.dashboard.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {categories.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-sm text-slate-500">{cat.displayOrder}</td>
                                            <td className="px-3 sm:px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{cat.name}</td>
                                            <td className="px-3 sm:px-6 py-4">
                                                {cat.active ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                                        <CheckCircle2 size={12} /> {t('admin.categories.active')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                                        <XCircle size={12} /> {t('admin.categories.inactive')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="hidden lg:table-cell px-3 sm:px-6 py-4 text-sm text-slate-500">{cat._count?.menuItems || 0} items</td>
                                            <td className="px-3 sm:px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditCategory(cat)}
                                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategoryClick(cat.id)}
                                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'organization' && organization ? (
                // Organization Section
                <div className="space-y-6 max-w-2xl">
                    <form onSubmit={handleUpdateOrganization} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                                {t('admin.settings.organization.general') || 'General Settings'}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        {t('admin.settings.organization.name') || 'Restaurant Name'}
                                    </label>
                                    <input
                                        type="text"
                                        value={organization.name || ''}
                                        onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        {t('admin.settings.organization.tip_percentage') || 'Default Tip Percentage'} (%)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={organization.tipPercentage ?? 10}
                                            onChange={(e) => setOrganization({ ...organization, tipPercentage: parseInt(e.target.value) || 0 })}
                                            className="w-24 px-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                                        />
                                        <span className="text-slate-500 text-sm">%</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {t('admin.settings.organization.tip_help') || 'This percentage will be suggested to customers when paying.'}
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Seguridad de Pedidos</h4>
                                            <p className="text-xs text-slate-500">Requerir código para segundos pedidos del mismo dispositivo</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setOrganization({ ...organization, securityEnabled: !organization.securityEnabled })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${organization.securityEnabled ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${organization.securityEnabled ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {organization.securityEnabled && (
                                        <div className="animate-in slide-in-from-top-2 duration-200 space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    Modo de Seguridad
                                                </label>
                                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOrganization({ ...organization, securityMode: 'static' })}
                                                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${organization.securityMode === 'static' || !organization.securityMode
                                                            ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm'
                                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                                            }`}
                                                    >
                                                        PIN Fijo
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOrganization({ ...organization, securityMode: 'dynamic' })}
                                                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${organization.securityMode === 'dynamic'
                                                            ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm'
                                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                                            }`}
                                                    >
                                                        Código Rotativo
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                    {organization.securityMode === 'dynamic' ? 'Secreto de Seguridad (Master)' : 'Código de activación (PIN)'}
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={organization.securityCode || ''}
                                                        onChange={(e) => setOrganization({ ...organization, securityCode: e.target.value })}
                                                        placeholder={organization.securityMode === 'dynamic' ? 'Secreto aleatorio...' : 'Ej: 1234'}
                                                        className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white font-mono"
                                                    />
                                                    {organization.securityMode === 'dynamic' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrganization({ ...organization, securityCode: Math.random().toString(36).substring(2, 12).toUpperCase() })}
                                                            className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-300 transition-colors"
                                                            title="Generar nuevo secreto"
                                                        >
                                                            <Database size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    {organization.securityMode === 'dynamic'
                                                        ? 'El código que el cliente debe ingresar cambiará automáticamente cada minuto basándose en este secreto.'
                                                        : 'Este código PIN fijo se pedirá si un cliente intenta hacer un pedido.'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                            {saveStatus === 'success' && (
                                <span className="text-sm font-bold text-green-600 flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                                    <CheckCircle2 size={16} />
                                    {t('common.saved') || 'Guardado exitosamente'}
                                </span>
                            )}
                            {saveStatus === 'error' && (
                                <span className="text-sm font-bold text-red-600 flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                                    <XCircle size={16} />
                                    {t('common.error') || 'Error al guardar'}
                                </span>
                            )}
                            <button
                                type="submit"
                                disabled={saveStatus === 'saving'}
                                className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white font-medium rounded-lg transition-all shadow-sm"
                            >
                                {saveStatus === 'saving' ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <Save size={18} />
                                )}
                                {t('common.save') || 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : activeTab === 'payment' ? (
                // Payment Methods Section
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                setSelectedMethod(undefined)
                                setPaymentModalOpen(true)
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                        >
                            <Plus size={18} />
                            {t('admin.payment.add')}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paymentMethods.map((method) => (
                            <div key={method.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${method.isDigital ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-green-100 dark:bg-green-900/30 text-green-600'}`}>
                                        {method.isDigital ? <Smartphone size={24} /> : <Banknote size={24} />}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditPayment(method)}
                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePaymentClick(method.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                                    {method.label}
                                </h3>
                                <p className="text-sm font-mono text-slate-400 mb-4">{method.name}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${method.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                        {method.active ? t('admin.payment.active') : t('admin.payment.inactive')}
                                    </span>
                                    <span className="text-sm text-slate-500">
                                        {method.isDigital ? t('admin.payment.digital') : t('admin.payment.physical')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // Maintenance Section
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                                <Database size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                                    {t('admin.settings.cleanup_cancelled')}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {t('admin.settings.cleanup_description')}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                            <button
                                onClick={handleCleanupClick}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-600/20"
                            >
                                {t('admin.settings.cleanup_cancelled')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CategoryModal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                onSuccess={fetchData}
                category={selectedCategory}
            />

            <PaymentMethodModal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onSuccess={fetchData}
                method={selectedMethod}
            />

            <ConfirmationModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={confirmDelete}
                title={deleteType === 'cleanup' ? t('admin.settings.cleanup_cancelled') : t('modal.delete')}
                message={deleteType === 'cleanup' ? t('admin.settings.cleanup_confirm') : t('modal.confirm')}
                confirmText={deleteType === 'cleanup' ? t('admin.settings.cleanup_cancelled') : t('modal.delete')}
                isDestructive={true}
            />
        </div>
    )
}
